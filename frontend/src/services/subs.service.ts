import { api } from './api';
import { Plan, UserSubscription, Voucher } from '../types';

export const subsService = {
  async getPlans(): Promise<Plan[]> {
    const res = await api.get<Plan[]>('/subscriptions/plans');
    return res.data;
  },

  async getMySubscription(): Promise<UserSubscription> {
    const res = await api.get<UserSubscription>('/subscriptions/me');
    return res.data;
  },

  async redeemVoucher(code: string): Promise<{
    success: boolean;
    message: string;
    tier: string;
    durationDays: number;
    currentPeriodEnd: string;
    voucherCode: string;
  }> {
    const res = await api.post('/subscriptions/redeem', { code });
    return res.data;
  },

  async generateVouchers(data: {
    tier?: string;
    durationDays?: number;
    months?: number;
    quantity?: number;
    codePrefix?: string;
    expiresAt?: string;
    notes?: string;
  }): Promise<{ generatedCount: number; vouchers: Voucher[] }> {
    const res = await api.post('/subscriptions/vouchers/generate', data);
    return res.data;
  },

  async listVouchers(status?: string, limit: number = 50): Promise<Voucher[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());

    const res = await api.get<Voucher[]>(`/subscriptions/vouchers?${params.toString()}`);
    return res.data;
  },
};
