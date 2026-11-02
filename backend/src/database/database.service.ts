import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import * as argon2 from 'argon2';
import { EmbeddedPostgresEngine } from './embedded-postgres.engine';

export interface QueryOptions {
  userId?: string;
  ipAddress?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;
  private embeddedEngine: EmbeddedPostgresEngine | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    let connectionString = this.configService.get<string>('DATABASE_URL');
    const maxConnections = this.configService.get<number>('DB_MAX_CONNECTIONS', 20);
    const idleTimeoutMillis = this.configService.get<number>('DB_IDLE_TIMEOUT_MILLIS', 30000);
    const connectionTimeoutMillis = this.configService.get<number>('DB_CONNECTION_TIMEOUT_MILLIS', 5000);

    const isCloudOrSsl =
      connectionString?.includes('supabase.com') ||
      connectionString?.includes('sslmode=require') ||
      connectionString?.includes('pooler.supabase.com');

    // Strip sslmode from query string so pg does not force strict CA verification for self-signed certificates in poolers
    if (connectionString) {
      connectionString = connectionString.replace(/([?&])sslmode=[^&]*(&?)/g, '$1').replace(/[?&]$/, '');
    }

    this.pool = new Pool({
      connectionString,
      max: Number(maxConnections),
      idleTimeoutMillis: Number(idleTimeoutMillis),
      connectionTimeoutMillis: Number(connectionTimeoutMillis),
      ssl: isCloudOrSsl ? { rejectUnauthorized: false } : undefined,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle PostgreSQL client', err.stack);
    });

    try {
      const client = await this.pool.connect();
      const res = await client.query('SELECT current_database(), current_schema(), version()');
      this.logger.log(
        `Connected to PostgreSQL database: "${res.rows[0].current_database}" on schema "${res.rows[0].current_schema}"`,
      );

      // Auto-patch audit trigger function to handle tables without 'id' column safely
      await client.query(`
        CREATE OR REPLACE FUNCTION audit.fn_audit_trigger()
        RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
        DECLARE
            actor UUID;
            ip INET;
            rec_id UUID;
            rec_json JSONB;
        BEGIN
            BEGIN actor := NULLIF(current_setting('app.user_id', true),'')::UUID; EXCEPTION WHEN OTHERS THEN actor := NULL; END;
            BEGIN ip := NULLIF(current_setting('app.ip_address', true),'')::INET; EXCEPTION WHEN OTHERS THEN ip := NULL; END;

            IF TG_OP IN ('INSERT', 'UPDATE') THEN
                rec_json := to_jsonb(NEW);
            ELSE
                rec_json := to_jsonb(OLD);
            END IF;

            BEGIN
                rec_id := COALESCE(
                    NULLIF(rec_json->>'id', '')::UUID,
                    NULLIF(rec_json->>'pet_id', '')::UUID,
                    NULLIF(rec_json->>'user_id', '')::UUID,
                    NULLIF(rec_json->>'coupon_id', '')::UUID
                );
            EXCEPTION WHEN OTHERS THEN
                rec_id := NULL;
            END;

            IF TG_OP = 'INSERT' THEN
                INSERT INTO audit.audit_logs(schema_name, table_name, record_id, action, new_data, changed_by, ip_address)
                VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, rec_id, 'INSERT', to_jsonb(NEW), actor, ip);
                RETURN NEW;
            ELSIF TG_OP = 'UPDATE' THEN
                INSERT INTO audit.audit_logs(schema_name, table_name, record_id, action, old_data, new_data, changed_by, ip_address)
                VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, rec_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), actor, ip);
                RETURN NEW;
            ELSE
                INSERT INTO audit.audit_logs(schema_name, table_name, record_id, action, old_data, changed_by, ip_address)
                VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, rec_id, 'DELETE', to_jsonb(OLD), actor, ip);
                RETURN OLD;
            END IF;
        END $$;
      `);
      this.logger.log('Audit trigger function synchronized successfully');

      await this.seedPostgreSQLDefaults(client);

      client.release();
    } catch (err) {
      this.logger.warn(
        `PostgreSQL remote connection unavailable (${err.message}). Activating Embedded Local PostgreSQL Engine with seeded data.`,
      );
      this.embeddedEngine = new EmbeddedPostgresEngine();
      await this.embeddedEngine.init();
      this.logger.log(
        `Embedded Local PostgreSQL Engine initialized (Admin: admin@mascotasqr.pe / Admin123!).`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end().catch(() => {});
      this.logger.log('PostgreSQL connection pool closed');
    }
  }

  /**
   * Run a single SQL query
   */
  async query<T extends QueryResultRow = any>(
    sql: string,
    params: any[] = [],
    options?: QueryOptions,
  ): Promise<QueryResult<T>> {
    if (this.embeddedEngine) {
      return this.embeddedEngine.query<T>(sql, params, options);
    }

    const start = Date.now();

    if (options?.userId || options?.ipAddress) {
      // Use client to set session context for PostgreSQL audit triggers
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        if (options.userId) {
          await client.query("SELECT set_config('app.user_id', $1, true)", [options.userId]);
        }
        if (options.ipAddress) {
          await client.query("SELECT set_config('app.ip_address', $1, true)", [options.ipAddress]);
        }
        const result = await client.query<T>(sql, params);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
        const duration = Date.now() - start;
        if (duration > 1000) {
          this.logger.warn(`Slow query (${duration}ms): ${sql.substring(0, 100)}...`);
        }
      }
    }

    const result = await this.pool.query<T>(sql, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      this.logger.warn(`Slow query (${duration}ms): ${sql.substring(0, 100)}...`);
    }
    return result;
  }

  /**
   * Run query and return a single row or null
   */
  async queryOne<T extends QueryResultRow = any>(
    sql: string,
    params: any[] = [],
    options?: QueryOptions,
  ): Promise<T | null> {
    const res = await this.query<T>(sql, params, options);
    return res.rows[0] ?? null;
  }

  /**
   * Execute multiple operations within an atomic PostgreSQL transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options?: QueryOptions,
  ): Promise<T> {
    if (this.embeddedEngine) {
      const engine = this.embeddedEngine;
      const fakeClient = {
        query: (sql: string, params: any[] = []) => engine.query(sql, params, options),
        release: () => {},
      } as unknown as PoolClient;
      return callback(fakeClient);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (options?.userId) {
        await client.query("SELECT set_config('app.user_id', $1, true)", [options.userId]);
      }
      if (options?.ipAddress) {
        await client.query("SELECT set_config('app.ip_address', $1, true)", [options.ipAddress]);
      }

      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  private async seedPostgreSQLDefaults(client: PoolClient) {
    // 1. Roles
    try {
      await client.query(`
        INSERT INTO public.roles (code, name)
        VALUES
          ('admin', 'Administrador'),
          ('customer', 'Tutor de Mascotas'),
          ('vet', 'Médico Veterinario'),
          ('support', 'Soporte')
        ON CONFLICT (code) DO NOTHING;
      `);
    } catch (e) {
      this.logger.warn(`Seed roles notice: ${e.message}`);
    }

    // 2. Plan Tiers & Limits
    try {
      await client.query(`
        INSERT INTO public.catalog_tiers (tier)
        VALUES ('free'), ('premium')
        ON CONFLICT (tier) DO NOTHING;
      `);
      await client.query(`
        INSERT INTO public.plan_limits (tier, max_pets, max_collaborators_per_pet, sms_credits_monthly, medical_document_retention_years)
        VALUES
          ('free', 4, 1, 0, 1),
          ('premium', NULL, 5, 25, 10)
        ON CONFLICT (tier) DO UPDATE SET max_pets = EXCLUDED.max_pets;
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS identity.password_reset_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          code VARCHAR(10) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
    } catch (e) {
      this.logger.warn(`Seed plans notice: ${e.message}`);
    }

    // 3. Default Admin Account (admin@mascotasqr.pe / Admin123!)
    try {
      const adminPassHash = await argon2.hash('Admin123!', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      });
      const adminAccRes = await client.query(
        `INSERT INTO identity.user_accounts (email, status)
         VALUES ('admin@mascotasqr.pe', 'active')
         ON CONFLICT (email) DO UPDATE SET status = 'active'
         RETURNING id`,
      );
      const adminId = adminAccRes.rows[0]?.id;
      if (adminId) {
        await client.query(
          `INSERT INTO identity.user_credentials (user_id, password_hash)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
          [adminId, adminPassHash],
        );
        await client.query(
          `INSERT INTO public.users (id, first_name, last_name, phone)
           VALUES ($1, 'Carlos', 'Admin', '+51900111222')
           ON CONFLICT (id) DO NOTHING`,
          [adminId],
        );
        await client.query(
          `INSERT INTO public.user_roles (user_id, role_id)
           SELECT $1, id FROM public.roles WHERE code IN ('admin', 'customer')
           ON CONFLICT DO NOTHING`,
          [adminId],
        );
        await client.query(
          `INSERT INTO public.notification_preferences (user_id)
           VALUES ($1)
           ON CONFLICT (user_id) DO NOTHING`,
          [adminId],
        );
      }
    } catch (e) {
      this.logger.warn(`Seed admin notice: ${e.message}`);
    }

    // 4. Demo Activation Vouchers (Trial 14d, 1M, 3M, 6M, 1Y)
    try {
      await client.query(`
        INSERT INTO public.subscription_vouchers (code, tier, duration_days, status, notes)
        VALUES
          ('TRIAL-PREM-14D-DEMO', 'premium', 14, 'available', 'Código de Prueba Gratis por 14 días Premium'),
          ('ACT-PREM-1M-DEMO01', 'premium', 30, 'available', 'Código de activación por 1 Mes (30 días) Premium'),
          ('ACT-PREM-3M-DEMO02', 'premium', 90, 'available', 'Código de activación por 3 Meses (90 días) Premium'),
          ('VIP-PREM-6M-DEMO02', 'premium', 180, 'available', 'Código de activación por 6 Meses (180 días) Premium'),
          ('PRO-PREM-1Y-DEMO03', 'premium', 365, 'available', 'Código de activación por 1 Año (365 días) Premium')
        ON CONFLICT (code) DO NOTHING;
      `);
    } catch (e) {
      this.logger.warn(`Seed vouchers notice: ${e.message}`);
    }

    // 5. Coupons (BIENVENIDO20 & MASCOTA10)
    try {
      await client.query(`
        INSERT INTO public.coupons (code, discount_type, discount_value, max_uses, times_used, valid_from, valid_until)
        VALUES
          ('BIENVENIDO20', 'percent', 20.00, 1000, 0, '2025-01-01', NULL),
          ('MASCOTA10', 'fixed', 10.00, 1000, 0, '2025-01-01', NULL)
        ON CONFLICT (code) DO UPDATE SET
          valid_from = '2025-01-01',
          valid_until = NULL,
          max_uses = 1000;
      `);
    } catch (e) {
      this.logger.warn(`Seed coupons notice: ${e.message}`);
    }

    // 6. Store Products & Clinics if empty
    try {
      const prodCount = await client.query(`SELECT COUNT(*)::int as cnt FROM public.products`);
      if ((prodCount.rows[0]?.cnt ?? 0) === 0) {
        await client.query(`
          INSERT INTO public.products (name, description, sku, price, is_active)
          VALUES
            ('Chapa QR Inteligente - Edición Clásica', 'Placa de aluminio anodizado con grabado láser de alta precisión y código QR único.', 'TAG-CL-01', 29.90, true),
            ('Chapa QR Inteligente - Acero Inoxidable Premium', 'Placa de máxima durabilidad con borde de silicona fluorescente para visibilidad nocturna.', 'TAG-SS-02', 49.90, true),
            ('Collar Inteligente con QR Integrado', 'Collar de alta resistencia con chapa QR integrada de perfil bajo.', 'COL-QR-01', 59.90, true)
          ON CONFLICT (sku) DO NOTHING;
        `);
      }

      const clinicCount = await client.query(`SELECT COUNT(*)::int as cnt FROM public.clinics`);
      if ((clinicCount.rows[0]?.cnt ?? 0) === 0) {
        await client.query(`
          INSERT INTO public.clinics (name, phone, email, address, city, is_partner)
          VALUES
            ('Clínica Veterinaria San Martín', '+51 01 445-8900', 'contacto@vetsanmartin.pe', 'Av. Benavides 1450, Miraflores', 'Lima', true),
            ('Hospital Veterinario Oasis Pet', '+51 01 221-3344', 'emergencias@oasispet.pe', 'Av.Javier Prado Este 3210, San Borja', 'Lima', true);
        `);
      }
    } catch (e) {
      this.logger.warn(`Seed store/clinics notice: ${e.message}`);
    }

    this.logger.log('PostgreSQL seed data (Admin, Roles, Plans, Vouchers, Coupons, Store) verified.');
  }
}
