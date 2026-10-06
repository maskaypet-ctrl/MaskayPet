import { api } from './api';
import {
  Appointment,
  Deworming,
  Diagnosis,
  MedicalDocument,
  Treatment,
  Vaccination,
  WeightRecord,
} from '../types';

export const healthService = {
  // Vaccinations
  async getVaccinations(petId: string): Promise<Vaccination[]> {
    const res = await api.get<Vaccination[]>(`/health/pets/${petId}/vaccinations`);
    return res.data;
  },

  async addVaccination(petId: string, data: {
    vaccineName: string;
    applicationDate: string;
    nextDueDate?: string;
    batchNumber?: string;
    veterinarianName?: string;
    clinicName?: string;
    notes?: string;
  }): Promise<Vaccination> {
    const res = await api.post<Vaccination>(`/health/pets/${petId}/vaccinations`, data);
    return res.data;
  },

  // Deworming
  async getDeworming(petId: string): Promise<Deworming[]> {
    const res = await api.get<Deworming[]>(`/health/pets/${petId}/deworming`);
    return res.data;
  },

  async addDeworming(petId: string, data: {
    productName: string;
    applicationDate: string;
    nextDueDate?: string;
    weightAtApplicationKg?: number;
    notes?: string;
  }): Promise<Deworming> {
    const res = await api.post<Deworming>(`/health/pets/${petId}/deworming`, data);
    return res.data;
  },

  // Treatments
  async getTreatments(petId: string): Promise<Treatment[]> {
    const res = await api.get<Treatment[]>(`/health/pets/${petId}/treatments`);
    return res.data;
  },

  async addTreatment(petId: string, data: {
    treatmentName: string;
    medicationName?: string;
    dosage?: string;
    frequency?: string;
    startDate: string;
    endDate?: string;
    instructions?: string;
    veterinarianName?: string;
    status?: 'planned' | 'active' | 'completed' | 'canceled';
  }): Promise<Treatment> {
    const res = await api.post<Treatment>(`/health/pets/${petId}/treatments`, data);
    return res.data;
  },

  // Diagnoses
  async getDiagnoses(petId: string): Promise<Diagnosis[]> {
    const res = await api.get<Diagnosis[]>(`/health/pets/${petId}/diagnoses`);
    return res.data;
  },

  async addDiagnosis(petId: string, data: {
    diagnosis: string;
    diagnosisDate: string;
    description?: string;
    status?: 'active' | 'resolved' | 'chronic';
  }): Promise<Diagnosis> {
    const res = await api.post<Diagnosis>(`/health/pets/${petId}/diagnoses`, data);
    return res.data;
  },

  // Weight Records
  async getWeightRecords(petId: string): Promise<WeightRecord[]> {
    const res = await api.get<WeightRecord[]>(`/health/pets/${petId}/weight`);
    return res.data;
  },

  async addWeightRecord(petId: string, data: {
    weightKg: number;
    measuredAt: string;
    notes?: string;
  }): Promise<WeightRecord> {
    const res = await api.post<WeightRecord>(`/health/pets/${petId}/weight`, data);
    return res.data;
  },

  // Appointments
  async getAppointments(petId: string): Promise<Appointment[]> {
    const res = await api.get<Appointment[]>(`/health/pets/${petId}/appointments`);
    return res.data;
  },

  async addAppointment(petId: string, data: {
    scheduledAt: string;
    reason: string;
    notes?: string;
  }): Promise<Appointment> {
    const res = await api.post<Appointment>(`/health/pets/${petId}/appointments`, data);
    return res.data;
  },

  // Medical Documents
  async getDocuments(petId: string): Promise<MedicalDocument[]> {
    const res = await api.get<MedicalDocument[]>(`/health/pets/${petId}/documents`);
    return res.data;
  },

  async addDocument(petId: string, data: {
    documentType: string;
    fileName: string;
    storagePath: string;
    mimeType?: string;
    fileSizeBytes?: number;
  }): Promise<MedicalDocument> {
    const res = await api.post<MedicalDocument>(`/health/pets/${petId}/documents`, data);
    return res.data;
  },
};
