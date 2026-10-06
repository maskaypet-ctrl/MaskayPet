import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../../database/database.service';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'default-secret-key-must-change'),
    });
  }

  async validate(payload: JwtPayload) {
    // Check if user is still active in database
    const user = await this.db.queryOne<{
      id: string;
      email: string;
      status: string;
      first_name: string;
      last_name: string;
    }>(
      `SELECT u.id, a.email, a.status, u.first_name, u.last_name
       FROM identity.user_accounts a
       JOIN public.users u ON u.id = a.id
       WHERE a.id = $1`,
      [payload.sub],
    );

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Usuario inactivo o no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: payload.roles || ['customer'],
    };
  }
}
