import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { UpdateProfileDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async getProfile(userId: string) {
    const user = await this.db.queryOne(
      `SELECT u.id, a.email, a.status, a.email_verified_at,
              u.first_name, u.last_name, u.phone, u.avatar_storage_path, u.created_at, u.updated_at
       FROM public.users u
       JOIN identity.user_accounts a ON a.id = u.id
       WHERE u.id = $1`,
      [userId],
    );

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
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

  async updateProfile(userId: string, dto: UpdateProfileDto, ipAddress?: string) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.firstName !== undefined) {
      fields.push(`first_name = $${idx++}`);
      values.push(dto.firstName.trim());
    }
    if (dto.lastName !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(dto.lastName.trim());
    }
    if (dto.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(dto.phone.trim());
    }
    if (dto.avatarStoragePath !== undefined) {
      fields.push(`avatar_storage_path = $${idx++}`);
      values.push(dto.avatarStoragePath.trim());
    }

    if (fields.length === 0) {
      return this.getProfile(userId);
    }

    values.push(userId);
    const sql = `UPDATE public.users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

    const updated = await this.db.queryOne(sql, values, { userId, ipAddress });
    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.getProfile(userId);
  }
}
