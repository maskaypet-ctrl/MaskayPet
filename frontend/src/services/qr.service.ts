import { api } from './api';
import { PublicQRScanResponse } from '../types';

export const qrService = {
  async resolvePublicScan(publicCode: string): Promise<PublicQRScanResponse> {
    const res = await api.get<PublicQRScanResponse>(`/qr/public/${publicCode}`);
    return res.data;
  },

  async assignTag(petId: string, publicCode: string): Promise<{ assigned: boolean; qrCode: string }> {
    const res = await api.post<{ assigned: boolean; qrCode: string }>('/qr/assign', {
      petId,
      publicCode,
    });
    return res.data;
  },

  async unassignTag(publicCode: string, reason?: string): Promise<{ unassigned: boolean }> {
    const res = await api.post<{ unassigned: boolean }>('/qr/unassign', {
      publicCode,
      reason,
    });
    return res.data;
  },
};
