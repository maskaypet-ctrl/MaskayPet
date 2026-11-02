import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import {
  AddCollaboratorDto,
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
   * Check user subscription limit for max_pets (Free allows up to 4 pets, Paid/Premium unlimited)
   */
  private async getUserSubscriptionTier(userId: string): Promise<'free' | 'premium'> {
    const sub = await this.db.queryOne<{ tier: string }>(
      `SELECT tier FROM public.subscriptions 
       WHERE user_id = $1 AND status IN ('trialing','active','past_due')
         AND (current_period_end IS NULL OR current_period_end > now())
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    return sub?.tier === 'premium' ? 'premium' : 'free';
  }

  private async checkPetCreationLimit(userId: string) {
    const tier = await this.getUserSubscriptionTier(userId);
    const maxPets = tier === 'premium' ? null : 4;

    if (maxPets !== null) {
      const currentCountRes = await this.db.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM public.pets WHERE owner_id = $1 AND status != 'archived'`,
        [userId],
      );
      const currentCount = parseInt(currentCountRes?.count || '0', 10);
      if (currentCount >= maxPets) {
        throw new BadRequestException(
          `Has alcanzado el límite de ${maxPets} mascotas en el Plan Gratuito. Con un Plan Mensual o superior puedes registrar mascotas y códigos QR ilimitados.`,
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
              p.microchip_number, p.is_sterilized, p.description,
              p.photo_storage_path, p.status, p.created_at,
              p.owner_id,
              (p.owner_id = $1) as is_owner,
              c.role as collaborator_role,
              t.public_code as qr_code,
              t.status as qr_status,
              EXISTS (SELECT 1 FROM public.lost_mode_events l WHERE l.pet_id = p.id AND l.status = 'active') as is_lost,
              (SELECT COUNT(*)::int FROM public.pet_vaccinations pv WHERE pv.pet_id = p.id) as vaccines_count,
              (SELECT COUNT(*)::int FROM public.pet_vaccinations pv WHERE pv.pet_id = p.id AND pv.next_due_date IS NOT NULL AND pv.next_due_date < CURRENT_DATE) as overdue_vaccines_count
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
   * Create a new pet with optional QR generation (Free = 1 QR max, Paid = Unlimited QRs)
   */
  async createPet(userId: string, dto: CreatePetDto, ipAddress?: string) {
    await this.checkPetCreationLimit(userId);
    const tier = await this.getUserSubscriptionTier(userId);

    const activeQrRes = await this.db.queryOne<{ active_qr_count: string }>(
      `SELECT COUNT(DISTINCT a.pet_id) as active_qr_count
       FROM public.qr_tag_assignments a
       JOIN public.pets p ON p.id = a.pet_id
       WHERE p.owner_id = $1 AND a.unassigned_at IS NULL AND p.status != 'archived'`,
      [userId],
    );
    const activeQrCount = parseInt(activeQrRes?.active_qr_count || '0', 10);
    const canCreateMoreQr = tier === 'premium' || activeQrCount < 1;

    if (dto.createQr === true && !canCreateMoreQr) {
      throw new BadRequestException(
        'En el Plan Gratuito puedes crear el código QR para 1 mascota. Desmarca la opción de crear QR para registrar esta mascota sin QR, o activa tu Plan Mensual para tener códigos QR ilimitados.',
      );
    }

    const shouldCreateQr = dto.createQr !== undefined ? Boolean(dto.createQr) : canCreateMoreQr;

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

      // 3. Optionally generate a high-scale unique QR code for this pet
      let qrTag: any = null;
      let uniqueQrCode: string | null = null;

      if (shouldCreateQr) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
          const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
          const candidate = `MQR-${part1}-${part2}`;
          const existing = await client.query(
            `SELECT id FROM public.qr_tags WHERE public_code = $1`,
            [candidate],
          );
          if (existing.rows.length === 0) {
            uniqueQrCode = candidate;
            break;
          }
        }
        if (!uniqueQrCode) {
          uniqueQrCode = `MQR-${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
        }

        const tagRes = await client.query(
          `INSERT INTO public.qr_tags (production_batch_id, public_code, status)
           VALUES ($1, $2, 'active')
           RETURNING *`,
          [null, uniqueQrCode],
        );
        qrTag = tagRes.rows[0];

        if (qrTag) {
          await client.query(
            `INSERT INTO public.qr_tag_assignments (qr_tag_id, pet_id)
             VALUES ($1, $2)`,
            [qrTag.id, pet.id],
          );
        }
      }

      return {
        ...pet,
        qr_tag_id: qrTag?.id || null,
        qr_code: uniqueQrCode,
        qr_public_code: uniqueQrCode,
        qr_status: uniqueQrCode ? 'active' : null,
      };
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

    const showPetName = dto.showPetName ?? dto.show_pet_name;
    const showPhoto = dto.showPhoto ?? dto.show_photo;
    const showBreed = dto.showBreed ?? dto.show_breed;
    const showOwnerName = dto.showOwnerName ?? dto.show_owner_name;
    const showOwnerPhone = dto.showOwnerPhone ?? dto.show_owner_phone;
    const showContacts = dto.showContacts ?? dto.show_contacts;
    const showMedicalInfo = dto.showMedicalInfo ?? dto.show_medical_info;
    const emergencyMessage = dto.emergencyMessage !== undefined ? dto.emergencyMessage : dto.emergency_message;

    if (showPetName !== undefined) { fields.push(`show_pet_name = $${idx++}`); values.push(showPetName); }
    if (showPhoto !== undefined) { fields.push(`show_photo = $${idx++}`); values.push(showPhoto); }
    if (showBreed !== undefined) { fields.push(`show_breed = $${idx++}`); values.push(showBreed); }
    if (showOwnerName !== undefined) { fields.push(`show_owner_name = $${idx++}`); values.push(showOwnerName); }
    if (showOwnerPhone !== undefined) { fields.push(`show_owner_phone = $${idx++}`); values.push(showOwnerPhone); }
    if (showContacts !== undefined) { fields.push(`show_contacts = $${idx++}`); values.push(showContacts); }
    if (showMedicalInfo !== undefined) { fields.push(`show_medical_info = $${idx++}`); values.push(showMedicalInfo); }
    if (emergencyMessage !== undefined) { fields.push(`emergency_message = $${idx++}`); values.push(emergencyMessage?.trim() || null); }

    if (fields.length === 0) {
      return this.db.queryOne(`SELECT * FROM public.pet_public_profiles WHERE pet_id = $1`, [petId]);
    }

    values.push(petId);
    const sql = `UPDATE public.pet_public_profiles SET ${fields.join(', ')} WHERE pet_id = $${idx} RETURNING *`;
    return this.db.queryOne(sql, values, { userId, ipAddress });
  }

  /**
   * Add a co-caregiver / family collaborator to a pet by email
   */
  async addCollaborator(petId: string, ownerUserId: string, dto: AddCollaboratorDto, ipAddress?: string) {
    const { pet } = await this.verifyPetAccess(petId, ownerUserId, true);

    const sub = await this.db.queryOne<{ tier: string }>(
      `SELECT tier FROM public.subscriptions 
       WHERE user_id = $1 AND status IN ('trialing','active','past_due')
         AND (current_period_end IS NULL OR current_period_end > now())
       ORDER BY created_at DESC LIMIT 1`,
      [ownerUserId],
    );
    const tier = sub?.tier || 'free';
    const limits = await this.db.queryOne<{ max_collaborators_per_pet: number }>(
      `SELECT max_collaborators_per_pet FROM public.plan_limits WHERE tier = $1`,
      [tier],
    );
    const maxCollabs = limits?.max_collaborators_per_pet ?? 1;

    const currentCollabs = await this.db.query(
      `SELECT user_id FROM public.pet_collaborators WHERE pet_id = $1`,
      [petId],
    );

    const targetAccount = await this.db.queryOne<{ id: string; email: string }>(
      `SELECT id, email FROM identity.user_accounts WHERE email = $1`,
      [dto.email.toLowerCase().trim()],
    );
    if (!targetAccount) {
      throw new NotFoundException(
        'No se encontró una cuenta registrada con ese correo. Pídele a tu familiar que se registre primero en MaskayPet.',
      );
    }

    if (targetAccount.id === ownerUserId) {
      throw new BadRequestException('No puedes agregarte a ti mismo como co-cuidador.');
    }

    const alreadyCollab = currentCollabs.rows.some((c: any) => c.user_id === targetAccount.id);
    if (!alreadyCollab && currentCollabs.rows.length >= maxCollabs) {
      throw new BadRequestException(
        `Has alcanzado el límite de ${maxCollabs} co-cuidador(es) por mascota en tu plan ${tier.toUpperCase()}.`,
      );
    }

    const role = dto.role || 'caregiver';
    await this.db.query(
      `INSERT INTO public.pet_collaborators (pet_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (pet_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [petId, targetAccount.id, role],
      { userId: ownerUserId, ipAddress },
    );

    await this.db
      .query(
        `INSERT INTO public.notifications (user_id, pet_id, type, title, message, channel, priority)
         VALUES ($1, $2, 'collaborator_added', '🐾 Te han asignado como Co-Cuidador', $3, 'in_app', 'normal')`,
        [
          targetAccount.id,
          petId,
          `Ahora tienes acceso como co-cuidador (${role === 'caregiver' ? 'Editor' : 'Lector'}) de la mascota "${pet.name}".`,
        ],
      )
      .catch(() => {});

    const updated = await this.getPetById(petId, ownerUserId);
    return {
      added: true,
      collaborators: updated.collaborators,
    };
  }

  /**
   * Remove a collaborator from a pet
   */
  async removeCollaborator(
    petId: string,
    collaboratorUserId: string,
    ownerUserId: string,
    ipAddress?: string,
  ) {
    await this.verifyPetAccess(petId, ownerUserId, true);
    await this.db.query(
      `DELETE FROM public.pet_collaborators WHERE pet_id = $1 AND user_id = $2`,
      [petId, collaboratorUserId],
      { userId: ownerUserId, ipAddress },
    );
    return { removed: true };
  }

  /**
   * Archive / soft-delete a pet
   */
  async archivePet(petId: string, ownerUserId: string, ipAddress?: string) {
    await this.verifyPetAccess(petId, ownerUserId, true);
    return this.db.transaction(async (client) => {
      await client.query(
        `UPDATE public.qr_tag_assignments SET unassigned_at = now() WHERE pet_id = $1 AND unassigned_at IS NULL`,
        [petId],
      );
      await client.query(
        `UPDATE public.pets SET status = 'archived' WHERE id = $1`,
        [petId],
      );
      return { archived: true, petId };
    }, { userId: ownerUserId, ipAddress });
  }
}
