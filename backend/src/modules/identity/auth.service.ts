import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Hashes plain text password using Argon2id
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verifies plain text password against stored Argon2id hash
   */
  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * Generates a secure random refresh token and returns both token and its SHA256 hash
   */
  private generateRefreshToken() {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  }

  /**
   * Register a new user account with business profile
   */
  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existing = await this.db.queryOne(
      'SELECT id FROM identity.user_accounts WHERE email = $1',
      [dto.email.toLowerCase().trim()],
    );
    if (existing) {
      throw new ConflictException('El correo electrónico ya se encuentra registrado');
    }

    const passwordHash = await this.hashPassword(dto.password);

    return this.db.transaction(async (client) => {
      // 1. Create identity account
      const accountRes = await client.query(
        `INSERT INTO identity.user_accounts (email, status)
         VALUES ($1, 'active')
         RETURNING id, email, status, created_at`,
        [dto.email.toLowerCase().trim()],
      );
      const userId = accountRes.rows[0].id;

      // 2. Create credentials
      await client.query(
        `INSERT INTO identity.user_credentials (user_id, password_hash)
         VALUES ($1, $2)`,
        [userId, passwordHash],
      );

      // 3. Create business profile
      await client.query(
        `INSERT INTO public.users (id, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4)`,
        [userId, dto.firstName.trim(), dto.lastName.trim(), dto.phone?.trim() || null],
      );

      // 4. Assign default 'customer' role
      const roleRes = await client.query(`SELECT id FROM public.roles WHERE code = 'customer'`);
      if (roleRes.rows[0]) {
        await client.query(
          `INSERT INTO public.user_roles (user_id, role_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, roleRes.rows[0].id],
        );
      }

      // 5. Initialize notification preferences
      await client.query(
        `INSERT INTO public.notification_preferences (user_id)
         VALUES ($1) ON CONFLICT DO NOTHING`,
        [userId],
      );

      // 6. Generate tokens & session
      const roles = ['customer'];
      const payload = { sub: userId, email: dto.email.toLowerCase().trim(), roles };
      const accessToken = this.jwtService.sign(payload);

      const { rawToken, tokenHash } = this.generateRefreshToken();
      const refreshDays = this.configService.get<number>('JWT_REFRESH_EXPIRATION_DAYS', 7);
      const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO identity.sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, tokenHash, ipAddress || null, userAgent || null, expiresAt],
      );

      return {
        user: {
          id: userId,
          email: dto.email.toLowerCase().trim(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          roles,
        },
        tokens: {
          accessToken,
          refreshToken: rawToken,
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
        },
      };
    }, { ipAddress });
  }

  /**
   * User login with brute force protection and session creation
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.toLowerCase().trim();

    const account = await this.db.queryOne<{
      id: string;
      email: string;
      status: string;
      password_hash: string;
      failed_attempts: number;
      locked_until: Date | null;
      first_name: string;
      last_name: string;
    }>(
      `SELECT a.id, a.email, a.status, c.password_hash, c.failed_attempts, c.locked_until,
              u.first_name, u.last_name
       FROM identity.user_accounts a
       JOIN identity.user_credentials c ON c.user_id = a.id
       JOIN public.users u ON u.id = a.id
       WHERE a.email = $1`,
      [email],
    );

    if (!account) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (account.status !== 'active') {
      throw new UnauthorizedException('La cuenta está inactiva o suspendida');
    }

    // Check account lockout
    if (account.locked_until && new Date(account.locked_until) > new Date()) {
      throw new UnauthorizedException('Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intente más tarde.');
    }

    const isValid = await this.verifyPassword(account.password_hash, dto.password);
    if (!isValid) {
      const failedAttempts = account.failed_attempts + 1;
      let lockDate: Date | null = null;
      if (failedAttempts >= 5) {
        lockDate = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }
      await this.db.query(
        `UPDATE identity.user_credentials 
         SET failed_attempts = $1, locked_until = $2, updated_at = now()
         WHERE user_id = $3`,
        [failedAttempts, lockDate, account.id],
      );
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Reset failed attempts & record last_login_at
    await this.db.query(
      `UPDATE identity.user_credentials SET failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE user_id = $1`,
      [account.id],
    );
    await this.db.query(
      `UPDATE identity.user_accounts SET last_login_at = now(), updated_at = now() WHERE id = $1`,
      [account.id],
    );

    // Get user roles
    const rolesRes = await this.db.query<{ code: string }>(
      `SELECT r.code FROM public.roles r
       JOIN public.user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [account.id],
    );
    const roles = rolesRes.rows.map((r) => r.code);
    if (roles.length === 0) roles.push('customer');

    // Issue tokens
    const payload = { sub: account.id, email: account.email, roles };
    const accessToken = this.jwtService.sign(payload);

    const { rawToken, tokenHash } = this.generateRefreshToken();
    const refreshDays = this.configService.get<number>('JWT_REFRESH_EXPIRATION_DAYS', 7);
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.db.query(
      `INSERT INTO identity.sessions (user_id, refresh_token_hash, ip_address, user_agent, device_name, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [account.id, tokenHash, ipAddress || null, userAgent || null, dto.deviceName || null, expiresAt],
    );

    return {
      user: {
        id: account.id,
        email: account.email,
        firstName: account.first_name,
        lastName: account.last_name,
        roles,
      },
      tokens: {
        accessToken,
        refreshToken: rawToken,
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
      },
    };
  }

  /**
   * Refresh session with token rotation
   */
  async refreshSession(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');

    const session = await this.db.queryOne<{
      id: string;
      user_id: string;
      expires_at: Date;
      revoked_at: Date | null;
      email: string;
      status: string;
      first_name: string;
      last_name: string;
    }>(
      `SELECT s.id, s.user_id, s.expires_at, s.revoked_at, a.email, a.status, u.first_name, u.last_name
       FROM identity.sessions s
       JOIN identity.user_accounts a ON a.id = s.user_id
       JOIN public.users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1`,
      [tokenHash],
    );

    if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
      throw new UnauthorizedException('Sesión inválida o expirada. Inicie sesión nuevamente.');
    }

    if (session.status !== 'active') {
      throw new UnauthorizedException('Cuenta no disponible');
    }

    // Revoke old session (Rotation)
    await this.db.query(`UPDATE identity.sessions SET revoked_at = now() WHERE id = $1`, [session.id]);

    // Issue new refresh session
    const rolesRes = await this.db.query<{ code: string }>(
      `SELECT r.code FROM public.roles r
       JOIN public.user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [session.user_id],
    );
    const roles = rolesRes.rows.map((r) => r.code);
    if (roles.length === 0) roles.push('customer');

    const payload = { sub: session.user_id, email: session.email, roles };
    const accessToken = this.jwtService.sign(payload);

    const { rawToken, tokenHash: newHash } = this.generateRefreshToken();
    const refreshDays = this.configService.get<number>('JWT_REFRESH_EXPIRATION_DAYS', 7);
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.db.query(
      `INSERT INTO identity.sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [session.user_id, newHash, ipAddress || null, userAgent || null, expiresAt],
    );

    return {
      accessToken,
      refreshToken: rawToken,
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    };
  }

  /**
   * Logout user by revoking active session
   */
  async logout(refreshToken: string) {
    if (!refreshToken) return { loggedOut: true };
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.db.query(`UPDATE identity.sessions SET revoked_at = now() WHERE refresh_token_hash = $1`, [tokenHash]);
    return { loggedOut: true };
  }

  /**
   * Get user profile details
   */
  async getMe(userId: string) {
    const user = await this.db.queryOne(
      `SELECT u.id, a.email, a.status, a.email_verified_at, a.last_login_at,
              u.first_name, u.last_name, u.phone, u.avatar_storage_path, u.created_at
       FROM public.users u
       JOIN identity.user_accounts a ON a.id = u.id
       WHERE u.id = $1`,
      [userId],
    );

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const rolesRes = await this.db.query<{ code: string }>(
      `SELECT r.code FROM public.roles r
       JOIN public.user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId],
    );

    return {
      ...user,
      roles: rolesRes.rows.map((r) => r.code),
    };
  }
}
