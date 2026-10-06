import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RegisterDeviceTokenDto, UpdateNotificationPreferencesDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async getMyNotifications(userId: string) {
    const res = await this.db.query(
      `SELECT n.*, p.name as pet_name
       FROM public.notifications n
       LEFT JOIN public.pets p ON p.id = n.pet_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId],
    );
    return res.rows;
  }

  async markAsRead(notificationId: string, userId: string) {
    const res = await this.db.query(
      `UPDATE public.notifications 
       SET status = 'read', read_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId],
    );
    if (!res.rows[0]) throw new NotFoundException('Notificación no encontrada');
    return res.rows[0];
  }

  async markAllAsRead(userId: string) {
    await this.db.query(
      `UPDATE public.notifications 
       SET status = 'read', read_at = now()
       WHERE user_id = $1 AND status != 'read'`,
      [userId],
    );
    return { success: true };
  }

  async getPreferences(userId: string) {
    const res = await this.db.queryOne(
      `SELECT * FROM public.notification_preferences WHERE user_id = $1`,
      [userId],
    );
    if (!res) {
      return this.db.queryOne(
        `INSERT INTO public.notification_preferences (user_id) VALUES ($1) RETURNING *`,
        [userId],
      );
    }
    return res;
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const push = dto.pushEnabled ?? dto.push_enabled;
    const email = dto.emailEnabled ?? dto.email_enabled;
    const sms = dto.smsEnabled ?? dto.sms_enabled;
    const lostPet = dto.lostPetAlerts ?? dto.lost_pet_alerts;
    const vaccine = dto.vaccineReminders ?? dto.vaccine_reminders;
    const treatment = dto.treatmentReminders ?? dto.treatment_reminders;
    const appointment = dto.appointmentReminders ?? dto.appointment_reminders;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (push !== undefined) { fields.push(`push_enabled = $${idx++}`); values.push(push); }
    if (email !== undefined) { fields.push(`email_enabled = $${idx++}`); values.push(email); }
    if (sms !== undefined) { fields.push(`sms_enabled = $${idx++}`); values.push(sms); }
    if (lostPet !== undefined) { fields.push(`lost_pet_alerts = $${idx++}`); values.push(lostPet); }
    if (vaccine !== undefined) { fields.push(`vaccine_reminders = $${idx++}`); values.push(vaccine); }
    if (treatment !== undefined) { fields.push(`treatment_reminders = $${idx++}`); values.push(treatment); }
    if (appointment !== undefined) { fields.push(`appointment_reminders = $${idx++}`); values.push(appointment); }

    if (fields.length === 0) return this.getPreferences(userId);

    values.push(userId);
    const sql = `UPDATE public.notification_preferences SET ${fields.join(', ')} WHERE user_id = $${idx} RETURNING *`;
    return this.db.queryOne(sql, values);
  }

  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto) {
    return this.db.queryOne(
      `INSERT INTO public.device_tokens (user_id, token, platform, is_active, last_seen_at)
       VALUES ($1, $2, $3, true, now())
       ON CONFLICT (token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       is_active = true,
       last_seen_at = now()
       RETURNING *`,
      [userId, dto.token.trim(), dto.platform],
    );
  }

  async getUpcomingReminders(userId: string) {
    const res = await this.db.query(
      `SELECT r.*, p.name as pet_name
       FROM public.reminders r
       JOIN public.pets p ON p.id = r.pet_id
       WHERE r.user_id = $1 AND r.status = 'pending' AND r.due_at >= now() - INTERVAL '1 day'
       ORDER BY r.due_at ASC
       LIMIT 30`,
      [userId],
    );
    return res.rows;
  }
}
