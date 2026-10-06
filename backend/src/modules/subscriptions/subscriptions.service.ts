import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { SubscribeDto } from './dto/subscription.dto';
import { GenerateVouchersDto, RedeemVoucherDto } from './dto/voucher.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly db: DatabaseService) {}

  async getPlans() {
    const res = await this.db.query(
      `SELECT t.tier, l.max_pets, l.max_collaborators_per_pet, l.sms_credits_monthly, l.medical_document_retention_years
       FROM public.catalog_tiers t
       JOIN public.plan_limits l ON l.tier = t.tier
       ORDER BY (t.tier = 'free') DESC`,
    );
    return res.rows;
  }

  async getMySubscription(userId: string) {
    const sub = await this.db.queryOne(
      `SELECT s.*, l.max_pets, l.max_collaborators_per_pet, l.sms_credits_monthly, l.medical_document_retention_years
       FROM public.subscriptions s
       JOIN public.plan_limits l ON l.tier = s.tier
       WHERE s.user_id = $1 AND s.status IN ('trialing','active','past_due')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId],
    );

    if (!sub) {
      // Default Free limits
      const freeLimits = await this.db.queryOne(
        `SELECT max_pets, max_collaborators_per_pet, sms_credits_monthly, medical_document_retention_years
         FROM public.plan_limits WHERE tier = 'free'`,
      );
      return {
        tier: 'free',
        status: 'active',
        started_at: null,
        auto_renew: false,
        ...freeLimits,
      };
    }

    return sub;
  }

  async subscribe(userId: string, dto: SubscribeDto, ipAddress?: string) {
    return this.db.transaction(async (client) => {
      // Cancel previous active subscription if exists
      await client.query(
        `UPDATE public.subscriptions 
         SET status = 'canceled', canceled_at = now()
         WHERE user_id = $1 AND status IN ('trialing','active','past_due')`,
        [userId],
      );

      // Create new subscription
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const subRes = await client.query(
        `INSERT INTO public.subscriptions (
           user_id, tier, status, current_period_start, current_period_end, provider, provider_subscription_id
         ) VALUES ($1, $2, 'active', now(), $3, $4, $5)
         RETURNING *`,
        [userId, dto.tier, periodEnd, dto.provider || 'manual', dto.providerPaymentToken || null],
      );
      const sub = subRes.rows[0];

      // If premium, create payment record
      if (dto.tier === 'premium') {
        await client.query(
          `INSERT INTO public.payments (user_id, subscription_id, amount, currency, status, provider, paid_at)
           VALUES ($1, $2, 19.90, 'PEN', 'approved', $3, now())`,
          [userId, sub.id, dto.provider || 'manual'],
        );
      }

      return sub;
    }, { userId, ipAddress });
  }

  /**
   * ADMIN: Generate single-use subscription activation codes (Vouchers)
   */
  async generateVouchers(adminUserId: string, dto: GenerateVouchersDto, ipAddress?: string) {
    const quantity = dto.quantity && dto.quantity > 0 ? Math.min(dto.quantity, 100) : 1;
    const tier = dto.tier || 'premium';

    // Calculate duration in days
    let durationDays = dto.durationDays;
    if (!durationDays && dto.months) {
      durationDays = dto.months * 30;
    }
    if (!durationDays || durationDays <= 0) {
      durationDays = 30; // Default: 30 days (1 month)
    }

    // Determine label for code tag
    let durationLabel = `${durationDays}D`;
    if (durationDays === 30 || durationDays === 31) durationLabel = '1M';
    else if (durationDays === 90 || durationDays === 91) durationLabel = '3M';
    else if (durationDays === 180 || durationDays === 182) durationLabel = '6M';
    else if (durationDays === 365 || durationDays === 366) durationLabel = '1Y';

    const prefix = (dto.codePrefix || 'ACT').trim().toUpperCase();
    const tierLabel = tier.substring(0, 4).toUpperCase();

    return this.db.transaction(async (client) => {
      const generatedCodes: any[] = [];

      for (let i = 0; i < quantity; i++) {
        const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
        const code = `${prefix}-${tierLabel}-${durationLabel}-${randomHex}`;

        const res = await client.query(
          `INSERT INTO public.subscription_vouchers (
             code, tier, duration_days, status, created_by, expires_at, notes
           ) VALUES ($1, $2, $3, 'available', $4, $5, $6)
           RETURNING *`,
          [
            code,
            tier,
            durationDays,
            adminUserId,
            dto.expiresAt || null,
            dto.notes?.trim() || null,
          ],
        );
        generatedCodes.push(res.rows[0]);
      }

      return {
        generatedCount: generatedCodes.length,
        tier,
        durationDays,
        vouchers: generatedCodes,
      };
    }, { userId: adminUserId, ipAddress });
  }

  /**
   * ADMIN: List generated vouchers with optional status filter
   */
  async listVouchers(status?: string, limit: number = 50) {
    let sql = `
      SELECT v.*,
             u1.first_name as created_by_name,
             u2.first_name as redeemed_by_name,
             u2.phone as redeemed_by_phone
      FROM public.subscription_vouchers v
      LEFT JOIN public.users u1 ON u1.id = v.created_by
      LEFT JOIN public.users u2 ON u2.id = v.redeemed_by
    `;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE v.status = $1`;
      params.push(status);
    }

    sql += ` ORDER BY v.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  /**
   * USER: Redeem single-use activation code to activate or extend subscription
   */
  async redeemVoucher(userId: string, dto: RedeemVoucherDto, ipAddress?: string) {
    const code = dto.code.trim().toUpperCase();

    const voucher = await this.db.queryOne<{
      id: string;
      code: string;
      tier: string;
      duration_days: number;
      status: string;
      expires_at: Date | null;
    }>(
      `SELECT * FROM public.subscription_vouchers WHERE code = $1`,
      [code],
    );

    if (!voucher) {
      throw new NotFoundException('El código de activación ingresado no existe o no es válido.');
    }

    if (voucher.status === 'redeemed') {
      throw new ConflictException('Este código de activación ya fue canjeado previamente.');
    }

    if (voucher.status !== 'available') {
      throw new BadRequestException(`El código no se encuentra disponible (estado: ${voucher.status}).`);
    }

    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      throw new BadRequestException('Este código de activación ha expirado.');
    }

    return this.db.transaction(async (client) => {
      // 1. Check if user already has an active subscription of same or higher tier
      const activeSub = await client.query(
        `SELECT id, tier, current_period_end, status
         FROM public.subscriptions
         WHERE user_id = $1 AND status IN ('trialing','active')
         ORDER BY current_period_end DESC
         LIMIT 1`,
        [userId],
      );

      let newPeriodEnd: Date;
      let subscriptionId: string;
      const durationMs = voucher.duration_days * 24 * 60 * 60 * 1000;

      if (activeSub.rows[0] && activeSub.rows[0].tier === voucher.tier) {
        // Extend existing subscription duration
        const currentEnd = new Date(activeSub.rows[0].current_period_end);
        const baseDate = currentEnd > new Date() ? currentEnd : new Date();
        newPeriodEnd = new Date(baseDate.getTime() + durationMs);

        const updatedSub = await client.query(
          `UPDATE public.subscriptions
           SET current_period_end = $1, status = 'active', updated_at = now()
           WHERE id = $2
           RETURNING *`,
          [newPeriodEnd, activeSub.rows[0].id],
        );
        subscriptionId = updatedSub.rows[0].id;
      } else {
        // Cancel any previous inactive/other tier subscription
        await client.query(
          `UPDATE public.subscriptions
           SET status = 'canceled', canceled_at = now()
           WHERE user_id = $1 AND status IN ('trialing','active','past_due')`,
          [userId],
        );

        // Create new active subscription
        newPeriodEnd = new Date(Date.now() + durationMs);
        const newSub = await client.query(
          `INSERT INTO public.subscriptions (
             user_id, tier, status, current_period_start, current_period_end, provider, provider_subscription_id
           ) VALUES ($1, $2, 'active', now(), $3, 'voucher', $4)
           RETURNING *`,
          [userId, voucher.tier, newPeriodEnd, voucher.code],
        );
        subscriptionId = newSub.rows[0].id;
      }

      // 2. Mark voucher as redeemed
      await client.query(
        `UPDATE public.subscription_vouchers
         SET status = 'redeemed', redeemed_by = $1, redeemed_at = now()
         WHERE id = $2`,
        [userId, voucher.id],
      );

      // 3. Record transaction in payments
      await client.query(
        `INSERT INTO public.payments (
           user_id, subscription_id, amount, currency, status, provider, provider_payment_id, paid_at
         ) VALUES ($1, $2, 0.00, 'PEN', 'approved', 'voucher', $3, now())`,
        [userId, subscriptionId, voucher.code],
      );

      // 4. Send in-app notification to the user
      await client.query(
        `INSERT INTO public.notifications (user_id, type, title, message, channel, priority)
         VALUES ($1, 'subscription_activated', '¡Plan Activado con Éxito!', $2, 'in_app', 'high')`,
        [
          userId,
          `Has activado con éxito tu plan ${voucher.tier.toUpperCase()} por ${voucher.duration_days} días (vigente hasta el ${newPeriodEnd.toLocaleDateString()}).`,
        ],
      );

      return {
        success: true,
        message: `Plan ${voucher.tier.toUpperCase()} activado exitosamente por ${voucher.duration_days} días.`,
        tier: voucher.tier,
        durationDays: voucher.duration_days,
        currentPeriodEnd: newPeriodEnd,
        voucherCode: voucher.code,
      };
    }, { userId, ipAddress });
  }
}
