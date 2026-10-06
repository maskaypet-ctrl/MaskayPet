import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface QueryOptions {
  userId?: string;
  ipAddress?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

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

      client.release();
    } catch (err) {
      this.logger.warn(`PostgreSQL initial connection check warning: ${err.message}. Ready for connection once available.`);
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
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
}
