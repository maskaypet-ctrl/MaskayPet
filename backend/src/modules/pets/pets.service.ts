import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreatePetContactDto,
  CreatePetDto,
  UpdatePetDto,
  UpdatePublicProfileDto,
} from './dto/pet.dto';

@Injectable()
export class PetsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Check if user has permission over pet (Owner or Caregiver)
   */
  async verifyPetAccess(petId: string, userId: string, requireOwner = false) {
    const pet = await this.db.queryOne(
      `SELECT p.*, 
              (SELECT c.role FROM public.pet_collaborators c WHERE c.pet_id = p.id AND c.user_id = $2) as collaborator_role
       FROM public.pets p
       WHERE p.id = $1`,
      [petId, userId],
    );

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    const isOwner = pet.owner_id === userId;
    const isCaregiver = pet.collaborator_role === 'caregiver';

    if (requireOwner && !isOwner) {
      throw new ForbiddenException('Solo el propietario de la mascota puede realizar esta acción');
    }

    if (!isOwner && !isCaregiver && pet.collaborator_role !== 'viewer') {
      throw new ForbiddenException('No tienes acceso a esta mascota');
    }

    return { pet, isOwner, isCaregiver };
  }

  /**
   * Check user subscription limit for max_pets
   */
  private async checkPetCreationLimit(userId: string) {
    // Get active subscription or default to 'free'
    const sub = await this.db.queryOne<{ tier: string }>(
      `SELECT tier FROM public.subscriptions 
       WHERE user_id = $1 AND status IN ('trialing','active','past_due')
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    const tier = sub?.tier || 'free';

    const limits = await this.db.queryOne<{ max_pets: number | null }>(
      `SELECT max_pets FROM public.plan_limits WHERE tier = $1`,
      [tier],
    );

    if (limits && limits.max_pets !== null) {
      const currentCountRes = await this.db.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM public.pets WHERE owner_id = $1 AND status != 'archived'`,
        [userId],
      );
      const currentCount = parseInt(currentCountRes?.count || '0', 10);
      if (currentCount >= limits.max_pets) {
        throw new BadRequestException(
          `Has alcanzado el límite de ${limits.max_pets} mascota(s) para tu plan ${tier.toUpperCase()}. Mejora a Premium para registrar mascotas ilimitadas.`,
        );
      }
    }
  }

  /**
   * List all pets belonging to or shared with the user
   */
  async getMyPets(userId: string) {
    const res = await this.db.query(
      `SELECT p.id, p.name, p.species, p.breed, p.sex, p.birth_date, p.color,
              p.photo_storage_path, p.status, p.created_at,
              p.owner_id,
              (p.owner_id = $1) as is_owner,
              c.role as collaborator_role,
              t.public_code as qr_code,
              t.status as qr_status,
              EXISTS (SELECT 1 FROM public.lost_mode_events l WHERE l.pet_id = p.id AND l.status = 'active') as is_lost
       FROM public.pets p
       LEFT JOIN public.pet_collaborators c ON c.pet_id = p.id AND c.user_id = $1
       LEFT JOIN public.qr_tag_assignments a ON a.pet_id = p.id AND a.unassigned_at IS NULL
       LEFT JOIN public.qr_tags t ON t.id = a.qr_tag_id
       WHERE (p.owner_id = $1 OR c.user_id = $1) AND p.status != 'archived'
       ORDER BY p.created_at DESC`,
      [userId],
    );
    return res.rows;
  }

  /**
   * Get real telemetry and live operational stats for user dashboard
   */
  async getDashboardSummary(userId: string) {
    // 1. Pets and QR counts
    const petsRes = await this.db.queryOne<{
      total_pets: string;
      pets_with_qr: string;
    }>(
      `SELECT 
         COUNT(p.id) as total_pets,
         COUNT(DISTINCT a.pet_id) as pets_with_qr
       FROM public.pets p
       LEFT JOIN public.qr_tag_assignments a ON a.pet_id = p.id AND a.unassigned_at IS NULL
       WHERE p.owner_id = $1 AND p.status != 'archived'`,
      [userId],
    );

    // 2. Real scan events this month
    const scansRes = await this.db.queryOne<{ scan_count: string }>(
      `SELECT COUNT(se.id) as scan_count
       FROM public.profile_scan_events se
       JOIN public.qr_tag_assignments a ON a.qr_tag_id = se.qr_tag_id AND a.unassigned_at IS NULL
       JOIN public.pets p ON p.id = a.pet_id
       WHERE p.owner_id = $1 AND se.scanned_at >= date_trunc('month', CURRENT_DATE)`,
      [userId],
    );

    // 3. Active lost mode events
    const lostRes = await this.db.queryOne<{ lost_count: string }>(
      `SELECT COUNT(l.id) as lost_count
       FROM public.lost_mode_events l
       JOIN public.pets p ON p.id = l.pet_id
       WHERE p.owner_id = $1 AND l.status = 'active'`,
      [userId],
    );

    // 4. Vaccination telemetry
    const vacRes = await this.db.queryOne<{
      total_applied: string;
      overdue_count: string;
    }>(
      `SELECT 
         COUNT(pv.id) as total_applied,
         COUNT(CASE WHEN pv.next_due_date IS NOT NULL AND pv.next_due_date < CURRENT_DATE THEN 1 END) as overdue_count
       FROM public.pet_vaccinations pv
       JOIN public.pets p ON p.id = pv.pet_id
       WHERE p.owner_id = $1`,
      [userId],
    );

    const totalPets = parseInt(petsRes?.total_pets || '0', 10);
    const petsWithQr = parseInt(petsRes?.pets_with_qr || '0', 10);
    const totalScansMonth = parseInt(scansRes?.scan_count || '0', 10);
    const activeLostAlerts = parseInt(lostRes?.lost_count || '0', 10);
    const totalVaccines = parseInt(vacRes?.total_applied || '0', 10);
    const overdueVaccines = parseInt(vacRes?.overdue_count || '0', 10);

    let vaccineStatus = 'Sin registros';
    let vaccinePercentage = '0%';
    if (totalVaccines > 0) {
      if (overdueVaccines === 0) {
        vaccineStatus = 'Al día';
        vaccinePercentage = '100%';
      } else {
        const upToDate = totalVaccines - overdueVaccines;
        const pct = Math.round((upToDate / totalVaccines) * 100);
        vaccinePercentage = `${pct}%`;
        vaccineStatus = `${overdueVaccines} por renovar`;
      }
    } else if (totalPets > 0) {
      vaccineStatus = 'Pendiente registro';
      vaccinePercentage = '0%';
    }

    return {
      totalPets,
      petsWithQr,
      totalScansMonth,
      activeLostAlerts,
      vaccines: {
        totalApplied: totalVaccines,
        overdueCount: overdueVaccines,
        percentage: vaccinePercentage,
        statusText: vaccineStatus,
      },
    };
  }

  /**
   * Create a new pet with automatic public profile initialization
   */
  async createPet(userId: string, dto: CreatePetDto, ipAddress?: string) {
    await this.checkPetCreationLimit(userId);

    return this.db.transaction(async (client) => {
      // 1. Insert Pet
      const petRes = await client.query(
        `INSERT INTO public.pets (
           owner_id, name, species, breed, sex, birth_date, color,
           microchip_number, is_sterilized, description, photo_storage_path
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          userId,
          dto.name.trim(),
          dto.species.trim(),
          dto.breed?.trim() || null,
          dto.sex || 'unknown',
          dto.birthDate || null,
          dto.color?.trim() || null,
          dto.microchipNumber?.trim() || null,
          dto.isSterilized ?? null,
          dto.description?.trim() || null,
          dto.photoStoragePath?.trim() || null,
        ],
      );
      const pet = petRes.rows[0];

      // 2. Initialize default public profile
      await client.query(
        `INSERT INTO public.pet_public_profiles (pet_id, show_pet_name, show_photo, show_breed, show_owner_phone, show_contacts)
         VALUES ($1, true, true, true, true, true)
         ON CONFLICT (pet_id) DO NOTHING`,
        [pet.id],
      );

      return pet;
    }, { userId, ipAddress });
  }

  /**
   * Get complete pet details including contacts, public profile config, and assigned QR
   */
  async getPetById(petId: string, userId: string) {
    await this.verifyPetAccess(petId, userId);

    const pet = await this.db.queryOne(
      `SELECT p.*,
              (p.owner_id = $2) as is_owner,
              t.id as qr_tag_id,
              t.public_code as qr_public_code,
              t.status as qr_status,
              a.assigned_at as qr_assigned_at,
              l.id as active_lost_event_id,
              (l.id IS NOT NULL) as is_lost
       FROM public.pets p
       LEFT JOIN public.qr_tag_assignments a ON a.pet_id = p.id AND a.unassigned_at IS NULL
       LEFT JOIN public.qr_tags t ON t.id = a.qr_tag_id
       LEFT JOIN public.lost_mode_events l ON l.pet_id = p.id AND l.status = 'active'
       WHERE p.id = $1`,
      [petId, userId],
    );

    const contacts = await this.db.query(
      `SELECT * FROM public.pet_contacts WHERE pet_id = $1 ORDER BY priority ASC, is_primary DESC`,
      [petId],
    );

    const publicProfile = await this.db.queryOne(
      `SELECT * FROM public.pet_public_profiles WHERE pet_id = $1`,
      [petId],
    );

    const collaborators = await this.db.query(
      `SELECT c.*, u.first_name, u.last_name, a.email
       FROM public.pet_collaborators c
       JOIN public.users u ON u.id = c.user_id
       JOIN identity.user_accounts a ON a.id = u.id
       WHERE c.pet_id = $1`,
      [petId],
    );

    return {
      ...pet,
      contacts: contacts.rows,
      publicProfile: publicProfile || null,
      collaborators: collaborators.rows,
    };
  }

  /**
   * Update pet basic info
   */
  async updatePet(petId: string, userId: string, dto: UpdatePetDto, ipAddress?: string) {
    await this.verifyPetAccess(petId, userId, false);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name !== undefined) { fields.push(`name = $${idx++}`); values.push(dto.name.trim()); }
    if (dto.species !== undefined) { fields.push(`species = $${idx++}`); values.push(dto.species.trim()); }
    if (dto.breed !== undefined) { fields.push(`breed = $${idx++}`); values.push(dto.breed.trim()); }
    if (dto.sex !== undefined) { fields.push(`sex = $${idx++}`); values.push(dto.sex); }
    if (dto.birthDate !== undefined) { fields.push(`birth_date = $${idx++}`); values.push(dto.birthDate || null); }
    if (dto.color !== undefined) { fields.push(`color = $${idx++}`); values.push(dto.color.trim()); }
    if (dto.microchipNumber !== undefined) { fields.push(`microchip_number = $${idx++}`); values.push(dto.microchipNumber.trim()); }
    if (dto.isSterilized !== undefined) { fields.push(`is_sterilized = $${idx++}`); values.push(dto.isSterilized); }
    if (dto.description !== undefined) { fields.push(`description = $${idx++}`); values.push(dto.description.trim()); }
    if (dto.photoStoragePath !== undefined) { fields.push(`photo_storage_path = $${idx++}`); values.push(dto.photoStoragePath.trim()); }
    if (dto.status !== undefined) { fields.push(`status = $${idx++}`); values.push(dto.status); }

    if (fields.length === 0) {
      return this.getPetById(petId, userId);
    }

    values.push(petId);
    const sql = `UPDATE public.pets SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    return this.db.queryOne(sql, values, { userId, ipAddress });
  }

  /**
   * Add emergency contact for pet
   */
  async addContact(petId: string, userId: string, dto: CreatePetContactDto, ipAddress?: string) {
    await this.verifyPetAccess(petId, userId, false);

    return this.db.transaction(async (client) => {
      if (dto.isPrimary) {
        // Clear other primaries
        await client.query(`UPDATE public.pet_contacts SET is_primary = false WHERE pet_id = $1`, [petId]);
      }

      const res = await client.query(
        `INSERT INTO public.pet_contacts (
           pet_id, name, relationship, phone, email, whatsapp, priority, is_primary, can_receive_lost_alerts
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          petId,
          dto.name.trim(),
          dto.relationship?.trim() || null,
          dto.phone?.trim() || null,
          dto.email?.trim() || null,
          dto.whatsapp?.trim() || null,
          dto.priority || 1,
          dto.isPrimary ?? false,
          dto.canReceiveLostAlerts ?? true,
        ],
      );
      return res.rows[0];
    }, { userId, ipAddress });
  }

  /**
   * Delete contact
   */
  async deleteContact(petId: string, contactId: string, userId: string, ipAddress?: string) {
    await this.verifyPetAccess(petId, userId, false);
    await this.db.query(`DELETE FROM public.pet_contacts WHERE id = $1 AND pet_id = $2`, [contactId, petId], { userId, ipAddress });
    return { deleted: true };
  }

  /**
   * Update public profile visibility preferences
   */
  async updatePublicProfile(petId: string, userId: string, dto: UpdatePublicProfileDto, ipAddress?: string) {
    await this.verifyPetAccess(petId, userId, true);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.showPetName !== undefined) { fields.push(`show_pet_name = $${idx++}`); values.push(dto.showPetName); }
    if (dto.showPhoto !== undefined) { fields.push(`show_photo = $${idx++}`); values.push(dto.showPhoto); }
    if (dto.showBreed !== undefined) { fields.push(`show_breed = $${idx++}`); values.push(dto.showBreed); }
    if (dto.showOwnerName !== undefined) { fields.push(`show_owner_name = $${idx++}`); values.push(dto.showOwnerName); }
    if (dto.showOwnerPhone !== undefined) { fields.push(`show_owner_phone = $${idx++}`); values.push(dto.showOwnerPhone); }
    if (dto.showContacts !== undefined) { fields.push(`show_contacts = $${idx++}`); values.push(dto.showContacts); }
    if (dto.showMedicalInfo !== undefined) { fields.push(`show_medical_info = $${idx++}`); values.push(dto.showMedicalInfo); }
    if (dto.emergencyMessage !== undefined) { fields.push(`emergency_message = $${idx++}`); values.push(dto.emergencyMessage?.trim() || null); }

    if (fields.length === 0) {
      return this.db.queryOne(`SELECT * FROM public.pet_public_profiles WHERE pet_id = $1`, [petId]);
    }

    values.push(petId);
    const sql = `UPDATE public.pet_public_profiles SET ${fields.join(', ')} WHERE pet_id = $${idx} RETURNING *`;
    return this.db.queryOne(sql, values, { userId, ipAddress });
  }
}
