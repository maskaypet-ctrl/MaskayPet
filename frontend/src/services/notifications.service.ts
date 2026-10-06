import { api } from './api';
import { NotificationItem, NotificationPreferences, ReminderItem } from '../types';

export const notificationsService = {
  async getMyNotifications(): Promise<NotificationItem[]> {
    const res = await api.get<NotificationItem[]>('/notifications');
    return res.data;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await api.patch<NotificationItem>(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    const res = await api.post<{ success: boolean }>('/notifications/read-all');
    return res.data;
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const res = await api.get<NotificationPreferences>('/notifications/preferences');
    return res.data;
  },

  async updatePreferences(data: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const res = await api.patch<NotificationPreferences>('/notifications/preferences', data);
    return res.data;
  },

  async getUpcomingReminders(): Promise<ReminderItem[]> {
    const res = await api.get<ReminderItem[]>('/notifications/reminders');
    return res.data;
  },
};
