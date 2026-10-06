import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  ActivateLostModeDto,
  LocationPingDto,
  ResolveLostModeDto,
} from './dto/lost-mode.dto';

@Injectable()
export class LostModeService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Activate Lost Mode for a pet
   */
  async activateLostMode(petId: string, userId: string, dto: ActivateLostModeDto, ipAddress?: string) {
    // 1. Verify ownership
    const pet = await this.db.queryOne<{ id: string; owner_id: string; name: string }>(
      `SELECT id, owner_id, name FROM public.pets WHERE id = $1`,
      [petId],
    );
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    if (pet.owner_id !== userId) throw new ForbiddenException('Solo el dueño puede activar el Modo Perdido');

    // 2. Check if already active
    const activeEvent = await this.db.queryOne(
      `SELECT id FROM public.lost_mode_events WHERE pet_id = $1 AND status = 'active'`,
      [petId],
    );
    if (activeEvent) {
      throw new ConflictException('La mascota ya se encuentra en Modo Perdido');
    }

    return this.db.transaction(async (client) => {
      // Create lost mode event
      const eventRes = await client.query(
        `INSERT INTO public.lost_mode_events (pet_id, activated_by, status)
         VALUES ($1, $2, 'active')
         RETURNING *`,
        [petId, userId],
      );

      // Update emergency message if provided
      if (dto.emergencyMessage) {
        await client.query(
          `UPDATE public.pet_public_profiles 
           SET emergency_message = $1 
           WHERE pet_id = $2`,
          [dto.emergencyMessage.trim(), petId],
        );
      }

      // Create notification
      await client.query(
        `INSERT INTO public.notifications (user_id, pet_id, type, title, message, channel, priority)
         VALUES ($1, $2, 'lost_mode_activated', 'Modo Perdido Activado', $3, 'in_app', 'high')`,
        [
          userId,
          petId,
          `Has activado el Modo Perdido para ${pet.name}. El perfil público ahora mostrará alertas prioritarias de contacto.`,
        ],
      );

      return {
        activated: true,
        event: eventRes.rows[0],
      };
    }, { userId, ipAddress });
  }

  /**
   * Resolve Lost Mode (Mark pet as recovered or cancel)
   */
  async resolveLostMode(petId: string, userId: string, dto: ResolveLostModeDto, ipAddress?: string) {
    const pet = await this.db.queryOne<{ id: string; owner_id: string; name: string }>(
      `SELECT id, owner_id, name FROM public.pets WHERE id = $1`,
      [petId],
    );
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    if (pet.owner_id !== userId) throw new ForbiddenException('Solo el dueño puede resolver el Modo Perdido');

    const activeEvent = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM public.lost_mode_events WHERE pet_id = $1 AND status = 'active'`,
      [petId],
    );
    if (!activeEvent) {
      throw new BadRequestException('La mascota no tiene un Modo Perdido activo');
    }

    return this.db.transaction(async (client) => {
      const res = await client.query(
        `UPDATE public.lost_mode_events
         SET status = 'recovered',
             resolved_at = now(),
             recovery_method = $1,
             resolution_ping_id = $2,
             owner_testimonial = $3
         WHERE id = $4
         RETURNING *`,
        [
          dto.recoveryMethod,
          dto.resolutionPingId || null,
          dto.ownerTestimonial?.trim() || null,
          activeEvent.id,
        ],
      );

      // Create notification
      await client.query(
        `INSERT INTO public.notifications (user_id, pet_id, type, title, message, channel, priority)
         VALUES ($1, $2, 'lost_mode_resolved', '¡Mascota Recuperada!', $3, 'in_app', 'normal')`,
        [userId, petId, `¡Qué gran noticia! ${pet.name} ha sido marcada como recuperada con éxito.`],
      );

      return {
        resolved: true,
        event: res.rows[0],
      };
    }, { userId, ipAddress });
  }

  /**
   * PUBLIC ENDPOINT: Submit location ping from browser geolocation
   */
  async recordLocationPing(dto: LocationPingDto) {
    const ping = await this.db.queryOne(
      `INSERT INTO public.location_pings (
         lost_mode_event_id, qr_tag_id, latitude, longitude, accuracy_m
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        dto.lostModeEventId || null,
        dto.qrTagId || null,
        dto.latitude,
        dto.longitude,
        dto.accuracyM || null,
      ],
    );

    // If linked to active lost event, find pet owner and send high priority notification
    if (dto.lostModeEventId) {
      const info = await this.db.queryOne<{ owner_id: string; pet_id: string; pet_name: string }>(
        `SELECT p.owner_id, p.id as pet_id, p.name as pet_name
         FROM public.lost_mode_events l
         JOIN public.pets p ON p.id = l.pet_id
         WHERE l.id = $1`,
        [dto.lostModeEventId],
      );

      if (info) {
        await this.db.query(
          `INSERT INTO public.notifications (user_id, pet_id, type, title, message, channel, priority)
           VALUES ($1, $2, 'location_ping_received', '¡Nueva Ubicación de tu Mascota!', $3, 'in_app', 'critical')`,
          [
            info.owner_id,
            info.pet_id,
            `Alguien ha escaneado la placa de ${info.pet_name} y ha compartido sus coordenadas GPS. Revisa el mapa en tu panel.`,
          ],
        );
      }
    } else if (dto.qrTagId) {
      const info = await this.db.queryOne<{ owner_id: string; pet_id: string; pet_name: string }>(
        `SELECT p.owner_id, p.id as pet_id, p.name as pet_name
         FROM public.qr_tag_assignments a
         JOIN public.pets p ON p.id = a.pet_id
         WHERE a.qr_tag_id = $1 AND a.unassigned_at IS NULL`,
        [dto.qrTagId],
      );

      if (info) {
        await this.db.query(
          `INSERT INTO public.notifications (user_id, pet_id, type, title, message, channel, priority)
           VALUES ($1, $2, 'location_ping_received', '¡Ubicación Recibida de tu Mascota!', $3, 'in_app', 'high')`,
          [
            info.owner_id,
            info.pet_id,
            `Alguien ha escaneado la placa de ${info.pet_name} y ha compartido sus coordenadas satelitales GPS.`,
          ],
        );
      }
    }

    return {
      success: true,
      pingId: ping?.id,
      message: 'Ubicación enviada al propietario con éxito. ¡Gracias por ayudar!',
    };
  }

  /**
   * Get location history and scan logs for a pet
   */
  async getPetLocationHistory(petId: string, userId: string) {
    const pet = await this.db.queryOne(
      `SELECT id, owner_id FROM public.pets WHERE id = $1 AND (owner_id = $2 OR EXISTS (SELECT 1 FROM public.pet_collaborators WHERE pet_id = $1 AND user_id = $2))`,
      [petId, userId],
    );
    if (!pet) throw new ForbiddenException('No tienes acceso a esta mascota');

    const pings = await this.db.query(
      `SELECT lp.id, lp.latitude, lp.longitude, lp.accuracy_m, lp.captured_at,
              COALESCE(l.status, 'normal') as event_status, l.activated_at as lost_activated_at
       FROM public.location_pings lp
       LEFT JOIN public.lost_mode_events l ON l.id = lp.lost_mode_event_id
       LEFT JOIN public.qr_tag_assignments a ON a.qr_tag_id = lp.qr_tag_id AND a.unassigned_at IS NULL
       WHERE l.pet_id = $1 OR a.pet_id = $1
       ORDER BY lp.captured_at DESC
       LIMIT 50`,
      [petId],
    );

    const scans = await this.db.query(
      `SELECT id, was_lost_mode, device_type, scanned_at
       FROM public.profile_scan_events
       WHERE pet_id = $1
       ORDER BY scanned_at DESC
       LIMIT 50`,
      [petId],
    );

    return {
      pings: pings.rows.map((p) => ({
        ...p,
        latitude: parseFloat(p.latitude) || 0,
        longitude: parseFloat(p.longitude) || 0,
        accuracy_m: p.accuracy_m ? parseFloat(p.accuracy_m) : null,
      })),
      scans: scans.rows,
    };
  }
}
