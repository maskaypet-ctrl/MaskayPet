import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async getAuditLogs(tableName?: string, recordId?: string, limit = 50) {
    if (tableName && recordId) {
      const res = await this.db.query(
        `SELECT a.*, u.first_name, u.last_name
         FROM audit.audit_logs a
         LEFT JOIN public.users u ON u.id = a.changed_by
         WHERE a.table_name = $1 AND a.record_id = $2
         ORDER BY a.changed_at DESC
         LIMIT $3`,
        [tableName, recordId, limit],
      );
      return res.rows;
    }

    const res = await this.db.query(
      `SELECT a.*, u.first_name, u.last_name
       FROM audit.audit_logs a
       LEFT JOIN public.users u ON u.id = a.changed_by
       ORDER BY a.changed_at DESC
       LIMIT $1`,
      [limit],
    );
    return res.rows;
  }
}
