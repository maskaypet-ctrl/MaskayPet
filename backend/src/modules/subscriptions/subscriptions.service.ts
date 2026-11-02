import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { AdminGrantSubscriptionDto, SubscribeDto } from './dto/subscription.dto';
import { GenerateVouchersDto, RedeemVoucherDto } from './dto/voucher.dto';

export const BILLING_CYCLES: Record<
  string,
  {
    code: string;
    label: string;
    tier: 'free' | 'premium';
    status: 'trialing' | 'active';
    durationDays: number;
    pricePen: number;
    badge?: string;
  }
> = {
  trial_14d: {
    code: 'trial_14d',
    label: 'Prueba Gratis Premium (14 Días)',
    tier: 'premium',
    status: 'trialing',
    durationDays: 14,
    pricePen: 0.0,
    badge: '14 DÍAS GRATIS',
  },
  monthly_1m: {
    code: 'monthly_1m',
    label: 'Plan Mensual (1 Mes / 30 días)',
    tier: 'premium',
    status: 'active',
    durationDays: 30,
    pricePen: 14.9,
  },
  quarterly_3m: {
    code: 'quarterly_3m',
    label: 'Plan Trimestral (3 Meses / 90 días)',
    tier: 'premium',
    status: 'active',
    durationDays: 90,
    pricePen: 39.9,
    badge: 'AHORRA 11%',
  },
  semiannual_6m: {
    code: 'semiannual_6m',
    label: 'Plan Semestral (6 Meses / 180 días)',
    tier: 'premium',
    status: 'active',
    durationDays: 180,
    pricePen: 69.9,
    badge: 'MÁS POPULAR • AHORRA 22%',
  },
  annual_1y: {
    code: 'annual_1y',
    label: 'Plan Anual (1 Año / 365 días)',
    tier: 'premium',
    status: 'active',
    durationDays: 365,
    pricePen: 119.9,
    badge: 'MEJOR VALOR • AHORRA 33%',
  },
};

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
    return res.rows.map((row) => ({
      ...row,
      billingCycles: row.tier === 'premium' ? Object.values(BILLING_CYCLES) : [],
    }));
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

    const paymentsRes = await this.db.query(
      `SELECT * FROM public.payments WHERE user_id = $1 ORDER BY paid_at DESC LIMIT 20`,
      [userId],
    );

    const hasUsedTrial = paymentsRes.rows.some(
      (p) =>
        p.provider === 'free_trial' ||
        p.provider_payment_id === 'trial_14d' ||
        (p.provider_payment_id && String(p.provider_payment_id).startsWith('TRIAL')),
    );

    // Check if active subscription has reached its expiration date
    if (sub && sub.current_period_end && new Date(sub.current_period_end).getTime() <= Date.now()) {
      await this.db.query(
        `UPDATE public.subscriptions SET status = 'expired', updated_at = now() WHERE id = $1`,
        [sub.id],
      );
      const freeLimits = await this.db.queryOne(
        `SELECT max_pets, max_collaborators_per_pet, sms_credits_monthly, medical_document_retention_years
         FROM public.plan_limits WHERE tier = 'free'`,
      );
      return {
        tier: 'free',
        status: 'expired',
        expired_at: sub.current_period_end,
        started_at: sub.started_at,
        auto_renew: false,
        days_remaining: 0,
        has_used_trial: true,
        payments: paymentsRes.rows,
        billing_options: Object.values(BILLING_CYCLES),
        ...freeLimits,
      };
    }

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
        days_remaining: 0,
        has_used_trial: hasUsedTrial,
        payments: paymentsRes.rows,
        billing_options: Object.values(BILLING_CYCLES),
        ...freeLimits,
      };
    }

    const endMs = sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
    const daysRemaining = endMs > Date.now() ? Math.ceil((endMs - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

    return {
      ...sub,
      days_remaining: daysRemaining,
      has_used_trial: hasUsedTrial || sub.status === 'trialing',
      payments: paymentsRes.rows,
      billing_options: Object.values(BILLING_CYCLES),
    };
  }

  async subscribe(userId: string, dto: SubscribeDto, ipAddress?: string) {
    if (dto.tier === 'free' || dto.billingCycle === 'free') {
      return this.db.transaction(async (client) => {
        await client.query(
          `UPDATE public.subscriptions 
           SET status = 'canceled', canceled_at = now()
           WHERE user_id = $1 AND status IN ('trialing','active','past_due')`,
          [userId],
        );
        return {
          tier: 'free',
          status: 'active',
          message: 'Tu cuenta ha pasado al Plan Free.',
        };
      }, { userId, ipAddress });
    }

    const cycleKey =
      dto.isTrial || dto.billingCycle === 'trial_14d'
        ? 'trial_14d'
        : dto.billingCycle && BILLING_CYCLES[dto.billingCycle]
        ? dto.billingCycle
        : 'monthly_1m';

    const cycle = BILLING_CYCLES[cycleKey] || BILLING_CYCLES.monthly_1m;
    const durationDays = dto.durationDays || cycle.durationDays;
    const isTrial = cycleKey === 'trial_14d' || Boolean(dto.isTrial);

    if (isTrial) {
      const priorPayments = await this.db.query(
        `SELECT * FROM public.payments WHERE user_id = $1`,
        [userId],
      );
      const alreadyTrialed = priorPayments.rows.some(
        (p) => p.provider === 'free_trial' || p.provider_payment_id === 'trial_14d',
      );
      if (alreadyTrialed) {
        throw new ConflictException(
          'Ya utilizaste tu periodo de Prueba Gratis anteriormente en esta cuenta. Elige un plan por tiempo (1 mes, 6 meses o 1 año).',
        );
      }
    }

    return this.db.transaction(async (client) => {
      // Check if user already has an active subscription to accumulate remaining days
      const activeSub = await client.query(
        `SELECT id, tier, current_period_end, status
         FROM public.subscriptions
         WHERE user_id = $1 AND status IN ('trialing','active')
         ORDER BY current_period_end DESC
         LIMIT 1`,
        [userId],
      );

      const durationMs = durationDays * 24 * 60 * 60 * 1000;
      let periodEnd = new Date(Date.now() + durationMs);

      if (activeSub.rows[0] && activeSub.rows[0].current_period_end) {
        const currentEnd = new Date(activeSub.rows[0].current_period_end);
        if (currentEnd > new Date()) {
          periodEnd = new Date(currentEnd.getTime() + durationMs);
        }
      }

      // Cancel previous active subscription record before inserting updated one
      await client.query(
        `UPDATE public.subscriptions 
         SET status = 'canceled', canceled_at = now()
         WHERE user_id = $1 AND status IN ('trialing','active','past_due')`,
        [userId],
      );

      const subStatus = isTrial ? 'trialing' : 'active';
      const provider = isTrial ? 'free_trial' : dto.provider || 'yape';

      const subRes = await client.query(
        `INSERT INTO public.subscriptions (
           user_id, tier, status, current_period_start, current_period_end, provider, provider_subscription_id
         ) VALUES ($1, $2, $3, now(), $4, $5, $6)
         RETURNING *`,
        [userId, 'premium', subStatus, periodEnd, provider, cycle.code],
      );
      const sub = subRes.rows[0];

      await client.query(
        `INSERT INTO public.payments (
           user_id, subscription_id, amount, currency, status, provider, provider_payment_id, paid_at
         ) VALUES ($1, $2, $3, 'PEN', 'approved', $4, $5, now())`,
        [userId, sub.id, cycle.pricePen, provider, cycle.code],
      );

      await client.query(
        `INSERT INTO public.notifications (user_id, type, title, message, channel, priority)
         VALUES ($1, 'subscription_activated', '¡Plan Activado con Éxito!', $2, 'in_app', 'high')`,
        [
          userId,
          isTrial
            ? `¡Tu Prueba Gratis Premium por ${durationDays} días está activa hasta el ${periodEnd.toLocaleDateString()}!`
            : `Has activado ${cycle.label} (vigente hasta el ${periodEnd.toLocaleDateString()}).`,
        ],
      );

      return {
        ...sub,
        message: isTrial
          ? `¡Prueba Gratis Premium por ${durationDays} días activada con éxito!`
          : `¡${cycle.label} activado con éxito!`,
        cycleLabel: cycle.label,
        durationDays,
        pricePen: cycle.pricePen,
        amountPaidPen: cycle.pricePen,
      };
    }, { userId, ipAddress });
  }

  /**
   * ADMIN: List all user accounts with their subscription & trial status
   */
  async listAccountsForAdmin() {
    const res = await this.db.query(
      `SELECT u.id, a.email, a.status as account_status, u.first_name, u.last_name, u.phone, u.created_at,
              (SELECT COUNT(*)::int FROM public.pets p WHERE p.owner_id = u.id AND p.status != 'archived') as pets_count,
              s.tier as subscription_tier,
              s.status as subscription_status,
              s.current_period_end,
              s.provider as subscription_provider,
              s.provider_subscription_id as billing_cycle
       FROM public.users u
       JOIN identity.user_accounts a ON a.id = u.id
       LEFT JOIN LATERAL (
         SELECT tier, status, current_period_end, provider, provider_subscription_id
         FROM public.subscriptions sub
         WHERE sub.user_id = u.id AND sub.status IN ('trialing','active','past_due')
         ORDER BY sub.created_at DESC
         LIMIT 1
       ) s ON true
       ORDER BY u.created_at DESC
       LIMIT 100`,
    );
    return res.rows.map((row) => ({
      ...row,
      tier: row.subscription_tier || row.tier || 'free',
      subscription_status: row.subscription_status || 'active',
      provider: row.subscription_provider || row.provider || null,
      provider_subscription_id: row.billing_cycle || row.provider_subscription_id || null,
    }));
  }

  /**
   * ADMIN: Directly grant or modify a user account's subscription (Trial, 1M, 3M, 6M, 1Y, or Free)
   */
  async adminGrantSubscription(
    adminUserId: string,
    targetUserId: string,
    dto: AdminGrantSubscriptionDto,
    ipAddress?: string,
  ) {
    if (dto.planType === 'free') {
      return this.subscribe(targetUserId, { tier: 'free', billingCycle: 'free' }, ipAddress);
    }

    let durationDays = 30;
    let isTrial = false;
    if (dto.planType === 'trial_7d') {
      durationDays = 7;
      isTrial = true;
    } else if (dto.planType === 'trial_14d') {
      durationDays = 14;
      isTrial = true;
    } else if (dto.planType === 'monthly_1m') {
      durationDays = 30;
    } else if (dto.planType === 'quarterly_3m') {
      durationDays = 90;
    } else if (dto.planType === 'semiannual_6m') {
      durationDays = 180;
    } else if (dto.planType === 'annual_1y') {
      durationDays = 365;
    } else if (dto.planType === 'custom' && dto.customDays) {
      durationDays = dto.customDays;
    }

    return this.db.transaction(async (client) => {
      await client.query(
        `UPDATE public.subscriptions 
         SET status = 'canceled', canceled_at = now()
         WHERE user_id = $1 AND status IN ('trialing','active','past_due')`,
        [targetUserId],
      );

      const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      const subStatus = isTrial ? 'trialing' : 'active';
      const subRes = await client.query(
        `INSERT INTO public.subscriptions (
           user_id, tier, status, current_period_start, current_period_end, provider, provider_subscription_id
         ) VALUES ($1, $2, $3, now(), $4, $5, $6)
         RETURNING *`,
        [targetUserId, 'premium', subStatus, periodEnd, 'admin_grant', dto.planType],
      );
      const sub = subRes.rows[0];

      await client.query(
        `INSERT INTO public.payments (
           user_id, subscription_id, amount, currency, status, provider, provider_payment_id, paid_at
         ) VALUES ($1, $2, 0.00, 'PEN', 'approved', 'admin_grant', $3, now())`,
        [targetUserId, sub.id, dto.planType],
      );

      await client.query(
        `INSERT INTO public.notifications (user_id, type, title, message, channel, priority)
         VALUES ($1, 'subscription_activated', '¡Plan Activado con Éxito!', $2, 'in_app', 'high')`,
        [
          targetUserId,
          `Un administrador ha activado tu cuenta en ${isTrial ? 'Prueba Gratis Premium' : 'Plan Premium'} por ${durationDays} días (hasta el ${periodEnd.toLocaleDateString()}).`,
        ],
      );

      return {
        success: true,
        subscription: sub,
        durationDays,
        status: subStatus,
      };
    }, { userId: adminUserId, ipAddress });
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
      const isTrialVoucher = voucher.duration_days <= 14 || voucher.code.startsWith('TRIAL');
      const targetStatus = isTrialVoucher ? 'trialing' : 'active';

      // Estimate reference price for history based on duration
      let estimatedPrice = 0;
      if (!isTrialVoucher) {
        if (voucher.duration_days >= 360) estimatedPrice = 119.9;
        else if (voucher.duration_days >= 180) estimatedPrice = 69.9;
        else if (voucher.duration_days >= 90) estimatedPrice = 39.9;
        else if (voucher.duration_days >= 30) estimatedPrice = 14.9;
      }

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
           ) VALUES ($1, $2, $3, now(), $4, 'voucher', $5)
           RETURNING *`,
          [userId, voucher.tier, targetStatus, newPeriodEnd, voucher.code],
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
         ) VALUES ($1, $2, $3, 'PEN', 'approved', 'voucher', $4, now())`,
        [userId, subscriptionId, estimatedPrice, voucher.code],
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
