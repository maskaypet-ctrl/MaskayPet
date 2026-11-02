import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { AssignQrDto, CreateBatchDto, UnassignQrDto } from './dto/qr.dto';

@Injectable()
export class QrService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Helper to detect device type from User Agent string
   */
  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) return 'other';
    const ua = userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
    if (ua.includes('android')) return 'android';
    if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) return 'desktop';
    return 'other';
  }

  /**
   * PUBLIC ENDPOINT: Resolve QR scan
   * 1. Resolves public code to QR tag
   * 2. Checks active assignment to pet
   * 3. Checks if pet is in Lost Mode
   * 4. Logs scan event into public.profile_scan_events
   * 5. Filters data according to pet_public_profiles
   */
  async resolvePublicScan(publicCode: string, userAgent?: string) {
    const code = publicCode.trim().toUpperCase();

    // 1. Get tag
    const tag = await this.db.queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM public.qr_tags WHERE public_code = $1`,
      [code],
    );

    if (!tag) {
      throw new NotFoundException('Código QR no reconocido o no registrado en el sistema');
    }

    if (tag.status === 'lost' || tag.status === 'damaged' || tag.status === 'retired') {
      return {
        status: tag.status,
        message: 'Esta placa QR ha sido reportada como inactiva, dañada o reemplazada.',
      };
    }

    // 2. Get active assignment
    const assignment = await this.db.queryOne<{
      pet_id: string;
      owner_id: string;
      name: string;
      species: string;
      breed: string | null;
      sex: string | null;
      birth_date: string | null;
      color: string | null;
      microchip_number: string | null;
      is_sterilized: boolean | null;
      photo_storage_path: string | null;
      description: string | null;
      owner_first_name: string;
      owner_phone: string | null;
      active_lost_event_id: string | null;
      emergency_message: string | null;
      show_pet_name: boolean;
      show_photo: boolean;
      show_breed: boolean;
      show_owner_name: boolean;
      show_owner_phone: boolean;
      show_contacts: boolean;
      show_medical_info: boolean;
    }>(
      `SELECT a.pet_id, p.owner_id, p.name, p.species, p.breed, p.sex, p.birth_date, p.color,
              p.microchip_number, p.is_sterilized, p.photo_storage_path, p.description,
              u.first_name as owner_first_name, u.phone as owner_phone,
              l.id as active_lost_event_id,
              pp.show_pet_name, pp.show_photo, pp.show_breed, pp.show_owner_name,
              pp.show_owner_phone, pp.show_contacts, pp.show_medical_info,
              COALESCE(pp.emergency_message, '¡Esta mascota se encuentra extraviada! Por favor comunícate con su familia.') as emergency_message
       FROM public.qr_tag_assignments a
       JOIN public.pets p ON p.id = a.pet_id
       JOIN public.users u ON u.id = p.owner_id
       LEFT JOIN public.pet_public_profiles pp ON pp.pet_id = p.id
       LEFT JOIN public.lost_mode_events l ON l.pet_id = p.id AND l.status = 'active'
       WHERE a.qr_tag_id = $1 AND a.unassigned_at IS NULL AND p.status = 'active'`,
      [tag.id],
    );

    if (!assignment) {
      return {
        status: 'unassigned',
        qrCode: code,
        message: 'Esta placa QR está lista para ser activada por su dueño.',
      };
    }

    const isLostMode = Boolean(assignment.active_lost_event_id);
    const deviceType = this.detectDeviceType(userAgent);

    // 3. Log scan event asynchronously
    this.db.query(
      `INSERT INTO public.profile_scan_events (qr_tag_id, pet_id, was_lost_mode, device_type)
       VALUES ($1, $2, $3, $4)`,
      [tag.id, assignment.pet_id, isLostMode, deviceType],
    ).catch(() => {});

    // 4. Get contacts (filtered)
    let contacts: any[] = [];
    if (isLostMode || assignment.show_contacts) {
      const contactsRes = await this.db.query(
        `SELECT name, relationship, phone, whatsapp, is_primary
         FROM public.pet_contacts
         WHERE pet_id = $1 AND (is_primary = true OR can_receive_lost_alerts = true)
         ORDER BY priority ASC, is_primary DESC`,
        [assignment.pet_id],
      );
      contacts = contactsRes.rows;
    }

    // 5. Get medical summary if permitted
    let medicalSummary: any = null;
    if (assignment.show_medical_info) {
      const vacRes = await this.db.query(
        `SELECT vaccine_name, application_date, next_due_date FROM public.pet_vaccinations WHERE pet_id = $1 ORDER BY application_date DESC LIMIT 5`,
        [assignment.pet_id],
      );
      const treatRes = await this.db.query(
        `SELECT treatment_name, medication_name, dosage, frequency, instructions FROM public.pet_treatments WHERE pet_id = $1 AND status = 'active'`,
        [assignment.pet_id],
      );
      const diagRes = await this.db.query(
        `SELECT diagnosis, description, diagnosis_date FROM public.pet_diagnoses WHERE pet_id = $1 ORDER BY diagnosis_date DESC LIMIT 3`,
        [assignment.pet_id],
      );
      medicalSummary = {
        recentVaccines: vacRes.rows,
        activeTreatments: treatRes.rows,
        diagnoses: diagRes.rows,
      };
    }

    return {
      status: 'active',
      qrCode: code,
      ownerId: assignment.owner_id,
      isLostMode,
      qrTagId: tag.id,
      lostModeEventId: assignment.active_lost_event_id,
      pet: {
        id: assignment.pet_id,
        name: assignment.show_pet_name !== false ? assignment.name : undefined,
        species: assignment.species,
        breed: assignment.show_breed !== false ? assignment.breed : undefined,
        sex: assignment.sex,
        birthDate: assignment.birth_date,
        color: assignment.color,
        microchipNumber: assignment.microchip_number,
        isSterilized: assignment.is_sterilized,
        photoStoragePath: assignment.show_photo !== false ? assignment.photo_storage_path : undefined,
        description: assignment.description,
        emergencyMessage: isLostMode ? assignment.emergency_message : assignment.emergency_message || undefined,
      },
      owner: {
        name: (isLostMode || assignment.show_owner_name) ? assignment.owner_first_name : undefined,
        phone: (isLostMode || assignment.show_owner_phone !== false) ? assignment.owner_phone : undefined,
      },
      contacts,
      medicalSummary,
    };
  }

  /**
   * Ensure or create a unique QR code for a pet.
   * - Free plan allows 1 active QR across the user's pets.
   * - Paid/Premium plans allow unlimited active QRs.
   * - Uses 12-hex-character cryptographic codes (281+ trillion combinations) supporting millions of pets.
   * - If regenerate === true, replaces the current QR with a newly generated one.
   */
  async ensureUniqueQrForPet(
    userId: string,
    petId: string,
    ipAddress?: string,
    regenerate = false,
  ) {
    const pet = await this.db.queryOne(
      `SELECT id, owner_id, name FROM public.pets WHERE id = $1 AND owner_id = $2`,
      [petId, userId],
    );
    if (!pet) {
      throw new ForbiddenException('No tienes permisos sobre esta mascota o no existe');
    }

    const existing = await this.db.queryOne<{ qr_tag_id: string; public_code: string }>(
      `SELECT a.qr_tag_id, t.public_code
       FROM public.qr_tag_assignments a
       JOIN public.qr_tags t ON t.id = a.qr_tag_id
       WHERE a.pet_id = $1 AND a.unassigned_at IS NULL`,
      [petId],
    );

    if (existing && !regenerate) {
      return {
        assigned: true,
        alreadyExisted: true,
        qrTagId: existing.qr_tag_id,
        qrCode: existing.public_code,
      };
    }

    // Check QR quota if creating a QR for a pet that didn't have one
    if (!existing) {
      const sub = await this.db.queryOne<{ tier: string }>(
        `SELECT tier FROM public.subscriptions 
         WHERE user_id = $1 AND status IN ('trialing','active','past_due')
           AND (current_period_end IS NULL OR current_period_end > now())
         ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );
      const isPremium = sub?.tier === 'premium';

      if (!isPremium) {
        const activeQrRes = await this.db.queryOne<{ active_qr_count: string }>(
          `SELECT COUNT(DISTINCT a.pet_id) as active_qr_count
           FROM public.qr_tag_assignments a
           JOIN public.pets p ON p.id = a.pet_id
           WHERE p.owner_id = $1 AND a.unassigned_at IS NULL AND p.status != 'archived'`,
          [userId],
        );
        const activeQrCount = parseInt(activeQrRes?.active_qr_count || '0', 10);
        if (activeQrCount >= 1) {
          throw new BadRequestException(
            'En el Plan Gratuito solo 1 mascota puede tener código QR activo. Con tu Plan Mensual o superior puedes crear códigos QR ilimitados para todas tus mascotas.',
          );
        }
      }
    }

    return this.db.transaction(async (client) => {
      if (existing && regenerate) {
        await client.query(
          `UPDATE public.qr_tag_assignments SET unassigned_at = now() WHERE pet_id = $1 AND unassigned_at IS NULL`,
          [petId],
        );
      }

      let uniqueQrCode = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
        const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
        const candidate = `MQR-${part1}-${part2}`;
        const check = await client.query(
          `SELECT id FROM public.qr_tags WHERE public_code = $1`,
          [candidate],
        );
        if (check.rows.length === 0) {
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
      const qrTag = tagRes.rows[0];

      await client.query(
        `INSERT INTO public.qr_tag_assignments (qr_tag_id, pet_id)
         VALUES ($1, $2)`,
        [qrTag.id, petId],
      );

      return {
        assigned: true,
        alreadyExisted: false,
        regenerated: Boolean(existing && regenerate),
        qrTagId: qrTag.id,
        qrCode: uniqueQrCode,
      };
    }, { userId, ipAddress });
  }

  /**
   * Assign an available QR tag to a pet
   */
  async assignTag(userId: string, dto: AssignQrDto, ipAddress?: string) {
    const code = dto.publicCode.trim().toUpperCase();

    // Verify pet ownership
    const pet = await this.db.queryOne(
      `SELECT id, owner_id FROM public.pets WHERE id = $1 AND owner_id = $2`,
      [dto.petId, userId],
    );
    if (!pet) {
      throw new ForbiddenException('No tienes permisos sobre esta mascota o no existe');
    }

    // Verify tag status
    const tag = await this.db.queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM public.qr_tags WHERE public_code = $1`,
      [code],
    );
    if (!tag) {
      throw new NotFoundException('Código QR no encontrado');
    }

    if (tag.status !== 'available' && tag.status !== 'inactive') {
      throw new ConflictException(`La placa QR se encuentra en estado '${tag.status}' y no está disponible para asignación.`);
    }

    return this.db.transaction(async (client) => {
      // Unassign any previous tag from this pet
      await client.query(
        `UPDATE public.qr_tag_assignments 
         SET unassigned_at = now(), reason = 'Reemplazo por nueva placa QR'
         WHERE pet_id = $1 AND unassigned_at IS NULL`,
        [dto.petId],
      );

      // Create new assignment
      const assignRes = await client.query(
        `INSERT INTO public.qr_tag_assignments (qr_tag_id, pet_id)
         VALUES ($1, $2)
         RETURNING *`,
        [tag.id, dto.petId],
      );

      // Update tag status to active
      await client.query(
        `UPDATE public.qr_tags SET status = 'active' WHERE id = $1`,
        [tag.id],
      );

      return {
        assigned: true,
        assignment: assignRes.rows[0],
        qrCode: code,
      };
    }, { userId, ipAddress });
  }

  /**
   * Unassign tag
   */
  async unassignTag(userId: string, dto: UnassignQrDto, ipAddress?: string) {
    const code = dto.publicCode.trim().toUpperCase();

    const tag = await this.db.queryOne<{ id: string; pet_id: string; owner_id: string }>(
      `SELECT t.id, a.pet_id, p.owner_id
       FROM public.qr_tags t
       JOIN public.qr_tag_assignments a ON a.qr_tag_id = t.id AND a.unassigned_at IS NULL
       JOIN public.pets p ON p.id = a.pet_id
       WHERE t.public_code = $1`,
      [code],
    );

    if (!tag) {
      throw new NotFoundException('Asignación activa no encontrada para este código QR');
    }

    if (tag.owner_id !== userId) {
      throw new ForbiddenException('Solo el propietario puede desvincular la placa');
    }

    return this.db.transaction(async (client) => {
      await client.query(
        `UPDATE public.qr_tag_assignments 
         SET unassigned_at = now(), reason = $2
         WHERE qr_tag_id = $1 AND unassigned_at IS NULL`,
        [tag.id, dto.reason || 'Desvinculado por el propietario'],
      );

      await client.query(
        `UPDATE public.qr_tags SET status = 'available' WHERE id = $1`,
        [tag.id],
      );

      return { unassigned: true };
    }, { userId, ipAddress });
  }

  /**
   * List available unassigned QR tags (for wizard / demo assistance)
   */
  async getAvailableTags(limit: number = 20) {
    const res = await this.db.query(
      `SELECT t.id, t.public_code, t.status, t.created_at, b.batch_code
       FROM public.qr_tags t
       LEFT JOIN public.tag_production_batches b ON b.id = t.production_batch_id
       WHERE t.status = 'available'
       ORDER BY (t.public_code LIKE 'PET-QR-DEMO%') DESC, t.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return res.rows;
  }

  /**
   * Admin: List production batches and tags summary
   */
  async getProductionBatches() {
    const batches = await this.db.query(
      `SELECT b.*,
              u.first_name as created_by_name,
              (SELECT COUNT(*)::int FROM public.qr_tags t WHERE t.production_batch_id = b.id AND t.status = 'available') as available_count,
              (SELECT COUNT(*)::int FROM public.qr_tags t WHERE t.production_batch_id = b.id AND t.status = 'active') as active_count
       FROM public.tag_production_batches b
       LEFT JOIN public.users u ON u.id = b.created_by
       ORDER BY b.created_at DESC
       LIMIT 50`,
    );

    const tags = await this.db.query(
      `SELECT t.id, t.public_code, t.status, t.created_at, b.batch_code, p.name as pet_name
       FROM public.qr_tags t
       LEFT JOIN public.tag_production_batches b ON b.id = t.production_batch_id
       LEFT JOIN public.qr_tag_assignments a ON a.qr_tag_id = t.id AND a.unassigned_at IS NULL
       LEFT JOIN public.pets p ON p.id = a.pet_id
       ORDER BY t.created_at DESC
       LIMIT 100`,
    );

    return {
      batches: batches.rows,
      tags: tags.rows,
    };
  }

  /**
   * Admin: Create a production batch and generate unique QR tags
   */
  async createProductionBatch(userId: string, dto: CreateBatchDto, ipAddress?: string) {
    return this.db.transaction(async (client) => {
      const batchRes = await client.query(
        `INSERT INTO public.tag_production_batches (batch_code, quantity, created_by, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [dto.batchCode.trim().toUpperCase(), dto.quantity, userId, dto.notes || null],
      );
      const batch = batchRes.rows[0];

      // Generate tags
      const tags: string[] = [];
      for (let i = 0; i < dto.quantity; i++) {
        const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
        const publicCode = `QR-${batch.batch_code.substring(0, 4)}-${randomStr}`;
        await client.query(
          `INSERT INTO public.qr_tags (production_batch_id, public_code, status)
           VALUES ($1, $2, 'available')`,
          [batch.id, publicCode],
        );
        tags.push(publicCode);
      }

      return {
        batch,
        generatedTagsCount: tags.length,
        sampleTags: tags.slice(0, 5),
      };
    }, { userId, ipAddress });
  }
}
