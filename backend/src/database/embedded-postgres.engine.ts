import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as argon2 from 'argon2';
import { QueryResult, QueryResultRow } from 'pg';

interface TableStore {
  // identity
  'identity.user_accounts': any[];
  'identity.user_credentials': any[];
  'identity.sessions': any[];
  'identity.password_reset_codes': any[];
  // public
  'public.users': any[];
  'public.roles': any[];
  'public.user_roles': any[];
  'public.notification_preferences': any[];
  'public.device_tokens': any[];
  'public.notifications': any[];
  'public.reminders': any[];
  'public.catalog_tiers': any[];
  'public.plan_limits': any[];
  'public.subscriptions': any[];
  'public.payments': any[];
  'public.subscription_vouchers': any[];
  'public.pets': any[];
  'public.pet_public_profiles': any[];
  'public.pet_contacts': any[];
  'public.pet_collaborators': any[];
  'public.tag_production_batches': any[];
  'public.qr_tags': any[];
  'public.qr_tag_assignments': any[];
  'public.profile_scan_events': any[];
  'public.lost_mode_events': any[];
  'public.location_pings': any[];
  'public.pet_vaccinations': any[];
  'public.pet_deworming': any[];
  'public.pet_treatments': any[];
  'public.pet_diagnoses': any[];
  'public.pet_weight_records': any[];
  'public.appointments': any[];
  'public.pet_medical_documents': any[];
  'public.products': any[];
  'public.coupons': any[];
  'public.coupon_redemptions': any[];
  'public.orders': any[];
  'public.order_items': any[];
  'public.clinics': any[];
  'public.veterinarians': any[];
  // audit
  'audit.audit_logs': any[];
}

export class EmbeddedPostgresEngine {
  private store: TableStore;
  private readonly persistPath: string;
  private currentUserId: string | null = null;
  private currentIp: string | null = null;

  constructor(persistFilePath?: string) {
    this.persistPath =
      persistFilePath || path.join(process.cwd(), '.data', 'maskaypet-local-db.json');
    this.store = this.createEmptyStore();
  }

  private createEmptyStore(): TableStore {
    return {
      'identity.user_accounts': [],
      'identity.user_credentials': [],
      'identity.sessions': [],
      'identity.password_reset_codes': [],
      'public.users': [],
      'public.roles': [],
      'public.user_roles': [],
      'public.notification_preferences': [],
      'public.device_tokens': [],
      'public.notifications': [],
      'public.reminders': [],
      'public.catalog_tiers': [],
      'public.plan_limits': [],
      'public.subscriptions': [],
      'public.payments': [],
      'public.subscription_vouchers': [],
      'public.pets': [],
      'public.pet_public_profiles': [],
      'public.pet_contacts': [],
      'public.pet_collaborators': [],
      'public.tag_production_batches': [],
      'public.qr_tags': [],
      'public.qr_tag_assignments': [],
      'public.profile_scan_events': [],
      'public.lost_mode_events': [],
      'public.location_pings': [],
      'public.pet_vaccinations': [],
      'public.pet_deworming': [],
      'public.pet_treatments': [],
      'public.pet_diagnoses': [],
      'public.pet_weight_records': [],
      'public.appointments': [],
      'public.pet_medical_documents': [],
      'public.products': [],
      'public.coupons': [],
      'public.coupon_redemptions': [],
      'public.orders': [],
      'public.order_items': [],
      'public.clinics': [],
      'public.veterinarians': [],
      'audit.audit_logs': [],
    };
  }

  async init(): Promise<void> {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, 'utf-8');
        const loaded = JSON.parse(raw);
        this.store = { ...this.createEmptyStore(), ...loaded };
      }
    } catch {
      this.store = this.createEmptyStore();
    }

    await this.ensureSeeds();
    this.saveToDisk();
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.persistPath, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch {
      // Ignore disk write errors in restricted environments
    }
  }

  private uuid(): string {
    return crypto.randomUUID();
  }

  private now(): string {
    return new Date().toISOString();
  }

  private recordAudit(
    schemaName: string,
    tableName: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    record: any,
    oldRecord?: any,
  ) {
    const recId =
      record?.id || record?.pet_id || record?.user_id || record?.coupon_id || this.uuid();
    this.store['audit.audit_logs'].unshift({
      id: this.uuid(),
      schema_name: schemaName,
      table_name: tableName,
      record_id: recId,
      action,
      old_data: oldRecord || null,
      new_data: action === 'DELETE' ? null : record,
      changed_by: this.currentUserId,
      ip_address: this.currentIp,
      changed_at: this.now(),
    });
  }

  private async ensureSeeds(): Promise<void> {
    // 1. Roles
    if (this.store['public.roles'].length === 0) {
      this.store['public.roles'].push(
        { id: '00000000-0000-0000-0000-0000000000a1', code: 'customer', name: 'Customer' },
        { id: '00000000-0000-0000-0000-0000000000a2', code: 'admin', name: 'Administrator' },
        { id: '00000000-0000-0000-0000-0000000000a3', code: 'production_manager', name: 'Production Manager' },
        { id: '00000000-0000-0000-0000-0000000000a4', code: 'support', name: 'Support' },
      );
    }

    // 2. Catalog tiers & plan limits
    if (this.store['public.catalog_tiers'].length === 0) {
      this.store['public.catalog_tiers'].push({ tier: 'free' }, { tier: 'premium' });
    }
    if (this.store['public.plan_limits'].length === 0) {
      this.store['public.plan_limits'].push(
        {
          tier: 'free',
          max_pets: 4,
          max_collaborators_per_pet: 1,
          sms_credits_monthly: 0,
          medical_document_retention_years: 1,
        },
        {
          tier: 'premium',
          max_pets: null,
          max_collaborators_per_pet: 5,
          sms_credits_monthly: 10,
          medical_document_retention_years: 10,
        },
      );
    } else {
      const freeLim = this.store['public.plan_limits'].find((l) => l.tier === 'free');
      if (freeLim && freeLim.max_pets === 1) {
        freeLim.max_pets = 4;
      }
    }

    // 3. Products
    if (this.store['public.products'].length === 0) {
      this.store['public.products'].push(
        {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Chapa QR Inteligente - Aluminio Anodizado',
          description: 'Placa de identificación ultraligera y resistente al agua con grabado láser indeleble.',
          sku: 'TAG-ALU-01',
          price: '29.90',
          is_active: true,
          created_at: this.now(),
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          name: 'Chapa QR Inteligente - Acero Inoxidable Premium',
          description: 'Placa de máxima durabilidad con borde de silicona fluorescente para visibilidad nocturna.',
          sku: 'TAG-SS-02',
          price: '49.90',
          is_active: true,
          created_at: this.now(),
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          name: 'Collar Inteligente con QR Integrado',
          description: 'Collar de alta resistencia con chapa QR integrada de perfil bajo.',
          sku: 'COL-QR-01',
          price: '59.90',
          is_active: true,
          created_at: this.now(),
        },
      );
    }

    // 4. Production Batches & QR Tags
    if (this.store['public.tag_production_batches'].length === 0) {
      this.store['public.tag_production_batches'].push({
        id: '00000000-0000-0000-0000-000000000010',
        batch_code: 'BATCH-2026-001',
        quantity: 10,
        created_by: null,
        notes: 'Lote inicial de pruebas para desarrollo local y demo',
        created_at: this.now(),
      });
    }
    if (this.store['public.qr_tags'].length === 0) {
      this.store['public.qr_tags'].push(
        {
          id: '00000000-0000-0000-0000-000000000101',
          production_batch_id: '00000000-0000-0000-0000-000000000010',
          public_code: 'PET-QR-DEMO01',
          status: 'available',
          created_at: this.now(),
        },
        {
          id: '00000000-0000-0000-0000-000000000102',
          production_batch_id: '00000000-0000-0000-0000-000000000010',
          public_code: 'PET-QR-DEMO02',
          status: 'available',
          created_at: this.now(),
        },
        {
          id: '00000000-0000-0000-0000-000000000103',
          production_batch_id: '00000000-0000-0000-0000-000000000010',
          public_code: 'PET-QR-DEMO03',
          status: 'available',
          created_at: this.now(),
        },
      );
    }

    // 5. Subscription Vouchers (Ensure Demo Activation Codes for Trial, 1M, 3M, 6M, 1Y)
    const defaultVouchers = [
      {
        id: '00000000-0000-0000-0000-000000000200',
        code: 'TRIAL-PREM-14D-DEMO',
        tier: 'premium',
        duration_days: 14,
        status: 'available',
        created_by: null,
        redeemed_by: null,
        redeemed_at: null,
        expires_at: null,
        notes: 'Código de Prueba Gratis por 14 días Premium',
        created_at: this.now(),
      },
      {
        id: '00000000-0000-0000-0000-000000000201',
        code: 'ACT-PREM-1M-DEMO01',
        tier: 'premium',
        duration_days: 30,
        status: 'available',
        created_by: null,
        redeemed_by: null,
        redeemed_at: null,
        expires_at: null,
        notes: 'Código de activación por 1 Mes (30 días) Premium',
        created_at: this.now(),
      },
      {
        id: '00000000-0000-0000-0000-000000000204',
        code: 'ACT-PREM-3M-DEMO02',
        tier: 'premium',
        duration_days: 90,
        status: 'available',
        created_by: null,
        redeemed_by: null,
        redeemed_at: null,
        expires_at: null,
        notes: 'Código de activación por 3 Meses (90 días) Premium',
        created_at: this.now(),
      },
      {
        id: '00000000-0000-0000-0000-000000000202',
        code: 'VIP-PREM-6M-DEMO02',
        tier: 'premium',
        duration_days: 180,
        status: 'available',
        created_by: null,
        redeemed_by: null,
        redeemed_at: null,
        expires_at: null,
        notes: 'Código de activación por 6 Meses (180 días) Premium',
        created_at: this.now(),
      },
      {
        id: '00000000-0000-0000-0000-000000000203',
        code: 'PRO-PREM-1Y-DEMO03',
        tier: 'premium',
        duration_days: 365,
        status: 'available',
        created_by: null,
        redeemed_by: null,
        redeemed_at: null,
        expires_at: null,
        notes: 'Código de activación por 1 Año (365 días) Premium',
        created_at: this.now(),
      },
    ];
    for (const dv of defaultVouchers) {
      if (!this.store['public.subscription_vouchers'].some((v) => v.code === dv.code)) {
        this.store['public.subscription_vouchers'].push(dv);
      }
    }

    // 6. Coupons
    if (this.store['public.coupons'].length === 0) {
      this.store['public.coupons'].push(
        {
          id: '00000000-0000-0000-0000-000000000401',
          code: 'BIENVENIDO20',
          discount_type: 'percent',
          discount_value: '20.00',
          max_uses: 100,
          times_used: 0,
          valid_from: '2025-01-01',
          valid_until: null,
        },
        {
          id: '00000000-0000-0000-0000-000000000402',
          code: 'MASCOTA10',
          discount_type: 'fixed',
          discount_value: '10.00',
          max_uses: 50,
          times_used: 0,
          valid_from: '2025-01-01',
          valid_until: null,
        },
      );
    }

    // 7. Clinics & Veterinarians
    if (this.store['public.clinics'].length === 0) {
      this.store['public.clinics'].push(
        {
          id: '00000000-0000-0000-0000-000000000301',
          name: 'Clínica Veterinaria San Martín',
          city: 'Lima',
          address: 'Av. Benavides 1230, Miraflores',
          phone: '+51 987 654 321',
          is_partner: true,
        },
        {
          id: '00000000-0000-0000-0000-000000000302',
          name: 'Hospital Veterinario 24 Horas PetCare',
          city: 'Lima',
          address: 'Av. Javier Prado Este 4500, Surco',
          phone: '+51 912 345 678',
          is_partner: true,
        },
      );
    }
    if (this.store['public.veterinarians'].length === 0) {
      this.store['public.veterinarians'].push({
        id: '00000000-0000-0000-0000-000000000351',
        clinic_id: '00000000-0000-0000-0000-000000000301',
        full_name: 'Dra. Elena Vargas',
        license_number: 'CMVP-8842',
        specialty: 'Medicina Interna',
        phone: '+51 987 654 321',
      });
    }

    // 8. Default Admin Account (admin@mascotasqr.pe / Admin123!)
    const adminEmail = 'admin@mascotasqr.pe';
    if (!this.store['identity.user_accounts'].some((a) => a.email === adminEmail)) {
      const adminId = '00000000-0000-0000-0000-000000000999';
      const hash = await argon2.hash('Admin123!', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      });
      this.store['identity.user_accounts'].push({
        id: adminId,
        email: adminEmail,
        status: 'active',
        email_verified_at: this.now(),
        last_login_at: null,
        created_at: this.now(),
        updated_at: this.now(),
      });
      this.store['identity.user_credentials'].push({
        user_id: adminId,
        password_hash: hash,
        failed_attempts: 0,
        locked_until: null,
        updated_at: this.now(),
      });
      this.store['public.users'].push({
        id: adminId,
        first_name: 'Admin',
        last_name: 'MaskayPet',
        phone: '+51999000111',
        avatar_storage_path: null,
        created_at: this.now(),
        updated_at: this.now(),
      });
      this.store['public.user_roles'].push(
        { user_id: adminId, role_id: '00000000-0000-0000-0000-0000000000a1' },
        { user_id: adminId, role_id: '00000000-0000-0000-0000-0000000000a2' },
      );
      this.store['public.notification_preferences'].push({
        user_id: adminId,
        push_enabled: true,
        email_enabled: true,
        sms_enabled: false,
        lost_pet_alerts: true,
        vaccine_reminders: true,
        treatment_reminders: true,
        appointment_reminders: true,
        updated_at: this.now(),
      });
    }
  }

  private makeResult<T extends QueryResultRow = any>(rows: T[]): QueryResult<T> {
    return {
      command: 'SELECT',
      rowCount: rows.length,
      oid: 0,
      rows,
      fields: [],
    };
  }

  async query<T extends QueryResultRow = any>(
    rawSql: string,
    params: any[] = [],
    options?: { userId?: string; ipAddress?: string },
  ): Promise<QueryResult<T>> {
    if (options?.userId) this.currentUserId = options.userId;
    if (options?.ipAddress) this.currentIp = options.ipAddress;

    const sql = rawSql.replace(/\s+/g, ' ').trim();
    const res = this.executeSql(sql, params);
    if (/^(INSERT|UPDATE|DELETE)\b/i.test(sql)) {
      this.saveToDisk();
    }
    return this.makeResult<T>(res);
  }

  private executeSql(sql: string, params: any[]): any[] {
    // Transaction / session config no-ops
    if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(sql)) return [];
    if (/^SELECT set_config\(/i.test(sql)) {
      if (sql.includes("'app.user_id'")) this.currentUserId = params[0] || null;
      if (sql.includes("'app.ip_address'")) this.currentIp = params[0] || null;
      return [];
    }
    if (/^SELECT current_database\(\)/i.test(sql)) {
      return [{ current_database: 'maskaypet_embedded', current_schema: 'public', version: 'PostgreSQL 16 (Embedded Fallback)' }];
    }
    if (/^CREATE OR REPLACE FUNCTION/i.test(sql)) return [];

    // ------------------------------------------------------------------------
    // 1. IDENTITY & AUTH QUERIES
    // ------------------------------------------------------------------------
    if (sql === 'SELECT id FROM identity.user_accounts WHERE email = $1') {
      return this.store['identity.user_accounts']
        .filter((a) => a.email === params[0])
        .map((a) => ({ id: a.id }));
    }

    if (sql.startsWith('INSERT INTO identity.user_accounts (email, status)')) {
      const rec = {
        id: this.uuid(),
        email: params[0],
        status: 'active',
        email_verified_at: null,
        last_login_at: null,
        created_at: this.now(),
        updated_at: this.now(),
      };
      this.store['identity.user_accounts'].push(rec);
      return [rec];
    }

    if (sql.startsWith('INSERT INTO identity.user_credentials (user_id, password_hash)')) {
      const rec = {
        user_id: params[0],
        password_hash: params[1],
        failed_attempts: 0,
        locked_until: null,
        updated_at: this.now(),
      };
      this.store['identity.user_credentials'].push(rec);
      return [rec];
    }

    if (sql.startsWith('INSERT INTO public.users (id, first_name, last_name, phone)')) {
      const rec = {
        id: params[0],
        first_name: params[1],
        last_name: params[2],
        phone: params[3],
        avatar_storage_path: null,
        created_at: this.now(),
        updated_at: this.now(),
      };
      this.store['public.users'].push(rec);
      this.recordAudit('public', 'users', 'INSERT', rec);
      return [rec];
    }

    if (sql === "SELECT id FROM public.roles WHERE code = 'customer'") {
      return this.store['public.roles'].filter((r) => r.code === 'customer').map((r) => ({ id: r.id }));
    }

    if (sql.startsWith('INSERT INTO public.user_roles (user_id, role_id)')) {
      const exists = this.store['public.user_roles'].some(
        (ur) => ur.user_id === params[0] && ur.role_id === params[1],
      );
      if (!exists) {
        this.store['public.user_roles'].push({ user_id: params[0], role_id: params[1] });
      }
      return [];
    }

    if (sql.startsWith('INSERT INTO public.notification_preferences (user_id)')) {
      let pref = this.store['public.notification_preferences'].find((p) => p.user_id === params[0]);
      if (!pref) {
        pref = {
          user_id: params[0],
          push_enabled: true,
          email_enabled: true,
          sms_enabled: false,
          lost_pet_alerts: true,
          vaccine_reminders: true,
          treatment_reminders: true,
          appointment_reminders: true,
          updated_at: this.now(),
        };
        this.store['public.notification_preferences'].push(pref);
      }
      return [pref];
    }

    if (sql.startsWith('INSERT INTO identity.sessions')) {
      const hasDeviceName = sql.includes('device_name');
      const rec = {
        id: this.uuid(),
        user_id: params[0],
        refresh_token_hash: params[1],
        ip_address: params[2],
        user_agent: params[3],
        device_name: hasDeviceName ? params[4] : null,
        expires_at: (hasDeviceName ? params[5] : params[4]) instanceof Date
          ? (hasDeviceName ? params[5] : params[4]).toISOString()
          : (hasDeviceName ? params[5] : params[4]),
        revoked_at: null,
        created_at: this.now(),
      };
      this.store['identity.sessions'].push(rec);
      return [rec];
    }

    if (sql.includes('FROM identity.user_accounts a JOIN identity.user_credentials c') && sql.includes('WHERE a.email = $1')) {
      const acc = this.store['identity.user_accounts'].find((a) => a.email === params[0]);
      if (!acc) return [];
      const cred = this.store['identity.user_credentials'].find((c) => c.user_id === acc.id);
      const usr = this.store['public.users'].find((u) => u.id === acc.id);
      if (!cred || !usr) return [];
      return [
        {
          id: acc.id,
          email: acc.email,
          status: acc.status,
          password_hash: cred.password_hash,
          failed_attempts: cred.failed_attempts,
          locked_until: cred.locked_until,
          first_name: usr.first_name,
          last_name: usr.last_name,
          phone: usr.phone,
          avatar_storage_path: usr.avatar_storage_path,
        },
      ];
    }

    if (sql.startsWith('UPDATE identity.user_credentials SET failed_attempts = $1')) {
      const cred = this.store['identity.user_credentials'].find((c) => c.user_id === params[2]);
      if (cred) {
        cred.failed_attempts = params[0];
        cred.locked_until = params[1] ? new Date(params[1]).toISOString() : null;
        cred.updated_at = this.now();
      }
      return [];
    }

    if (sql.startsWith('UPDATE identity.user_credentials SET failed_attempts = 0')) {
      const cred = this.store['identity.user_credentials'].find((c) => c.user_id === params[0]);
      if (cred) {
        cred.failed_attempts = 0;
        cred.locked_until = null;
        cred.updated_at = this.now();
      }
      return [];
    }

    if (sql === 'SELECT password_hash FROM identity.user_credentials WHERE user_id = $1') {
      const cred = this.store['identity.user_credentials'].find((c) => c.user_id === params[0]);
      return cred ? [{ password_hash: cred.password_hash }] : [];
    }

    if (sql.startsWith('UPDATE identity.user_credentials SET password_hash = $1')) {
      const cred = this.store['identity.user_credentials'].find((c) => c.user_id === params[1]);
      if (cred) {
        cred.password_hash = params[0];
        cred.updated_at = this.now();
      }
      return [];
    }

    if (sql === 'SELECT id, email FROM identity.user_accounts WHERE id = $1') {
      const acc = this.store['identity.user_accounts'].find((a) => a.id === params[0]);
      return acc ? [{ id: acc.id, email: acc.email }] : [];
    }

    if (sql === 'SELECT id, email FROM identity.user_accounts WHERE email = $1') {
      const acc = this.store['identity.user_accounts'].find((a) => a.email === params[0]);
      return acc ? [{ id: acc.id, email: acc.email }] : [];
    }

    if (sql.startsWith('INSERT INTO identity.password_reset_codes (email, code, expires_at)')) {
      const rec = {
        id: this.uuid(),
        email: params[0],
        code: params[1],
        expires_at: params[2] instanceof Date ? params[2].toISOString() : params[2],
        used_at: null,
        created_at: this.now(),
      };
      this.store['identity.password_reset_codes'].unshift(rec);
      return [rec];
    }

    if (sql.includes('FROM identity.password_reset_codes WHERE email = $1 AND code = $2 AND used_at IS NULL')) {
      const nowMs = Date.now();
      const found = this.store['identity.password_reset_codes'].find(
        (r) =>
          r.email === params[0] &&
          r.code === params[1] &&
          !r.used_at &&
          new Date(r.expires_at).getTime() > nowMs,
      );
      return found ? [found] : [];
    }

    if (sql === 'UPDATE identity.password_reset_codes SET used_at = now() WHERE id = $1') {
      const found = this.store['identity.password_reset_codes'].find((r) => r.id === params[0]);
      if (found) {
        found.used_at = this.now();
      }
      return [];
    }

    if (sql.includes('SELECT COUNT(DISTINCT a.pet_id) as active_qr_count FROM public.qr_tag_assignments a JOIN public.pets p ON p.id = a.pet_id WHERE p.owner_id = $1')) {
      const ownerPets = new Set(
        this.store['public.pets']
          .filter((p) => p.owner_id === params[0] && p.status !== 'archived')
          .map((p) => p.id),
      );
      const activePetIds = new Set(
        this.store['public.qr_tag_assignments']
          .filter((a) => !a.unassigned_at && ownerPets.has(a.pet_id))
          .map((a) => a.pet_id),
      );
      return [{ active_qr_count: String(activePetIds.size) }];
    }

    if (sql.startsWith('UPDATE identity.user_accounts SET last_login_at = now()')) {
      const acc = this.store['identity.user_accounts'].find((a) => a.id === params[0]);
      if (acc) {
        acc.last_login_at = this.now();
        acc.updated_at = this.now();
      }
      return [];
    }

    if (sql.includes('SELECT r.code FROM public.roles r JOIN public.user_roles ur')) {
      const roleIds = this.store['public.user_roles']
        .filter((ur) => ur.user_id === params[0])
        .map((ur) => ur.role_id);
      return this.store['public.roles']
        .filter((r) => roleIds.includes(r.id))
        .map((r) => ({ code: r.code }));
    }

    if (sql.includes('FROM identity.sessions s JOIN identity.user_accounts a') && sql.includes('WHERE s.refresh_token_hash = $1')) {
      const s = this.store['identity.sessions'].find((sess) => sess.refresh_token_hash === params[0]);
      if (!s) return [];
      const a = this.store['identity.user_accounts'].find((acc) => acc.id === s.user_id);
      const u = this.store['public.users'].find((usr) => usr.id === s.user_id);
      if (!a || !u) return [];
      return [
        {
          id: s.id,
          user_id: s.user_id,
          expires_at: s.expires_at,
          revoked_at: s.revoked_at,
          email: a.email,
          status: a.status,
          first_name: u.first_name,
          last_name: u.last_name,
        },
      ];
    }

    if (sql.startsWith('UPDATE identity.sessions SET revoked_at = now() WHERE id = $1')) {
      const s = this.store['identity.sessions'].find((sess) => sess.id === params[0]);
      if (s) s.revoked_at = this.now();
      return [];
    }

    if (sql.startsWith('UPDATE identity.sessions SET revoked_at = now() WHERE refresh_token_hash = $1')) {
      const s = this.store['identity.sessions'].find((sess) => sess.refresh_token_hash === params[0]);
      if (s) s.revoked_at = this.now();
      return [];
    }

    // ------------------------------------------------------------------------
    // 2. USERS & PROFILE QUERIES (INCLUDING JWT STRATEGY)
    // ------------------------------------------------------------------------
    if (
      sql.includes('FROM public.users u JOIN identity.user_accounts a ON a.id = u.id WHERE u.id = $1') ||
      sql.includes('FROM identity.user_accounts a JOIN public.users u ON u.id = a.id WHERE a.id = $1')
    ) {
      const u = this.store['public.users'].find((usr) => usr.id === params[0]);
      const a = this.store['identity.user_accounts'].find((acc) => acc.id === params[0]);
      if (!u || !a) return [];
      return [
        {
          id: u.id,
          email: a.email,
          status: a.status,
          email_verified_at: a.email_verified_at,
          last_login_at: a.last_login_at,
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone,
          avatar_storage_path: u.avatar_storage_path,
          created_at: u.created_at,
          updated_at: u.updated_at,
        },
      ];
    }

    if (sql.startsWith('UPDATE public.users SET ')) {
      const userId = params[params.length - 1];
      const u = this.store['public.users'].find((usr) => usr.id === userId);
      if (!u) return [];
      const old = { ...u };
      this.applyDynamicSet(sql, params, u);
      u.updated_at = this.now();
      this.recordAudit('public', 'users', 'UPDATE', u, old);
      return [u];
    }

    // ------------------------------------------------------------------------
    // 3. NOTIFICATIONS & REMINDERS
    // ------------------------------------------------------------------------
    if (sql.includes('FROM public.notifications n LEFT JOIN public.pets p ON p.id = n.pet_id WHERE n.user_id = $1')) {
      return this.store['public.notifications']
        .filter((n) => n.user_id === params[0])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50)
        .map((n) => {
          const pet = this.store['public.pets'].find((p) => p.id === n.pet_id);
          return { ...n, pet_name: pet?.name || null };
        });
    }

    if (sql.startsWith('INSERT INTO public.notifications')) {
      const hasPetId = sql.includes('pet_id');
      const rec = {
        id: this.uuid(),
        user_id: params[0],
        pet_id: hasPetId ? params[1] : null,
        type: hasPetId ? params[2] : 'subscription_activated',
        title: hasPetId ? 'Alerta MaskayPet' : '¡Plan Activado con Éxito!',
        message: hasPetId ? params[2] : params[1],
        channel: 'in_app',
        priority: sql.includes("'critical'") ? 'critical' : sql.includes("'high'") ? 'high' : 'normal',
        status: 'unread',
        read_at: null,
        created_at: this.now(),
      };
      // Handle specific title/message positions
      if (sql.includes("'subscription_activated'")) {
        rec.type = 'subscription_activated';
        rec.title = '¡Plan Activado con Éxito!';
        rec.message = params[1];
      } else if (sql.includes("'lost_mode_activated'")) {
        rec.type = 'lost_mode_activated';
        rec.title = 'Modo Perdido Activado';
        rec.message = params[2];
      } else if (sql.includes("'lost_mode_resolved'")) {
        rec.type = 'lost_mode_resolved';
        rec.title = '¡Mascota Recuperada!';
        rec.message = params[2];
      } else if (sql.includes("'location_ping_received'")) {
        rec.type = 'location_ping_received';
        rec.title = '¡Nueva Ubicación de tu Mascota!';
        rec.message = params[2];
      }
      this.store['public.notifications'].unshift(rec);
      return [rec];
    }

    if (sql.startsWith("UPDATE public.notifications SET status = 'read'") && sql.includes('WHERE id = $1')) {
      const n = this.store['public.notifications'].find(
        (item) => item.id === params[0] && item.user_id === params[1],
      );
      if (!n) return [];
      n.status = 'read';
      n.read_at = this.now();
      return [n];
    }

    if (sql.startsWith("UPDATE public.notifications SET status = 'read'") && sql.includes('WHERE user_id = $1')) {
      this.store['public.notifications']
        .filter((item) => item.user_id === params[0] && item.status !== 'read')
        .forEach((item) => {
          item.status = 'read';
          item.read_at = this.now();
        });
      return [];
    }

    if (sql === 'SELECT * FROM public.notification_preferences WHERE user_id = $1') {
      return this.store['public.notification_preferences'].filter((p) => p.user_id === params[0]);
    }

    if (sql.startsWith('UPDATE public.notification_preferences SET ')) {
      const userId = params[params.length - 1];
      const pref = this.store['public.notification_preferences'].find((p) => p.user_id === userId);
      if (!pref) return [];
      this.applyDynamicSet(sql, params, pref);
      pref.updated_at = this.now();
      return [pref];
    }

    if (sql.startsWith('INSERT INTO public.device_tokens')) {
      let dt = this.store['public.device_tokens'].find((d) => d.token === params[1]);
      if (dt) {
        dt.user_id = params[0];
        dt.platform = params[2];
        dt.is_active = true;
        dt.last_seen_at = this.now();
      } else {
        dt = {
          id: this.uuid(),
          user_id: params[0],
          token: params[1],
          platform: params[2],
          is_active: true,
          last_seen_at: this.now(),
        };
        this.store['public.device_tokens'].push(dt);
      }
      return [dt];
    }

    if (sql.includes('FROM public.reminders r JOIN public.pets p ON p.id = r.pet_id')) {
      const cutoff = Date.now() - 86400000;
      return this.store['public.reminders']
        .filter(
          (r) =>
            r.user_id === params[0] &&
            r.status === 'pending' &&
            new Date(r.due_at).getTime() >= cutoff,
        )
        .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
        .slice(0, 30)
        .map((r) => {
          const pet = this.store['public.pets'].find((p) => p.id === r.pet_id);
          return { ...r, pet_name: pet?.name || 'Mascota' };
        });
    }

    if (sql.startsWith('INSERT INTO public.reminders')) {
      let type = 'custom';
      if (sql.includes("'vaccine'")) type = 'vaccine';
      else if (sql.includes("'deworming'")) type = 'deworming';
      else if (sql.includes("'appointment'")) type = 'appointment';

      const rec = {
        id: this.uuid(),
        user_id: params[0],
        pet_id: params[1],
        reminder_type: type,
        reference_id: params[2],
        title: params[3],
        message: params[4],
        due_at: params[5],
        status: 'pending',
        created_at: this.now(),
      };
      this.store['public.reminders'].push(rec);
      return [rec];
    }

    if (sql.startsWith('UPDATE public.reminders SET status = $1 WHERE reference_id = $2')) {
      this.store['public.reminders']
        .filter((r) => r.reference_id === params[1])
        .forEach((r) => {
          r.status = params[0];
        });
      return [];
    }

    // ------------------------------------------------------------------------
    // 4. SUBSCRIPTIONS & VOUCHERS
    // ------------------------------------------------------------------------
    if (sql.includes('FROM public.catalog_tiers t JOIN public.plan_limits l')) {
      return this.store['public.plan_limits'].map((l) => ({ ...l }));
    }

    if (sql.includes('FROM public.subscriptions s JOIN public.plan_limits l')) {
      const subs = this.store['public.subscriptions']
        .filter((s) => s.user_id === params[0] && ['trialing', 'active', 'past_due'].includes(s.status))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (subs.length === 0) return [];
      const sub = subs[0];
      const limits = this.store['public.plan_limits'].find((l) => l.tier === sub.tier) || {};
      return [{ ...sub, ...limits }];
    }

    if (sql.includes("FROM public.plan_limits WHERE tier = 'free'")) {
      return this.store['public.plan_limits'].filter((l) => l.tier === 'free');
    }

    if (sql.includes('SELECT max_pets FROM public.plan_limits WHERE tier = $1')) {
      return this.store['public.plan_limits']
        .filter((l) => l.tier === params[0])
        .map((l) => ({ max_pets: l.max_pets }));
    }

    if (sql.includes('SELECT max_collaborators_per_pet FROM public.plan_limits WHERE tier = $1')) {
      return this.store['public.plan_limits']
        .filter((l) => l.tier === params[0])
        .map((l) => ({ max_collaborators_per_pet: l.max_collaborators_per_pet }));
    }

    if (sql.startsWith("UPDATE public.subscriptions SET status = 'expired'")) {
      const sub = this.store['public.subscriptions'].find((s) => s.id === params[0]);
      if (sub) {
        sub.status = 'expired';
        sub.updated_at = this.now();
      }
      return [];
    }

    if (sql.includes('SELECT tier FROM public.subscriptions WHERE user_id = $1')) {
      return this.store['public.subscriptions']
        .filter((s) => s.user_id === params[0] && ['trialing', 'active', 'past_due'].includes(s.status))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 1)
        .map((s) => ({ tier: s.tier }));
    }

    if (sql.includes('SELECT id, tier, current_period_end, status FROM public.subscriptions WHERE user_id = $1')) {
      return this.store['public.subscriptions']
        .filter((s) => s.user_id === params[0] && ['trialing', 'active'].includes(s.status))
        .sort((a, b) => new Date(b.current_period_end).getTime() - new Date(a.current_period_end).getTime())
        .slice(0, 1);
    }

    if (sql.startsWith("UPDATE public.subscriptions SET status = 'canceled'")) {
      this.store['public.subscriptions']
        .filter((s) => s.user_id === params[0] && ['trialing', 'active', 'past_due'].includes(s.status))
        .forEach((s) => {
          s.status = 'canceled';
          s.canceled_at = this.now();
        });
      return [];
    }

    if (sql.startsWith('UPDATE public.subscriptions SET current_period_end = $1')) {
      const sub = this.store['public.subscriptions'].find((s) => s.id === params[1]);
      if (!sub) return [];
      sub.current_period_end = params[0] instanceof Date ? params[0].toISOString() : params[0];
      sub.status = 'active';
      sub.updated_at = this.now();
      return [sub];
    }

    if (sql.startsWith('SELECT * FROM public.payments WHERE user_id = $1')) {
      return this.store['public.payments']
        .filter((p) => p.user_id === params[0])
        .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
        .slice(0, 20);
    }

    if (sql.includes('FROM public.users u JOIN identity.user_accounts a ON a.id = u.id LEFT JOIN LATERAL')) {
      return this.store['public.users']
        .slice(0, 100)
        .map((u) => {
          const a = this.store['identity.user_accounts'].find((acc) => acc.id === u.id);
          const petsCount = this.store['public.pets'].filter(
            (p) => p.owner_id === u.id && p.status !== 'archived',
          ).length;
          const activeSubs = this.store['public.subscriptions']
            .filter((s) => s.user_id === u.id && ['trialing', 'active', 'past_due'].includes(s.status))
            .sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
          const sub = activeSubs[0];
          return {
            id: u.id,
            email: a?.email || '',
            account_status: a?.status || 'active',
            first_name: u.first_name,
            last_name: u.last_name,
            phone: u.phone,
            created_at: u.created_at,
            pets_count: petsCount,
            subscription_tier: sub?.tier || 'free',
            subscription_status: sub?.status || 'active',
            current_period_end: sub?.current_period_end || null,
            subscription_provider: sub?.provider || null,
            billing_cycle: sub?.provider_subscription_id || null,
          };
        });
    }

    if (sql.startsWith('INSERT INTO public.subscriptions')) {
      const isVoucher = sql.includes("'voucher'");
      const hasExplicitStatusParam = sql.includes('VALUES ($1, $2, $3, now(), $4, $5, $6)');
      const rec = {
        id: this.uuid(),
        user_id: params[0],
        tier: params[1],
        status: hasExplicitStatusParam ? params[2] : 'active',
        current_period_start: this.now(),
        current_period_end: (hasExplicitStatusParam ? params[3] : params[2]) instanceof Date
          ? (hasExplicitStatusParam ? params[3] : params[2]).toISOString()
          : (hasExplicitStatusParam ? params[3] : params[2]),
        provider: isVoucher
          ? 'voucher'
          : hasExplicitStatusParam
          ? params[4]
          : params[3],
        provider_subscription_id: isVoucher
          ? params[3]
          : hasExplicitStatusParam
          ? params[5]
          : params[4],
        created_at: this.now(),
        updated_at: this.now(),
      };
      this.store['public.subscriptions'].push(rec);
      this.recordAudit('public', 'subscriptions', 'INSERT', rec);
      return [rec];
    }

    if (sql.startsWith('INSERT INTO public.payments')) {
      const isVoucher = sql.includes("'voucher'");
      const isAdminGrant = sql.includes("'admin_grant'");
      const hasDynamicAmount = sql.includes("VALUES ($1, $2, $3, 'PEN', 'approved', $4, $5, now())");
      const rec = {
        id: this.uuid(),
        user_id: params[0],
        subscription_id: params[1],
        amount: hasDynamicAmount
          ? String(Number(params[2] || 0).toFixed(2))
          : sql.includes('19.90')
          ? '19.90'
          : '0.00',
        currency: 'PEN',
        status: 'approved',
        provider: isVoucher
          ? 'voucher'
          : isAdminGrant
          ? 'admin_grant'
          : hasDynamicAmount
          ? params[3]
          : params[2],
        provider_payment_id: isVoucher
          ? params[2]
          : isAdminGrant
          ? params[2]
          : hasDynamicAmount
          ? params[4]
          : null,
        paid_at: this.now(),
        created_at: this.now(),
      };
      this.store['public.payments'].unshift(rec);
      return [rec];
    }

    if (sql.startsWith('INSERT INTO public.subscription_vouchers')) {
      const rec = {
        id: this.uuid(),
        code: params[0],
        tier: params[1],
        duration_days: params[2],
        status: 'available',
        created_by: params[3],
        redeemed_by: null,
        redeemed_at: null,
        expires_at: params[4],
        notes: params[5],
        created_at: this.now(),
      };
      this.store['public.subscription_vouchers'].unshift(rec);
      return [rec];
    }

    if (sql.includes('FROM public.subscription_vouchers v LEFT JOIN public.users u1')) {
      let list = [...this.store['public.subscription_vouchers']];
      if (sql.includes('WHERE v.status = $1')) {
        list = list.filter((v) => v.status === params[0]);
      }
      const limit = Number(params[params.length - 1]) || 50;
      return list
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)
        .map((v) => {
          const u1 = this.store['public.users'].find((u) => u.id === v.created_by);
          const u2 = this.store['public.users'].find((u) => u.id === v.redeemed_by);
          return {
            ...v,
            created_by_name: u1?.first_name || null,
            redeemed_by_name: u2?.first_name || null,
            redeemed_by_phone: u2?.phone || null,
          };
        });
    }

    if (sql === 'SELECT * FROM public.subscription_vouchers WHERE code = $1') {
      return this.store['public.subscription_vouchers'].filter((v) => v.code === params[0]);
    }

    if (sql.startsWith("UPDATE public.subscription_vouchers SET status = 'redeemed'")) {
      const v = this.store['public.subscription_vouchers'].find((item) => item.id === params[1]);
      if (v) {
        v.status = 'redeemed';
        v.redeemed_by = params[0];
        v.redeemed_at = this.now();
      }
      return [];
    }

    // ------------------------------------------------------------------------
    // 5. PETS, CONTACTS & PUBLIC PROFILE
    // ------------------------------------------------------------------------
    if (sql.includes("SELECT COUNT(*) as count FROM public.pets WHERE owner_id = $1 AND status != 'archived'")) {
      const count = this.store['public.pets'].filter(
        (p) => p.owner_id === params[0] && p.status !== 'archived',
      ).length;
      return [{ count: String(count) }];
    }

    if (sql.includes('FROM public.pets p') && sql.includes('collaborator_role') && sql.includes('WHERE p.id = $1') && !sql.includes('qr_public_code')) {
      const pet = this.store['public.pets'].find((p) => p.id === params[0]);
      if (!pet) return [];
      const collab = this.store['public.pet_collaborators'].find(
        (c) => c.pet_id === pet.id && c.user_id === params[1],
      );
      return [{ ...pet, collaborator_role: collab?.role || null }];
    }

    if (sql === 'SELECT id, owner_id, name FROM public.pets WHERE id = $1') {
      return this.store['public.pets']
        .filter((p) => p.id === params[0])
        .map((p) => ({ id: p.id, owner_id: p.owner_id, name: p.name }));
    }

    if (
      sql === 'SELECT id, owner_id FROM public.pets WHERE id = $1 AND owner_id = $2' ||
      sql === 'SELECT id, owner_id, name FROM public.pets WHERE id = $1 AND owner_id = $2'
    ) {
      return this.store['public.pets']
        .filter((p) => p.id === params[0] && p.owner_id === params[1])
        .map((p) => ({ id: p.id, owner_id: p.owner_id, name: p.name }));
    }

    if (sql.includes('SELECT id, owner_id FROM public.pets WHERE id = $1 AND (owner_id = $2 OR EXISTS')) {
      const pet = this.store['public.pets'].find((p) => p.id === params[0]);
      if (!pet) return [];
      const isCollab = this.store['public.pet_collaborators'].some(
        (c) => c.pet_id === params[0] && c.user_id === params[1],
      );
      if (pet.owner_id === params[1] || isCollab) {
        return [{ id: pet.id, owner_id: pet.owner_id }];
      }
      return [];
    }

    // getMyPets
    if (sql.includes('FROM public.pets p') && sql.includes('vaccines_count') && sql.includes('WHERE (p.owner_id = $1 OR c.user_id = $1)')) {
      const userId = params[0];
      const today = new Date().toISOString().split('T')[0];
      return this.store['public.pets']
        .filter((p) => {
          const isCollab = this.store['public.pet_collaborators'].some(
            (c) => c.pet_id === p.id && c.user_id === userId,
          );
          return (p.owner_id === userId || isCollab) && p.status !== 'archived';
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((p) => {
          const collab = this.store['public.pet_collaborators'].find(
            (c) => c.pet_id === p.id && c.user_id === userId,
          );
          const assign = this.store['public.qr_tag_assignments'].find(
            (a) => a.pet_id === p.id && !a.unassigned_at,
          );
          const tag = assign
            ? this.store['public.qr_tags'].find((t) => t.id === assign.qr_tag_id)
            : null;
          const isLost = this.store['public.lost_mode_events'].some(
            (l) => l.pet_id === p.id && l.status === 'active',
          );
          const vacs = this.store['public.pet_vaccinations'].filter((pv) => pv.pet_id === p.id);
          const overdue = vacs.filter(
            (pv) => pv.next_due_date && pv.next_due_date < today,
          ).length;

          return {
            ...p,
            is_owner: p.owner_id === userId,
            collaborator_role: collab?.role || null,
            qr_code: tag?.public_code || null,
            qr_status: tag?.status || null,
            is_lost: isLost,
            vaccines_count: vacs.length,
            overdue_vaccines_count: overdue,
          };
        });
    }

    // Dashboard summary queries
    if (sql.includes('COUNT(p.id) as total_pets') && sql.includes('COUNT(DISTINCT a.pet_id) as pets_with_qr')) {
      const pets = this.store['public.pets'].filter(
        (p) => p.owner_id === params[0] && p.status !== 'archived',
      );
      const withQr = pets.filter((p) =>
        this.store['public.qr_tag_assignments'].some((a) => a.pet_id === p.id && !a.unassigned_at),
      );
      return [{ total_pets: String(pets.length), pets_with_qr: String(withQr.length) }];
    }

    if (sql.includes('COUNT(se.id) as scan_count')) {
      const petIds = this.store['public.pets']
        .filter((p) => p.owner_id === params[0])
        .map((p) => p.id);
      const count = this.store['public.profile_scan_events'].filter((se) =>
        petIds.includes(se.pet_id),
      ).length;
      return [{ scan_count: String(count) }];
    }

    if (sql.includes('COUNT(l.id) as lost_count')) {
      const petIds = this.store['public.pets']
        .filter((p) => p.owner_id === params[0])
        .map((p) => p.id);
      const count = this.store['public.lost_mode_events'].filter(
        (l) => petIds.includes(l.pet_id) && l.status === 'active',
      ).length;
      return [{ lost_count: String(count) }];
    }

    if (sql.includes('COUNT(pv.id) as total_applied')) {
      const today = new Date().toISOString().split('T')[0];
      const petIds = this.store['public.pets']
        .filter((p) => p.owner_id === params[0])
        .map((p) => p.id);
      const vacs = this.store['public.pet_vaccinations'].filter((pv) =>
        petIds.includes(pv.pet_id),
      );
      const overdue = vacs.filter((pv) => pv.next_due_date && pv.next_due_date < today).length;
      return [{ total_applied: String(vacs.length), overdue_count: String(overdue) }];
    }

    if (sql.startsWith('INSERT INTO public.pets (')) {
      const rec = {
        id: this.uuid(),
        owner_id: params[0],
        name: params[1],
        species: params[2],
        breed: params[3],
        sex: params[4],
        birth_date: params[5],
        color: params[6],
        microchip_number: params[7],
        is_sterilized: params[8],
        description: params[9],
        photo_storage_path: params[10],
        status: 'active',
        created_at: this.now(),
        updated_at: this.now(),
      };
      this.store['public.pets'].push(rec);
      this.recordAudit('public', 'pets', 'INSERT', rec);
      return [rec];
    }

    if (sql.startsWith('INSERT INTO public.pet_public_profiles')) {
      let prof = this.store['public.pet_public_profiles'].find((pp) => pp.pet_id === params[0]);
      if (!prof) {
        prof = {
          pet_id: params[0],
          show_pet_name: true,
          show_photo: true,
          show_breed: true,
          show_owner_name: false,
          show_owner_phone: true,
          show_contacts: true,
          show_medical_info: true,
          emergency_message: null,
          updated_at: this.now(),
        };
        this.store['public.pet_public_profiles'].push(prof);
      }
      return [prof];
    }

    if (sql.includes('t.public_code as qr_public_code') && sql.includes('FROM public.pets p')) {
      const p = this.store['public.pets'].find((pet) => pet.id === params[0]);
      if (!p) return [];
      const assign = this.store['public.qr_tag_assignments'].find(
        (a) => a.pet_id === p.id && !a.unassigned_at,
      );
      const tag = assign
        ? this.store['public.qr_tags'].find((t) => t.id === assign.qr_tag_id)
        : null;
      const lost = this.store['public.lost_mode_events'].find(
        (l) => l.pet_id === p.id && l.status === 'active',
      );
      return [
        {
          ...p,
          is_owner: p.owner_id === params[1],
          qr_tag_id: tag?.id || null,
          qr_public_code: tag?.public_code || null,
          qr_status: tag?.status || null,
          qr_assigned_at: assign?.assigned_at || null,
          active_lost_event_id: lost?.id || null,
          is_lost: Boolean(lost),
        },
      ];
    }

    if (sql.startsWith('SELECT * FROM public.pet_contacts WHERE pet_id = $1')) {
      return this.store['public.pet_contacts']
        .filter((c) => c.pet_id === params[0])
        .sort((a, b) => (a.priority || 1) - (b.priority || 1));
    }

    if (sql === 'SELECT * FROM public.pet_public_profiles WHERE pet_id = $1') {
      return this.store['public.pet_public_profiles'].filter((pp) => pp.pet_id === params[0]);
    }

    if (sql.includes('FROM public.pet_collaborators c JOIN public.users u')) {
      return this.store['public.pet_collaborators']
        .filter((c) => c.pet_id === params[0])
        .map((c) => {
          const u = this.store['public.users'].find((usr) => usr.id === c.user_id);
          const a = this.store['identity.user_accounts'].find((acc) => acc.id === c.user_id);
          return {
            ...c,
            first_name: u?.first_name || '',
            last_name: u?.last_name || '',
            email: a?.email || '',
          };
        });
    }

    if (sql.startsWith('UPDATE public.pets SET ')) {
      const petId = params[params.length - 1];
      const pet = this.store['public.pets'].find((p) => p.id === petId);
      if (!pet) return [];
      const old = { ...pet };
      this.applyDynamicSet(sql, params, pet);
      pet.updated_at = this.now();
      this.recordAudit('public', 'pets', 'UPDATE', pet, old);
      return [pet];
    }

    if (sql === 'UPDATE public.pet_contacts SET is_primary = false WHERE pet_id = $1') {
      this.store['public.pet_contacts']
        .filter((c) => c.pet_id === params[0])
        .forEach((c) => {
          c.is_primary = false;
        });
      return [];
    }

    if (sql.startsWith('INSERT INTO public.pet_contacts')) {
      const rec = {
        id: this.uuid(),
        pet_id: params[0],
        name: params[1],
        relationship: params[2],
        phone: params[3],
        email: params[4],
        whatsapp: params[5],
        priority: params[6],
        is_primary: params[7],
        can_receive_lost_alerts: params[8],
        created_at: this.now(),
      };
      this.store['public.pet_contacts'].push(rec);
      return [rec];
    }

    if (sql === 'DELETE FROM public.pet_contacts WHERE id = $1 AND pet_id = $2') {
      const idx = this.store['public.pet_contacts'].findIndex(
        (c) => c.id === params[0] && c.pet_id === params[1],
      );
      if (idx >= 0) {
        const [removed] = this.store['public.pet_contacts'].splice(idx, 1);
        this.recordAudit('public', 'pet_contacts', 'DELETE', removed, removed);
      }
      return [];
    }

    if (sql === 'SELECT user_id FROM public.pet_collaborators WHERE pet_id = $1') {
      return this.store['public.pet_collaborators']
        .filter((c) => c.pet_id === params[0])
        .map((c) => ({ user_id: c.user_id }));
    }

    if (sql.startsWith('INSERT INTO public.pet_collaborators')) {
      const existing = this.store['public.pet_collaborators'].find(
        (c) => c.pet_id === params[0] && c.user_id === params[1],
      );
      if (existing) {
        existing.role = params[2];
        return [existing];
      }
      const rec = {
        pet_id: params[0],
        user_id: params[1],
        role: params[2],
        created_at: this.now(),
      };
      this.store['public.pet_collaborators'].push(rec);
      return [rec];
    }

    if (sql === 'DELETE FROM public.pet_collaborators WHERE pet_id = $1 AND user_id = $2') {
      const idx = this.store['public.pet_collaborators'].findIndex(
        (c) => c.pet_id === params[0] && c.user_id === params[1],
      );
      if (idx >= 0) {
        this.store['public.pet_collaborators'].splice(idx, 1);
      }
      return [];
    }

    if (sql === 'UPDATE public.qr_tag_assignments SET unassigned_at = now() WHERE pet_id = $1 AND unassigned_at IS NULL') {
      this.store['public.qr_tag_assignments']
        .filter((a) => a.pet_id === params[0] && !a.unassigned_at)
        .forEach((a) => {
          a.unassigned_at = this.now();
        });
      return [];
    }

    if (sql === "UPDATE public.pets SET status = 'archived' WHERE id = $1") {
      const pet = this.store['public.pets'].find((p) => p.id === params[0]);
      if (pet) {
        pet.status = 'archived';
        pet.updated_at = this.now();
      }
      return [];
    }

    if (sql.startsWith('UPDATE public.pet_public_profiles SET ')) {
      const isEmergencyOnly = sql.includes('SET emergency_message = $1 WHERE pet_id = $2');
      const petId = isEmergencyOnly ? params[1] : params[params.length - 1];
      const prof = this.store['public.pet_public_profiles'].find((pp) => pp.pet_id === petId);
      if (!prof) return [];
      if (isEmergencyOnly) {
        prof.emergency_message = params[0];
      } else {
        this.applyDynamicSet(sql, params, prof);
      }
      prof.updated_at = this.now();
      return [prof];
    }

    // ------------------------------------------------------------------------
    // 6. QR TAGS, BATCHES & PUBLIC SCAN
    // ------------------------------------------------------------------------
    if (
      sql === 'SELECT id, status FROM public.qr_tags WHERE public_code = $1' ||
      sql === 'SELECT id FROM public.qr_tags WHERE public_code = $1'
    ) {
      return this.store['public.qr_tags']
        .filter((t) => t.public_code === params[0])
        .map((t) => ({ id: t.id, status: t.status }));
    }

    if (sql.includes('SELECT a.qr_tag_id, t.public_code FROM public.qr_tag_assignments a')) {
      const assign = this.store['public.qr_tag_assignments'].find(
        (a) => a.pet_id === params[0] && !a.unassigned_at,
      );
      if (!assign) return [];
      const tag = this.store['public.qr_tags'].find((t) => t.id === assign.qr_tag_id);
      if (!tag) return [];
      return [{ qr_tag_id: tag.id, public_code: tag.public_code }];
    }

    if (sql.includes('FROM public.qr_tag_assignments a JOIN public.pets p ON p.id = a.pet_id JOIN public.users u')) {
      const assign = this.store['public.qr_tag_assignments'].find(
        (a) => a.qr_tag_id === params[0] && !a.unassigned_at,
      );
      if (!assign) return [];
      const pet = this.store['public.pets'].find(
        (p) => p.id === assign.pet_id && p.status === 'active',
      );
      if (!pet) return [];
      const usr = this.store['public.users'].find((u) => u.id === pet.owner_id);
      const pp = this.store['public.pet_public_profiles'].find((prof) => prof.pet_id === pet.id);
      const lost = this.store['public.lost_mode_events'].find(
        (l) => l.pet_id === pet.id && l.status === 'active',
      );
      return [
        {
          pet_id: pet.id,
          owner_id: pet.owner_id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          sex: pet.sex,
          birth_date: pet.birth_date,
          color: pet.color,
          microchip_number: pet.microchip_number,
          is_sterilized: pet.is_sterilized,
          photo_storage_path: pet.photo_storage_path,
          description: pet.description,
          owner_first_name: usr?.first_name || 'Propietario',
          owner_phone: usr?.phone || null,
          active_lost_event_id: lost?.id || null,
          show_pet_name: pp?.show_pet_name ?? true,
          show_photo: pp?.show_photo ?? true,
          show_breed: pp?.show_breed ?? true,
          show_owner_name: pp?.show_owner_name ?? false,
          show_owner_phone: pp?.show_owner_phone ?? true,
          show_contacts: pp?.show_contacts ?? true,
          show_medical_info: pp?.show_medical_info ?? true,
          emergency_message:
            pp?.emergency_message ||
            '¡Esta mascota se encuentra extraviada! Por favor comunícate con su familia.',
        },
      ];
    }

    if (sql.startsWith('INSERT INTO public.profile_scan_events')) {
      const rec = {
        id: this.uuid(),
        qr_tag_id: params[0],
        pet_id: params[1],
        was_lost_mode: params[2],
        device_type: params[3],
        scanned_at: this.now(),
      };
      this.store['public.profile_scan_events'].unshift(rec);
      return [rec];
    }

    if (sql.includes('SELECT name, relationship, phone, whatsapp, is_primary FROM public.pet_contacts')) {
      return this.store['public.pet_contacts']
        .filter((c) => c.pet_id === params[0] && (c.is_primary || c.can_receive_lost_alerts))
        .map((c) => ({
          name: c.name,
          relationship: c.relationship,
          phone: c.phone,
          whatsapp: c.whatsapp,
          is_primary: c.is_primary,
        }));
    }

    if (sql.includes('FROM public.pet_vaccinations WHERE pet_id = $1 ORDER BY application_date DESC LIMIT')) {
      return this.store['public.pet_vaccinations']
        .filter((v) => v.pet_id === params[0])
        .slice(0, 5)
        .map((v) => ({
          vaccine_name: v.vaccine_name,
          application_date: v.application_date,
          next_due_date: v.next_due_date,
        }));
    }

    if (sql.includes("FROM public.pet_treatments WHERE pet_id = $1 AND status = 'active'")) {
      return this.store['public.pet_treatments']
        .filter((t) => t.pet_id === params[0] && t.status === 'active')
        .map((t) => ({
          treatment_name: t.treatment_name,
          medication_name: t.medication_name,
          dosage: t.dosage,
          frequency: t.frequency,
          instructions: t.instructions,
        }));
    }

    if (sql.includes('FROM public.pet_diagnoses WHERE pet_id = $1 ORDER BY diagnosis_date DESC LIMIT')) {
      return this.store['public.pet_diagnoses']
        .filter((d) => d.pet_id === params[0])
        .slice(0, 3)
        .map((d) => ({
          diagnosis: d.diagnosis,
          description: d.description,
          diagnosis_date: d.diagnosis_date,
        }));
    }

    if (sql.startsWith('UPDATE public.qr_tag_assignments SET unassigned_at = now()') && sql.includes('WHERE pet_id = $1')) {
      this.store['public.qr_tag_assignments']
        .filter((a) => a.pet_id === params[0] && !a.unassigned_at)
        .forEach((a) => {
          a.unassigned_at = this.now();
          a.reason = 'Reemplazo por nueva placa QR';
        });
      return [];
    }

    if (sql.startsWith('INSERT INTO public.qr_tag_assignments')) {
      const rec = {
        id: this.uuid(),
        qr_tag_id: params[0],
        pet_id: params[1],
        assigned_at: this.now(),
        unassigned_at: null,
        reason: null,
      };
      this.store['public.qr_tag_assignments'].push(rec);
      return [rec];
    }

    if (sql === "UPDATE public.qr_tags SET status = 'active' WHERE id = $1") {
      const t = this.store['public.qr_tags'].find((tag) => tag.id === params[0]);
      if (t) {
        const old = { ...t };
        t.status = 'active';
        this.recordAudit('public', 'qr_tags', 'UPDATE', t, old);
      }
      return [];
    }

    if (sql.includes('SELECT t.id, a.pet_id, p.owner_id FROM public.qr_tags t JOIN public.qr_tag_assignments a')) {
      const t = this.store['public.qr_tags'].find((tag) => tag.public_code === params[0]);
      if (!t) return [];
      const a = this.store['public.qr_tag_assignments'].find(
        (ass) => ass.qr_tag_id === t.id && !ass.unassigned_at,
      );
      if (!a) return [];
      const p = this.store['public.pets'].find((pet) => pet.id === a.pet_id);
      if (!p) return [];
      return [{ id: t.id, pet_id: p.id, owner_id: p.owner_id }];
    }

    if (sql.startsWith('UPDATE public.qr_tag_assignments SET unassigned_at = now()') && sql.includes('WHERE qr_tag_id = $1')) {
      this.store['public.qr_tag_assignments']
        .filter((a) => a.qr_tag_id === params[0] && !a.unassigned_at)
        .forEach((a) => {
          a.unassigned_at = this.now();
          a.reason = params[1];
        });
      return [];
    }

    if (sql === "UPDATE public.qr_tags SET status = 'available' WHERE id = $1") {
      const t = this.store['public.qr_tags'].find((tag) => tag.id === params[0]);
      if (t) {
        const old = { ...t };
        t.status = 'available';
        this.recordAudit('public', 'qr_tags', 'UPDATE', t, old);
      }
      return [];
    }

    if (sql.includes("WHERE t.status = 'available'") && sql.includes('FROM public.qr_tags t')) {
      const limit = Number(params[0]) || 20;
      return this.store['public.qr_tags']
        .filter((t) => t.status === 'available')
        .slice(0, limit)
        .map((t) => {
          const b = this.store['public.tag_production_batches'].find(
            (batch) => batch.id === t.production_batch_id,
          );
          return {
            id: t.id,
            public_code: t.public_code,
            status: t.status,
            created_at: t.created_at,
            batch_code: b?.batch_code || null,
          };
        });
    }

    if (sql.includes('FROM public.tag_production_batches b LEFT JOIN public.users u')) {
      return this.store['public.tag_production_batches'].map((b) => {
        const u = this.store['public.users'].find((usr) => usr.id === b.created_by);
        const available_count = this.store['public.qr_tags'].filter(
          (t) => t.production_batch_id === b.id && t.status === 'available',
        ).length;
        const active_count = this.store['public.qr_tags'].filter(
          (t) => t.production_batch_id === b.id && t.status === 'active',
        ).length;
        return {
          ...b,
          created_by_name: u?.first_name || null,
          available_count,
          active_count,
        };
      });
    }

    if (sql.includes('SELECT t.id, t.public_code, t.status, t.created_at, b.batch_code, p.name as pet_name FROM public.qr_tags t')) {
      return this.store['public.qr_tags'].slice(0, 100).map((t) => {
        const b = this.store['public.tag_production_batches'].find(
          (batch) => batch.id === t.production_batch_id,
        );
        const a = this.store['public.qr_tag_assignments'].find(
          (ass) => ass.qr_tag_id === t.id && !ass.unassigned_at,
        );
        const p = a ? this.store['public.pets'].find((pet) => pet.id === a.pet_id) : null;
        return {
          id: t.id,
          public_code: t.public_code,
          status: t.status,
          created_at: t.created_at,
          batch_code: b?.batch_code || null,
          pet_name: p?.name || null,
        };
      });
    }

    if (sql.startsWith('INSERT INTO public.tag_production_batches')) {
      const rec = {
        id: this.uuid(),
        batch_code: params[0],
        quantity: params[1],
        created_by: params[2],
        notes: params[3],
        created_at: this.now(),
      };
      this.store['public.tag_production_batches'].unshift(rec);
      return [rec];
    }

    if (sql.startsWith('INSERT INTO public.qr_tags')) {
      const isDirectActive = sql.includes("'active'");
      const rec = {
        id: this.uuid(),
        production_batch_id: params[0],
        public_code: params[1],
        status: isDirectActive ? 'active' : 'available',
        created_at: this.now(),
      };
      this.store['public.qr_tags'].unshift(rec);
      this.recordAudit('public', 'qr_tags', 'INSERT', rec);
      return [rec];
    }

    // ------------------------------------------------------------------------
    // 7. LOST MODE & LOCATION PINGS
    // ------------------------------------------------------------------------
    if (sql === "SELECT id FROM public.lost_mode_events WHERE pet_id = $1 AND status = 'active'") {
      return this.store['public.lost_mode_events']
        .filter((l) => l.pet_id === params[0] && l.status === 'active')
        .map((l) => ({ id: l.id }));
    }

    if (sql.startsWith('INSERT INTO public.lost_mode_events')) {
      const rec = {
        id: this.uuid(),
        pet_id: params[0],
        activated_by: params[1],
        status: 'active',
        activated_at: this.now(),
        resolved_at: null,
        recovery_method: null,
        resolution_ping_id: null,
        owner_testimonial: null,
      };
      this.store['public.lost_mode_events'].unshift(rec);
      this.recordAudit('public', 'lost_mode_events', 'INSERT', rec);
      return [rec];
    }

    if (sql.startsWith("UPDATE public.lost_mode_events SET status = 'recovered'")) {
      const l = this.store['public.lost_mode_events'].find((ev) => ev.id === params[3]);
      if (!l) return [];
      const old = { ...l };
      l.status = 'recovered';
      l.resolved_at = this.now();
      l.recovery_method = params[0];
      l.resolution_ping_id = params[1];
      l.owner_testimonial = params[2];
      this.recordAudit('public', 'lost_mode_events', 'UPDATE', l, old);
      return [l];
    }

    if (sql.startsWith('INSERT INTO public.location_pings')) {
      const rec = {
        id: this.uuid(),
        lost_mode_event_id: params[0],
        qr_tag_id: params[1],
        latitude: params[2],
        longitude: params[3],
        accuracy_m: params[4],
        captured_at: this.now(),
      };
      this.store['public.location_pings'].unshift(rec);
      return [rec];
    }

    if (sql.includes('FROM public.lost_mode_events l JOIN public.pets p ON p.id = l.pet_id WHERE l.id = $1')) {
      const l = this.store['public.lost_mode_events'].find((ev) => ev.id === params[0]);
      if (!l) return [];
      const p = this.store['public.pets'].find((pet) => pet.id === l.pet_id);
      if (!p) return [];
      return [{ owner_id: p.owner_id, pet_id: p.id, pet_name: p.name }];
    }

    if (sql.includes('FROM public.qr_tag_assignments a JOIN public.pets p ON p.id = a.pet_id WHERE a.qr_tag_id = $1')) {
      const a = this.store['public.qr_tag_assignments'].find(
        (ass) => ass.qr_tag_id === params[0] && !ass.unassigned_at,
      );
      if (!a) return [];
      const p = this.store['public.pets'].find((pet) => pet.id === a.pet_id);
      if (!p) return [];
      return [{ owner_id: p.owner_id, pet_id: p.id, pet_name: p.name }];
    }

    if (sql.includes('FROM public.location_pings lp LEFT JOIN public.lost_mode_events l')) {
      const petId = params[0];
      return this.store['public.location_pings']
        .filter((lp) => {
          const l = this.store['public.lost_mode_events'].find(
            (ev) => ev.id === lp.lost_mode_event_id,
          );
          const a = this.store['public.qr_tag_assignments'].find(
            (ass) => ass.qr_tag_id === lp.qr_tag_id && !ass.unassigned_at,
          );
          return l?.pet_id === petId || a?.pet_id === petId;
        })
        .map((lp) => {
          const l = this.store['public.lost_mode_events'].find(
            (ev) => ev.id === lp.lost_mode_event_id,
          );
          return {
            id: lp.id,
            latitude: lp.latitude,
            longitude: lp.longitude,
            accuracy_m: lp.accuracy_m,
            captured_at: lp.captured_at,
            event_status: l?.status || 'normal',
            lost_activated_at: l?.activated_at || null,
          };
        });
    }

    if (sql.includes('FROM public.profile_scan_events WHERE pet_id = $1')) {
      return this.store['public.profile_scan_events'].filter((se) => se.pet_id === params[0]);
    }

    // ------------------------------------------------------------------------
    // 8. HEALTH PASSPORT QUERIES
    // ------------------------------------------------------------------------
    if (sql.startsWith('SELECT * FROM public.pet_vaccinations WHERE pet_id = $1')) {
      return this.store['public.pet_vaccinations'].filter((v) => v.pet_id === params[0]);
    }
    if (sql.startsWith('INSERT INTO public.pet_vaccinations')) {
      const rec = {
        id: this.uuid(),
        pet_id: params[0],
        vaccine_name: params[1],
        application_date: params[2],
        next_due_date: params[3],
        batch_number: params[4],
        veterinarian_name: params[5],
        clinic_name: params[6],
        notes: params[7],
        created_by: params[8],
        created_at: this.now(),
      };
      this.store['public.pet_vaccinations'].unshift(rec);
      return [rec];
    }

    if (sql.startsWith('SELECT * FROM public.pet_deworming WHERE pet_id = $1')) {
      return this.store['public.pet_deworming'].filter((d) => d.pet_id === params[0]);
    }
    if (sql.startsWith('INSERT INTO public.pet_deworming')) {
      const rec = {
        id: this.uuid(),
        pet_id: params[0],
        product_name: params[1],
        application_date: params[2],
        next_due_date: params[3],
        weight_at_application_kg: params[4],
        notes: params[5],
        created_by: params[6],
        created_at: this.now(),
      };
      this.store['public.pet_deworming'].unshift(rec);
      return [rec];
    }

    if (sql.startsWith('SELECT * FROM public.pet_treatments WHERE pet_id = $1')) {
      return this.store['public.pet_treatments'].filter((t) => t.pet_id === params[0]);
    }
    if (sql.startsWith('INSERT INTO public.pet_treatments')) {
      const rec = {
        id: this.uuid(),
        pet_id: params[0],
        treatment_name: params[1],
        medication_name: params[2],
        dosage: params[3],
        frequency: params[4],
        start_date: params[5],
        end_date: params[6],
        instructions: params[7],
        veterinarian_name: params[8],
        status: params[9],
        created_by: params[10],
        created_at: this.now(),
      };
      this.store['public.pet_treatments'].unshift(rec);
      return [rec];
    }
    if (sql.startsWith('UPDATE public.pet_treatments SET status = $1 WHERE id = $2 AND pet_id = $3')) {
      const t = this.store['public.pet_treatments'].find(
        (item) => item.id === params[1] && item.pet_id === params[2],
      );
      if (!t) return [];
      t.status = params[0];
      return [t];
    }

    if (sql.startsWith('SELECT * FROM public.pet_diagnoses WHERE pet_id = $1')) {
      return this.store['public.pet_diagnoses'].filter((d) => d.pet_id === params[0]);
    }
    if (sql.startsWith('INSERT INTO public.pet_diagnoses')) {
      const rec = {
        id: this.uuid(),
        pet_id: params[0],
        diagnosis: params[1],
        diagnosis_date: params[2],
        description: params[3],
        status: params[4],
        created_by: params[5],
        created_at: this.now(),
      };
      this.store['public.pet_diagnoses'].unshift(rec);
      return [rec];
    }

    if (sql.startsWith('SELECT * FROM public.pet_weight_records WHERE pet_id = $1')) {
      return this.store['public.pet_weight_records'].filter((w) => w.pet_id === params[0]);
    }
    if (sql.startsWith('INSERT INTO public.pet_weight_records')) {
      const rec = {
        id: this.uuid(),
        pet_id: params[0],
        weight_kg: params[1],
        measured_at: params[2],
        notes: params[3],
        created_by: params[4],
        created_at: this.now(),
      };
      this.store['public.pet_weight_records'].unshift(rec);
      return [rec];
    }

    if (sql.startsWith('SELECT * FROM public.appointments WHERE pet_id = $1')) {
      return this.store['public.appointments'].filter((a) => a.pet_id === params[0]);
    }
    if (sql.startsWith('INSERT INTO public.appointments')) {
      const rec = {
        id: this.uuid(),
        pet_id: params[0],
        user_id: params[1],
        scheduled_at: params[2],
        reason: params[3],
        notes: params[4],
        status: 'scheduled',
        created_at: this.now(),
      };
      this.store['public.appointments'].push(rec);
      return [rec];
    }
    if (sql.startsWith('UPDATE public.appointments SET status = $1 WHERE id = $2 AND pet_id = $3')) {
      const a = this.store['public.appointments'].find(
        (item) => item.id === params[1] && item.pet_id === params[2],
      );
      if (!a) return [];
      a.status = params[0];
      return [a];
    }

    if (sql.startsWith('SELECT * FROM public.pet_medical_documents WHERE pet_id = $1')) {
      return this.store['public.pet_medical_documents'].filter((d) => d.pet_id === params[0]);
    }
    if (sql.startsWith('INSERT INTO public.pet_medical_documents')) {
      const rec = {
        id: this.uuid(),
        pet_id: params[0],
        uploaded_by: params[1],
        document_type: params[2],
        file_name: params[3],
        storage_path: params[4],
        mime_type: params[5],
        file_size_bytes: params[6],
        created_at: this.now(),
      };
      this.store['public.pet_medical_documents'].unshift(rec);
      return [rec];
    }

    // ------------------------------------------------------------------------
    // 9. COMMERCE & STORE QUERIES
    // ------------------------------------------------------------------------
    if (sql.startsWith('SELECT * FROM public.products WHERE is_active = true')) {
      return this.store['public.products'].filter((p) => p.is_active);
    }

    if (sql === 'SELECT id, name, price, is_active FROM public.products WHERE id = $1') {
      return this.store['public.products'].filter((p) => p.id === params[0]);
    }

    if (sql.includes('FROM public.coupons WHERE code = $1')) {
      return this.store['public.coupons'].filter((c) => c.code === params[0]);
    }

    if (sql.startsWith('INSERT INTO public.orders')) {
      const rec = {
        id: this.uuid(),
        user_id: params[0],
        status: 'paid',
        payment_status: 'approved',
        shipping_address: params[1],
        shipping_city: params[2],
        shipping_country: params[3],
        subtotal: params[4],
        discount: params[5],
        shipping_cost: params[6],
        total: params[7],
        currency: 'PEN',
        created_at: this.now(),
      };
      this.store['public.orders'].unshift(rec);
      this.recordAudit('public', 'orders', 'INSERT', rec);
      return [rec];
    }

    if (sql.startsWith('INSERT INTO public.order_items')) {
      const rec = {
        id: this.uuid(),
        order_id: params[0],
        product_id: params[1],
        product_name: params[2],
        quantity: params[3],
        unit_price: params[4],
        total_price: Number(params[3]) * Number(params[4]),
      };
      this.store['public.order_items'].push(rec);
      return [rec];
    }

    if (sql.startsWith('INSERT INTO public.coupon_redemptions')) {
      this.store['public.coupon_redemptions'].push({
        coupon_id: params[0],
        user_id: params[1],
        order_id: params[2],
        redeemed_at: this.now(),
      });
      return [];
    }

    if (sql === 'UPDATE public.coupons SET times_used = times_used + 1 WHERE id = $1') {
      const c = this.store['public.coupons'].find((item) => item.id === params[0]);
      if (c) c.times_used = (c.times_used || 0) + 1;
      return [];
    }

    if (sql.includes('FROM public.orders o WHERE o.user_id = $1')) {
      return this.store['public.orders']
        .filter((o) => o.user_id === params[0])
        .map((o) => {
          const items = this.store['public.order_items']
            .filter((i) => i.order_id === o.id)
            .map((i) => ({
              id: i.id,
              productId: i.product_id,
              productName: i.product_name,
              quantity: i.quantity,
              unitPrice: i.unit_price,
              totalPrice: i.total_price,
            }));
          return { ...o, items };
        });
    }

    // ------------------------------------------------------------------------
    // 10. VETERINARY DIRECTORY & AUDIT LOGS
    // ------------------------------------------------------------------------
    if (sql.startsWith('SELECT * FROM public.clinics')) {
      return [...this.store['public.clinics']];
    }

    if (sql.includes('FROM public.veterinarians v LEFT JOIN public.clinics c')) {
      let vets = [...this.store['public.veterinarians']];
      if (sql.includes('WHERE v.clinic_id = $1')) {
        vets = vets.filter((v) => v.clinic_id === params[0]);
      }
      return vets.map((v) => {
        const c = this.store['public.clinics'].find((cl) => cl.id === v.clinic_id);
        return { ...v, clinic_name: c?.name || null };
      });
    }

    if (sql.includes('FROM audit.audit_logs a LEFT JOIN public.users u')) {
      let logs = [...this.store['audit.audit_logs']];
      if (sql.includes('WHERE a.table_name = $1 AND a.record_id = $2')) {
        logs = logs.filter((a) => a.table_name === params[0] && a.record_id === params[1]);
      } else if (sql.includes('WHERE a.table_name = $1')) {
        logs = logs.filter((a) => a.table_name === params[0]);
      }
      const limit = Number(params[params.length - 1]) || 50;
      return logs.slice(0, limit).map((a) => {
        const u = this.store['public.users'].find((usr) => usr.id === a.changed_by);
        return {
          ...a,
          first_name: u?.first_name || null,
          last_name: u?.last_name || null,
        };
      });
    }

    // ------------------------------------------------------------------------
    // 11. E2E TEST CLEANUP QUERIES
    // ------------------------------------------------------------------------
    if (sql.startsWith('DELETE FROM public.orders WHERE user_id = $1')) {
      this.store['public.orders'] = this.store['public.orders'].filter((o) => o.user_id !== params[0]);
      return [];
    }
    if (sql.startsWith('DELETE FROM public.qr_tags WHERE production_batch_id IN')) {
      const batchIds = this.store['public.tag_production_batches']
        .filter((b) => b.batch_code === params[0])
        .map((b) => b.id);
      this.store['public.qr_tags'] = this.store['public.qr_tags'].filter(
        (t) => !batchIds.includes(t.production_batch_id),
      );
      return [];
    }
    if (sql.startsWith('DELETE FROM public.tag_production_batches WHERE batch_code = $1')) {
      this.store['public.tag_production_batches'] = this.store['public.tag_production_batches'].filter(
        (b) => b.batch_code !== params[0],
      );
      return [];
    }
    if (sql.startsWith('DELETE FROM public.subscription_vouchers WHERE code = $1')) {
      this.store['public.subscription_vouchers'] = this.store['public.subscription_vouchers'].filter(
        (v) => v.code !== params[0],
      );
      return [];
    }
    if (sql.startsWith('DELETE FROM public.users WHERE id = $1')) {
      const uid = params[0];
      this.store['public.users'] = this.store['public.users'].filter((u) => u.id !== uid);
      this.store['identity.user_accounts'] = this.store['identity.user_accounts'].filter((a) => a.id !== uid);
      this.store['identity.user_credentials'] = this.store['identity.user_credentials'].filter((c) => c.user_id !== uid);
      this.store['identity.sessions'] = this.store['identity.sessions'].filter((s) => s.user_id !== uid);
      this.store['public.pets'] = this.store['public.pets'].filter((p) => p.owner_id !== uid);
      return [];
    }

    return [];
  }

  private applyDynamicSet(sql: string, params: any[], target: Record<string, any>) {
    const match = sql.match(/SET\s+(.+?)\s+WHERE/i);
    if (!match) return;
    const assignments = match[1].split(',').map((s) => s.trim());
    for (const assign of assignments) {
      const parts = assign.split('=').map((s) => s.trim());
      if (parts.length === 2) {
        const col = parts[0];
        const paramMatch = parts[1].match(/^\$(\d+)$/);
        if (paramMatch) {
          const paramIdx = parseInt(paramMatch[1], 10) - 1;
          target[col] = params[paramIdx];
        }
      }
    }
  }
}
