// ==========================================
// 1. AUTH & USER TYPES
// ==========================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarStoragePath?: string | null;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ==========================================
// 2. PETS & PROFILES TYPES
// ==========================================

export type PetSpecies = 'perro' | 'gato' | 'otro';
export type PetSex = 'male' | 'female' | 'unknown';

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed?: string | null;
  sex?: PetSex;
  birth_date?: string | null;
  color?: string | null;
  microchip_number?: string | null;
  is_sterilized?: boolean | null;
  description?: string | null;
  photo_storage_path?: string | null;
  status: 'active' | 'deceased' | 'transferred' | 'archived';
  is_owner?: boolean;
  collaborator_role?: 'caregiver' | 'viewer' | null;
  qr_code?: string | null;
  qr_public_code?: string | null;
  qr_status?: 'available' | 'active' | 'inactive' | 'lost' | 'damaged' | 'retired' | null;
  is_lost?: boolean;
  created_at: string;
}

export interface PetContact {
  id: string;
  pet_id: string;
  name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  priority: number;
  is_primary: boolean;
  can_receive_lost_alerts: boolean;
  created_at: string;
}

export interface PetPublicProfile {
  pet_id: string;
  show_pet_name: boolean;
  show_photo: boolean;
  show_breed: boolean;
  show_owner_name: boolean;
  show_owner_phone: boolean;
  show_contacts: boolean;
  show_medical_info: boolean;
  emergency_message?: string | null;
}

export interface PetDetail extends Pet {
  contacts: PetContact[];
  publicProfile: PetPublicProfile | null;
  collaborators: any[];
}

// ==========================================
// 3. HEALTH & PASSPORT TYPES
// ==========================================

export interface Vaccination {
  id: string;
  pet_id: string;
  vaccine_name: string;
  application_date: string;
  next_due_date?: string | null;
  batch_number?: string | null;
  veterinarian_name?: string | null;
  clinic_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Deworming {
  id: string;
  pet_id: string;
  product_name: string;
  application_date: string;
  next_due_date?: string | null;
  weight_at_application_kg?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface Treatment {
  id: string;
  pet_id: string;
  treatment_name: string;
  medication_name?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  start_date: string;
  end_date?: string | null;
  instructions?: string | null;
  veterinarian_name?: string | null;
  status: 'planned' | 'active' | 'completed' | 'canceled';
  created_at: string;
}

export interface Diagnosis {
  id: string;
  pet_id: string;
  diagnosis: string;
  diagnosis_date: string;
  description?: string | null;
  status: 'active' | 'resolved' | 'chronic';
  created_at: string;
}

export interface WeightRecord {
  id: string;
  pet_id: string;
  weight_kg: number;
  measured_at: string;
  notes?: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  pet_id: string;
  scheduled_at: string;
  reason: string;
  notes?: string | null;
  status: 'scheduled' | 'confirmed' | 'completed' | 'canceled' | 'no_show';
}

export interface MedicalDocument {
  id: string;
  pet_id: string;
  document_type: 'prescription' | 'lab_result' | 'diagnosis' | 'medical_report' | 'vaccination_card' | 'other';
  file_name: string;
  storage_path: string;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  created_at: string;
}

// ==========================================
// 4. QR & LOST MODE TYPES
// ==========================================

export interface PublicQRScanResponse {
  status: 'active' | 'unassigned' | 'lost' | 'damaged' | 'retired';
  isLostMode?: boolean;
  qrTagId?: string;
  lostModeEventId?: string | null;
  message?: string;
  qrCode?: string;
  pet?: {
    id?: string;
    name?: string;
    species?: string;
    breed?: string;
    sex?: string;
    color?: string;
    photoStoragePath?: string;
    description?: string;
    emergencyMessage?: string;
  };
  owner?: {
    name?: string;
    phone?: string;
  };
  contacts?: {
    name: string;
    relationship?: string;
    phone?: string;
    whatsapp?: string;
    is_primary?: boolean;
  }[];
  medicalSummary?: {
    recentVaccines?: { vaccine_name: string; application_date: string }[];
    activeTreatments?: { treatment_name: string; instructions?: string }[];
  } | null;
}

export interface LocationPing {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  captured_at: string;
  event_status?: string;
}

export interface ProfileScanEvent {
  id: string;
  was_lost_mode: boolean;
  device_type: 'ios' | 'android' | 'desktop' | 'other';
  scanned_at: string;
}

// ==========================================
// 5. SUBSCRIPTIONS & VOUCHERS
// ==========================================

export interface Plan {
  tier: 'free' | 'premium';
  max_pets: number | null;
  max_collaborators_per_pet: number;
  sms_credits_monthly: number;
  medical_document_retention_years: number;
}

export interface UserSubscription {
  id?: string;
  tier: 'free' | 'premium';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  started_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  auto_renew?: boolean;
  max_pets?: number | null;
  max_collaborators_per_pet?: number;
  sms_credits_monthly?: number;
  medical_document_retention_years?: number;
}

export interface Voucher {
  id: string;
  code: string;
  tier: string;
  duration_days: number;
  status: 'available' | 'redeemed' | 'expired' | 'revoked';
  created_by?: string | null;
  created_by_name?: string | null;
  redeemed_by?: string | null;
  redeemed_by_name?: string | null;
  redeemed_by_phone?: string | null;
  redeemed_at?: string | null;
  expires_at?: string | null;
  notes?: string | null;
  created_at: string;
}

// ==========================================
// 6. COMMERCE / STORE
// ==========================================

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: number | string;
  is_active: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  status: string;
  payment_status: string;
  shipping_address: string;
  shipping_city: string;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  currency: string;
  created_at: string;
  items?: OrderItem[];
}

// ==========================================
// 7. NOTIFICATIONS & REMINDERS
// ==========================================

export interface NotificationItem {
  id: string;
  user_id: string;
  pet_id?: string | null;
  pet_name?: string | null;
  type: string;
  title: string;
  message: string;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  status: 'pending' | 'sent' | 'read' | 'canceled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  lost_pet_alerts: boolean;
  vaccine_reminders: boolean;
  treatment_reminders: boolean;
  appointment_reminders: boolean;
}

export interface ReminderItem {
  id: string;
  user_id: string;
  pet_id: string;
  pet_name: string;
  reminder_type: string;
  title: string;
  message: string;
  due_at: string;
  status: 'pending' | 'sent' | 'completed' | 'canceled';
}
