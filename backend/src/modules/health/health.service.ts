import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PetsService } from '../pets/pets.service';
import {
  CreateAppointmentDto,
  CreateDewormingDto,
  CreateDiagnosisDto,
  CreateMedicalDocumentDto,
  CreateTreatmentDto,
  CreateVaccinationDto,
  CreateWeightRecordDto,
} from './dto/health.dto';

@Injectable()
export class HealthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly petsService: PetsService,
  ) {}

  // 1. VACCINATIONS
  async getVaccinations(petId: string, userId: string) {
    await this.petsService.verifyPetAccess(petId, userId);
    const res = await this.db.query(
      `SELECT * FROM public.pet_vaccinations WHERE pet_id = $1 ORDER BY application_date DESC`,
      [petId],
    );
    return res.rows;
  }

  async addVaccination(petId: string, userId: string, dto: CreateVaccinationDto, ipAddress?: string) {
    await this.petsService.verifyPetAccess(petId, userId, false);
    return this.db.transaction(async (client) => {
      const res = await client.query(
        `INSERT INTO public.pet_vaccinations (
           pet_id, vaccine_name, application_date, next_due_date, batch_number,
           veterinarian_name, clinic_name, notes, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          petId,
          dto.vaccineName.trim(),
          dto.applicationDate,
          dto.nextDueDate || null,
          dto.batchNumber?.trim() || null,
          dto.veterinarianName?.trim() || null,
          dto.clinicName?.trim() || null,
          dto.notes?.trim() || null,
          userId,
        ],
      );

      // Auto create reminder if nextDueDate is set
      if (dto.nextDueDate) {
        await client.query(
          `INSERT INTO public.reminders (user_id, pet_id, reminder_type, reference_id, title, message, due_at)
           VALUES ($1, $2, 'vaccine', $3, $4, $5, $6)`,
          [
            userId,
            petId,
            res.rows[0].id,
            `Próxima Vacuna: ${dto.vaccineName}`,
            `Recordatorio de refuerzo para la vacuna ${dto.vaccineName}`,
            dto.nextDueDate,
          ],
        );
      }

      return res.rows[0];
    }, { userId, ipAddress });
  }

  // 2. DEWORMING
  async getDeworming(petId: string, userId: string) {
    await this.petsService.verifyPetAccess(petId, userId);
    const res = await this.db.query(
      `SELECT * FROM public.pet_deworming WHERE pet_id = $1 ORDER BY application_date DESC`,
      [petId],
    );
    return res.rows;
  }

  async addDeworming(petId: string, userId: string, dto: CreateDewormingDto, ipAddress?: string) {
    await this.petsService.verifyPetAccess(petId, userId, false);
    return this.db.transaction(async (client) => {
      const res = await client.query(
        `INSERT INTO public.pet_deworming (
           pet_id, product_name, application_date, next_due_date, weight_at_application_kg, notes, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          petId,
          dto.productName.trim(),
          dto.applicationDate,
          dto.nextDueDate || null,
          dto.weightAtApplicationKg || null,
          dto.notes?.trim() || null,
          userId,
        ],
      );

      if (dto.nextDueDate) {
        await client.query(
          `INSERT INTO public.reminders (user_id, pet_id, reminder_type, reference_id, title, message, due_at)
           VALUES ($1, $2, 'deworming', $3, $4, $5, $6)`,
          [
            userId,
            petId,
            res.rows[0].id,
            `Próxima Desparasitación: ${dto.productName}`,
            `Recordatorio de desparasitación para tu mascota con ${dto.productName}`,
            dto.nextDueDate,
          ],
        );
      }

      return res.rows[0];
    }, { userId, ipAddress });
  }

  // 3. TREATMENTS
  async getTreatments(petId: string, userId: string) {
    await this.petsService.verifyPetAccess(petId, userId);
    const res = await this.db.query(
      `SELECT * FROM public.pet_treatments WHERE pet_id = $1 ORDER BY start_date DESC`,
      [petId],
    );
    return res.rows;
  }

  async addTreatment(petId: string, userId: string, dto: CreateTreatmentDto, ipAddress?: string) {
    await this.petsService.verifyPetAccess(petId, userId, false);
    const res = await this.db.query(
      `INSERT INTO public.pet_treatments (
         pet_id, treatment_name, medication_name, dosage, frequency, start_date, end_date,
         instructions, veterinarian_name, status, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        petId,
        dto.treatmentName.trim(),
        dto.medicationName?.trim() || null,
        dto.dosage?.trim() || null,
        dto.frequency?.trim() || null,
        dto.startDate,
        dto.endDate || null,
        dto.instructions?.trim() || null,
        dto.veterinarianName?.trim() || null,
        dto.status || 'active',
        userId,
      ],
      { userId, ipAddress },
    );
    return res.rows[0];
  }

  // 4. DIAGNOSES
  async getDiagnoses(petId: string, userId: string) {
    await this.petsService.verifyPetAccess(petId, userId);
    const res = await this.db.query(
      `SELECT * FROM public.pet_diagnoses WHERE pet_id = $1 ORDER BY diagnosis_date DESC`,
      [petId],
    );
    return res.rows;
  }

  async addDiagnosis(petId: string, userId: string, dto: CreateDiagnosisDto, ipAddress?: string) {
    await this.petsService.verifyPetAccess(petId, userId, false);
    const res = await this.db.query(
      `INSERT INTO public.pet_diagnoses (pet_id, diagnosis, diagnosis_date, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        petId,
        dto.diagnosis.trim(),
        dto.diagnosisDate,
        dto.description?.trim() || null,
        dto.status || 'active',
        userId,
      ],
      { userId, ipAddress },
    );
    return res.rows[0];
  }

  // 5. WEIGHT RECORDS
  async getWeightRecords(petId: string, userId: string) {
    await this.petsService.verifyPetAccess(petId, userId);
    const res = await this.db.query(
      `SELECT * FROM public.pet_weight_records WHERE pet_id = $1 ORDER BY measured_at DESC`,
      [petId],
    );
    return res.rows;
  }

  async addWeightRecord(petId: string, userId: string, dto: CreateWeightRecordDto, ipAddress?: string) {
    await this.petsService.verifyPetAccess(petId, userId, false);
    const res = await this.db.query(
      `INSERT INTO public.pet_weight_records (pet_id, weight_kg, measured_at, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [petId, dto.weightKg, dto.measuredAt, dto.notes?.trim() || null, userId],
      { userId, ipAddress },
    );
    return res.rows[0];
  }

  // 6. APPOINTMENTS
  async getAppointments(petId: string, userId: string) {
    await this.petsService.verifyPetAccess(petId, userId);
    const res = await this.db.query(
      `SELECT * FROM public.appointments WHERE pet_id = $1 ORDER BY scheduled_at ASC`,
      [petId],
    );
    return res.rows;
  }

  async addAppointment(petId: string, userId: string, dto: CreateAppointmentDto, ipAddress?: string) {
    await this.petsService.verifyPetAccess(petId, userId, false);
    const res = await this.db.query(
      `INSERT INTO public.appointments (pet_id, user_id, scheduled_at, reason, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'scheduled')
       RETURNING *`,
      [petId, userId, dto.scheduledAt, dto.reason.trim(), dto.notes?.trim() || null],
      { userId, ipAddress },
    );
    return res.rows[0];
  }

  // 7. MEDICAL DOCUMENTS
  async getDocuments(petId: string, userId: string) {
    await this.petsService.verifyPetAccess(petId, userId);
    const res = await this.db.query(
      `SELECT * FROM public.pet_medical_documents WHERE pet_id = $1 ORDER BY created_at DESC`,
      [petId],
    );
    return res.rows;
  }

  async addDocument(petId: string, userId: string, dto: CreateMedicalDocumentDto, ipAddress?: string) {
    await this.petsService.verifyPetAccess(petId, userId, false);
    const res = await this.db.query(
      `INSERT INTO public.pet_medical_documents (
         pet_id, uploaded_by, document_type, file_name, storage_path, mime_type, file_size_bytes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        petId,
        userId,
        dto.documentType,
        dto.fileName.trim(),
        dto.storagePath.trim(),
        dto.mimeType || null,
        dto.fileSizeBytes || null,
      ],
      { userId, ipAddress },
    );
    return res.rows[0];
  }
}
