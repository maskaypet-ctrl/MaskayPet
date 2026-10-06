import { api } from './api';
import { LocationPing, ProfileScanEvent } from '../types';

export const lostService = {
  async activateLostMode(petId: string, emergencyMessage?: string): Promise<{ activated: boolean; event: any }> {
    const res = await api.post<{ activated: boolean; event: any }>(`/lost-mode/activate/${petId}`, {
      emergencyMessage,
    });
    return res.data;
  },

  async resolveLostMode(petId: string, data: {
    recoveryMethod: 'via_scan' | 'otro_medio';
    ownerTestimonial?: string;
  }): Promise<{ resolved: boolean; event: any }> {
    const res = await api.post<{ resolved: boolean; event: any }>(`/lost-mode/resolve/${petId}`, data);
    return res.data;
  },

  async sendLocationPing(data: {
    lostModeEventId?: string;
    qrTagId?: string;
    latitude: number;
    longitude: number;
    accuracyM?: number;
  }): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/lost-mode/ping', data);
    return res.data;
  },

  async getLocationHistory(petId: string): Promise<{ pings: LocationPing[]; scans: ProfileScanEvent[] }> {
    const res = await api.get<{ pings: LocationPing[]; scans: ProfileScanEvent[] }>(`/lost-mode/history/${petId}`);
    return res.data;
  },
};
