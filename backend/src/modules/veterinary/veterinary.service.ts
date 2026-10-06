import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class VeterinaryService {
  constructor(private readonly db: DatabaseService) {}

  async getClinics() {
    const res = await this.db.query(
      `SELECT * FROM public.clinics ORDER BY is_partner DESC, name ASC`,
    );
    return res.rows;
  }

  async getVeterinarians(clinicId?: string) {
    if (clinicId) {
      const res = await this.db.query(
        `SELECT v.*, c.name as clinic_name 
         FROM public.veterinarians v
         LEFT JOIN public.clinics c ON c.id = v.clinic_id
         WHERE v.clinic_id = $1 ORDER BY v.full_name ASC`,
        [clinicId],
      );
      return res.rows;
    }

    const res = await this.db.query(
      `SELECT v.*, c.name as clinic_name 
       FROM public.veterinarians v
       LEFT JOIN public.clinics c ON c.id = v.clinic_id
       ORDER BY v.full_name ASC`,
    );
    return res.rows;
  }
}
