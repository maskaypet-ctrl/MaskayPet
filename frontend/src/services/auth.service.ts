import { api } from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  async login(data: { email: string; password: string; deviceName?: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  async getMe(): Promise<User> {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarStoragePath?: string;
  }): Promise<User> {
    const res = await api.patch<User>('/users/profile', data);
    return res.data;
  },

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ changed: boolean; message: string }> {
    const res = await api.post<{ changed: boolean; message: string }>('/auth/change-password', data);
    return res.data;
  },

  async adminResetPassword(
    userId: string,
    data: { newPassword: string },
  ): Promise<{ reset: boolean; userId: string; email: string; message: string }> {
    const res = await api.post(`/auth/admin/reset-password/${userId}`, data);
    return res.data;
  },

  async requestPasswordCode(email: string): Promise<{
    sent: boolean;
    email: string;
    emailDispatched: boolean;
    expiresInMinutes: number;
    verificationCodePreview?: string;
    message: string;
  }> {
    const res = await api.post('/auth/request-password-code', { email });
    return res.data;
  },

  async confirmPasswordCode(data: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<{
    updated: boolean;
    email: string;
    message: string;
  }> {
    const res = await api.post('/auth/confirm-password-code', data);
    return res.data;
  },
};
