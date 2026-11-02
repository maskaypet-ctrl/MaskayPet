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

  async ensureUniqueQr(
    petId: string,
    regenerate = false,
  ): Promise<{
    assigned: boolean;
    alreadyExisted: boolean;
    regenerated?: boolean;
    qrTagId: string;
    qrCode: string;
  }> {
    const res = await api.post(`/qr/generate/${petId}`, { regenerate });
    return res.data;
  },

  async unassignTag(publicCode: string, reason?: string): Promise<{ unassigned: boolean }> {
    const res = await api.post<{ unassigned: boolean }>('/qr/unassign', {
      publicCode,
      reason,
    });
    return res.data;
  },

  async getAvailableTags(): Promise<{ id: string; public_code: string; status: string; batch_code?: string }[]> {
    const res = await api.get('/qr/available');
    return res.data;
  },

  async getBatches(): Promise<{ batches: any[]; tags: any[] }> {
    const res = await api.get('/qr/batches');
    return res.data;
  },

  async createBatch(data: { batchCode: string; quantity: number; notes?: string }): Promise<{
    batch: any;
    generatedTagsCount: number;
    sampleTags: string[];
  }> {
    const res = await api.post('/qr/batches', data);
    return res.data;
  },

  async getAuditLogs(tableName?: string, limit: number = 50): Promise<any[]> {
    const params = new URLSearchParams();
    if (tableName) params.append('tableName', tableName);
    params.append('limit', String(limit));
    const res = await api.get(`/audit/logs?${params.toString()}`);
    return res.data;
  },
};
