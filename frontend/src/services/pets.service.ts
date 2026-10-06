import { api } from './api';
import { Pet, PetContact, PetDetail, PetPublicProfile } from '../types';

export const petsService = {
  async getMyPets(): Promise<Pet[]> {
    const res = await api.get<Pet[]>('/pets');
    return res.data;
  },

  async getDashboardSummary(): Promise<{
    totalPets: number;
    petsWithQr: number;
    totalScansMonth: number;
    activeLostAlerts: number;
    vaccines: {
      totalApplied: number;
      overdueCount: number;
      percentage: string;
      statusText: string;
    };
  }> {
    const res = await api.get('/pets/dashboard/summary');
    return res.data;
  },

  async getPetById(id: string): Promise<PetDetail> {
    const res = await api.get<PetDetail>(`/pets/${id}`);
    return res.data;
  },

  async createPet(data: {
    name: string;
    species: string;
    breed?: string;
    sex?: string;
    birthDate?: string;
    color?: string;
    microchipNumber?: string;
    isSterilized?: boolean;
    description?: string;
    photoStoragePath?: string;
  }): Promise<Pet> {
    const res = await api.post<Pet>('/pets', data);
    return res.data;
  },

  async updatePet(id: string, data: Partial<Pet>): Promise<Pet> {
    const res = await api.patch<Pet>(`/pets/${id}`, data);
    return res.data;
  },

  async addContact(petId: string, contact: {
    name: string;
    relationship?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    priority?: number;
    isPrimary?: boolean;
    canReceiveLostAlerts?: boolean;
  }): Promise<PetContact> {
    const res = await api.post<PetContact>(`/pets/${petId}/contacts`, contact);
    return res.data;
  },

  async deleteContact(petId: string, contactId: string): Promise<{ deleted: boolean }> {
    const res = await api.delete<{ deleted: boolean }>(`/pets/${petId}/contacts/${contactId}`);
    return res.data;
  },

  async updatePublicProfile(petId: string, data: Partial<PetPublicProfile>): Promise<PetPublicProfile> {
    const res = await api.patch<PetPublicProfile>(`/pets/${petId}/public-profile`, data);
    return res.data;
  },
};
