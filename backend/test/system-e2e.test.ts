import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import { Duplex } from 'node:stream';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { DatabaseService } from '../src/database/database.service';

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

class MockSocket extends Duplex {
  public remoteAddress = '127.0.0.1';
  _read() {}
  _write(_chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    callback();
  }
}

async function injectExpress(
  expressApp: any,
  method: string,
  url: string,
  body?: any,
  token?: string,
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const socket = new MockSocket();
    const req = new http.IncomingMessage(socket as any);
    req.method = method.toUpperCase();
    req.url = url;
    req.headers = {
      host: 'localhost',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) E2E-Suite',
    };

    let payloadBuffer: Buffer | null = null;
    if (body !== undefined) {
      const raw = JSON.stringify(body);
      payloadBuffer = Buffer.from(raw, 'utf-8');
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = String(payloadBuffer.length);
    }
    if (token) {
      req.headers['authorization'] = `Bearer ${token}`;
    }

    const res = new http.ServerResponse(req);
    const chunks: Buffer[] = [];

    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = ((chunk: any, encoding?: any, cb?: any) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      return origWrite(chunk, encoding, cb);
    }) as any;

    res.end = ((chunk?: any, encoding?: any, cb?: any) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      origEnd(chunk, encoding, cb);
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      let parsed: any = {};
      try {
        parsed = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        parsed = { raw: rawBody };
      }
      resolve({ status: res.statusCode, json: parsed });
      return res;
    }) as any;

    try {
      expressApp(req, res);
      if (payloadBuffer) {
        req.push(payloadBuffer);
      }
      req.push(null);
    } catch (err) {
      reject(err);
    }
  });
}

async function runSuite() {
  console.log('==================================================================');
  console.log('🐾 MASKAYPET - SUITE DE PRUEBAS INTEGRALES E2E (BACKEND + DB + FLUJOS)');
  console.log('==================================================================\n');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  const db = app.get(DatabaseService);

  console.log(`🚀 Aplicación NestJS inicializada para pruebas integrales (/api/v1)\n`);

  const results: TestResult[] = [];
  const runTimestamp = Date.now();
  const testEmail = `e2e.tester.${runTimestamp}@maskaypet.pe`;
  const testPassword = 'TestPassword2026!';

  let accessToken = '';
  let refreshToken = '';
  let adminToken = '';
  let userId = '';
  let generatedVoucherCode = '';
  let createdPetId = '';
  let createdContactId = '';
  let generatedBatchCode = `LOT-E2E-${runTimestamp}`;
  let assignedQrCode = '';
  let qrTagId = '';
  let lostModeEventId = '';
  let createdTreatmentId = '';
  let createdAppointmentId = '';

  async function api(
    method: string,
    path: string,
    body?: any,
    token?: string,
  ): Promise<{ status: number; json: any }> {
    return injectExpress(expressApp, method, `/api/v1${path}`, body, token);
  }

  async function step(name: string, fn: () => Promise<void>) {
    const start = Date.now();
    try {
      await fn();
      const durationMs = Date.now() - start;
      results.push({ name, passed: true, durationMs });
      console.log(`✅ [PASS] ${name} (${durationMs}ms)`);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const message = err?.message || String(err);
      results.push({ name, passed: false, durationMs, error: message });
      console.error(`❌ [FAIL] ${name} (${durationMs}ms)\n   -> ${message}`);
    }
  }

  try {
    // 1. AUTH: Register
    await step('1. Auth: Registro de nuevo usuario con rol customer + preferencias + sesión', async () => {
      const { status, json } = await api('POST', '/auth/register', {
        email: testEmail,
        password: testPassword,
        firstName: 'Lucia',
        lastName: 'Mendoza',
        phone: '+51999888777',
      });
      assert.equal(status, 201, `Status esperado 201, recibido ${status}: ${JSON.stringify(json)}`);
      assert.equal(json.success, true);
      assert.ok(json.data.tokens.accessToken, 'Debe retornar tokens.accessToken');
      assert.equal(json.data.user.firstName, 'Lucia');
      assert.equal(json.data.user.first_name, 'Lucia');
      assert.equal(json.data.user.phone, '+51999888777');

      accessToken = json.data.tokens.accessToken;
      refreshToken = json.data.tokens.refreshToken;
      userId = json.data.user.id;
    });

    // 2. AUTH: Login & GetMe normalization
    await step('2. Auth: Login y persistencia de sesión en /auth/me (normalización camelCase + snake_case)', async () => {
      const loginRes = await api('POST', '/auth/login', {
        email: testEmail,
        password: testPassword,
      });
      assert.equal(loginRes.status, 200, `Login falló: ${JSON.stringify(loginRes.json)}`);
      accessToken = loginRes.json.data.tokens.accessToken;
      refreshToken = loginRes.json.data.tokens.refreshToken;

      const meRes = await api('GET', '/auth/me', undefined, accessToken);
      assert.equal(meRes.status, 200);
      assert.equal(meRes.json.data.firstName, 'Lucia');
      assert.equal(meRes.json.data.first_name, 'Lucia');
      assert.equal(meRes.json.data.lastName, 'Mendoza');
      assert.equal(meRes.json.data.last_name, 'Mendoza');
      assert.ok(Array.isArray(meRes.json.data.roles), 'Debe incluir arreglo de roles');
    });

    // 3. AUTH: Refresh Token
    await step('3. Auth: Renovación de sesión /auth/refresh compatible con interceptor Axios', async () => {
      const { status, json } = await api('POST', '/auth/refresh', { refreshToken });
      assert.equal(status, 200, `Refresh falló: ${JSON.stringify(json)}`);
      assert.ok(json.data.tokens?.accessToken, 'Debe incluir objeto tokens.accessToken');
      assert.ok(json.data.accessToken, 'Debe incluir accessToken directo');
      accessToken = json.data.tokens.accessToken;
      refreshToken = json.data.tokens.refreshToken;
    });

    // 4. USERS: Update Profile & Notification Preferences
    await step('4. Users & Notifications: Actualizar perfil personal y preferencias de notificación (incluyendo updated_at)', async () => {
      const profRes = await api(
        'PATCH',
        '/users/profile',
        { firstName: 'Lucia Valeria', phone: '+51987654321' },
        accessToken,
      );
      assert.equal(profRes.status, 200, `Falló PATCH /users/profile: ${JSON.stringify(profRes.json)}`);
      assert.equal(profRes.json.data.first_name, 'Lucia Valeria');
      assert.equal(profRes.json.data.firstName, 'Lucia Valeria');

      const prefGet = await api('GET', '/notifications/preferences', undefined, accessToken);
      assert.equal(prefGet.status, 200);

      // Simulate frontend sending full preferences object including updated_at
      const prefPatch = await api(
        'PATCH',
        '/notifications/preferences',
        {
          ...prefGet.json.data,
          sms_enabled: true,
          treatment_reminders: true,
          appointment_reminders: true,
        },
        accessToken,
      );
      assert.equal(prefPatch.status, 200, `Falló actualización de preferencias: ${JSON.stringify(prefPatch.json)}`);
      assert.equal(prefPatch.json.data.sms_enabled, true);
    });

    // 5. SUBSCRIPTIONS: Free Trial, Time-Based Plans, Vouchers & Admin Account Management
    await step('5. Subscriptions & Accounts: Prueba Gratis 14d, Planes por Tiempo (Mes/Año), Vouchers y Gestión Admin', async () => {
      const adminLogin = await api('POST', '/auth/login', {
        email: 'admin@mascotasqr.pe',
        password: 'Admin123!',
      });
      assert.equal(adminLogin.status, 200, `Falló login admin: ${JSON.stringify(adminLogin.json)}`);
      adminToken = adminLogin.json.data.tokens.accessToken;

      const plansRes = await api('GET', '/subscriptions/plans');
      assert.equal(plansRes.status, 200);
      assert.ok(plansRes.json.data.length >= 2, 'Debe haber al menos 2 planes');

      // 5a. Activate 14-day Free Trial
      const trialRes = await api(
        'POST',
        '/subscriptions/subscribe',
        {
          tier: 'premium',
          billingCycle: 'trial_14d',
          isTrial: true,
          provider: 'free_trial',
        },
        accessToken,
      );
      assert.equal(trialRes.status, 201, `Falló activación de prueba gratis: ${JSON.stringify(trialRes.json)}`);
      assert.equal(trialRes.json.data.tier, 'premium');
      assert.equal(trialRes.json.data.status, 'trialing');
      assert.equal(trialRes.json.data.durationDays, 14);

      // 5b. Attempting a second Free Trial must return 409 Conflict
      const duplicateTrialRes = await api(
        'POST',
        '/subscriptions/subscribe',
        {
          tier: 'premium',
          billingCycle: 'trial_14d',
          isTrial: true,
        },
        accessToken,
      );
      assert.equal(duplicateTrialRes.status, 409, 'Segunda prueba gratis debe ser rechazada con 409');

      // 5c. Purchase 1-Month Plan (30 days) and verify time accumulation + payment record
      const monthlyRes = await api(
        'POST',
        '/subscriptions/subscribe',
        {
          tier: 'premium',
          billingCycle: 'monthly_1m',
          provider: 'yape',
        },
        accessToken,
      );
      assert.equal(monthlyRes.status, 201, `Falló compra de plan mensual: ${JSON.stringify(monthlyRes.json)}`);
      assert.equal(monthlyRes.json.data.status, 'active');
      assert.equal(monthlyRes.json.data.pricePen ?? monthlyRes.json.data.amountPaidPen, 14.9);

      // 5d. Generate & Redeem Voucher
      const genRes = await api(
        'POST',
        '/subscriptions/vouchers/generate',
        {
          tier: 'premium',
          durationDays: 180,
          quantity: 1,
          codePrefix: 'E2E',
          notes: 'Prueba automatizada E2E',
        },
        adminToken,
      );
      assert.equal(genRes.status, 201, `Falló generación de voucher: ${JSON.stringify(genRes.json)}`);
      generatedVoucherCode = genRes.json.data.vouchers[0].code;
      assert.ok(generatedVoucherCode.startsWith('E2E-'));

      const redeemRes = await api(
        'POST',
        '/subscriptions/redeem',
        { code: generatedVoucherCode },
        accessToken,
      );
      assert.equal(redeemRes.status, 201, `Falló canje de voucher: ${JSON.stringify(redeemRes.json)}`);
      assert.equal(redeemRes.json.data.tier, 'premium');

      // 5e. Admin lists accounts and grants 1 Year (annual_1y)
      const adminAccountsRes = await api('GET', '/subscriptions/admin/accounts', undefined, adminToken);
      assert.equal(adminAccountsRes.status, 200, `Falló listado admin de cuentas: ${JSON.stringify(adminAccountsRes.json)}`);
      assert.ok(Array.isArray(adminAccountsRes.json.data) && adminAccountsRes.json.data.length >= 2);

      const grantRes = await api(
        'POST',
        `/subscriptions/admin/accounts/${userId}/grant`,
        {
          planType: 'annual_1y',
          notes: 'Extensión anual otorgada en prueba E2E',
        },
        adminToken,
      );
      assert.equal(grantRes.status, 201, `Falló asignación admin de tiempo: ${JSON.stringify(grantRes.json)}`);
      assert.equal(grantRes.json.data.durationDays, 365);

      const mySubRes = await api('GET', '/subscriptions/me', undefined, accessToken);
      assert.equal(mySubRes.status, 200);
      assert.equal(mySubRes.json.data.tier, 'premium');
      assert.equal(mySubRes.json.data.has_used_trial, true);
      assert.ok(mySubRes.json.data.days_remaining >= 365, `Esperado >= 365 días acumulados, recibido: ${mySubRes.json.data.days_remaining}`);
      assert.ok(Array.isArray(mySubRes.json.data.payments) && mySubRes.json.data.payments.length >= 2);
      assert.ok(Array.isArray(mySubRes.json.data.billing_options) && mySubRes.json.data.billing_options.length >= 4);

      // 5f. Change Password & Admin Password Reset
      const changePassRes = await api(
        'POST',
        '/auth/change-password',
        { currentPassword: testPassword, newPassword: 'NewUserPass2026!' },
        accessToken,
      );
      assert.equal(changePassRes.status, 200, `Falló cambio de contraseña: ${JSON.stringify(changePassRes.json)}`);

      const resetPassRes = await api(
        'POST',
        `/auth/admin/reset-password/${userId}`,
        { newPassword: testPassword },
        adminToken,
      );
      assert.equal(resetPassRes.status, 200, `Falló reseteo admin de contraseña: ${JSON.stringify(resetPassRes.json)}`);

      // 5g. Password Reset / Change via 6-digit Email Verification Code
      const reqCodeRes = await api('POST', '/auth/request-password-code', { email: testEmail });
      assert.equal(reqCodeRes.status, 200, `Falló solicitud de código por correo: ${JSON.stringify(reqCodeRes.json)}`);
      assert.equal(reqCodeRes.json.data.sent, true);
      const otpCode = reqCodeRes.json.data.verificationCodePreview;
      assert.ok(otpCode && otpCode.length === 6, 'Debe generar un código de 6 dígitos');

      const confCodeRes = await api('POST', '/auth/confirm-password-code', {
        email: testEmail,
        code: otpCode,
        newPassword: testPassword,
      });
      assert.equal(confCodeRes.status, 200, `Falló confirmación de código por correo: ${JSON.stringify(confCodeRes.json)}`);
      assert.equal(confCodeRes.json.data.updated, true);
    });

    // 6. PETS: Create Pet (with auto-generated unique QR), Get My Pets, Dashboard Summary & Update Pet
    let autoGeneratedQrCode = '';
    await step('6. Pets & Unique QR: Crear mascota con QR único automático, verificar inmutabilidad del QR al editar datos', async () => {
      const createRes = await api(
        'POST',
        '/pets',
        {
          name: 'Koda E2E',
          species: 'Perro',
          breed: 'Golden Retriever',
          sex: 'male',
          birthDate: '2023-05-15',
          color: 'Dorado',
          isSterilized: true,
          description: 'Muy amigable, lleva collar verde',
        },
        accessToken,
      );
      assert.equal(createRes.status, 201, `Error creando mascota: ${JSON.stringify(createRes.json)}`);
      createdPetId = createRes.json.data.id;
      autoGeneratedQrCode = createRes.json.data.qr_public_code;
      assert.ok(createdPetId);
      assert.ok(autoGeneratedQrCode?.startsWith('MQR-'), `Debe generar código QR único MQR-*, recibido: ${autoGeneratedQrCode}`);

      // Calling POST /qr/generate/:petId must return the exact same QR code (immutable)
      const ensureRes = await api('POST', `/qr/generate/${createdPetId}`, {}, accessToken);
      assert.equal(ensureRes.status, 201);
      assert.equal(ensureRes.json.data.qrCode, autoGeneratedQrCode, 'El QR único de la mascota no debe cambiar');
      assert.equal(ensureRes.json.data.alreadyExisted, true);

      // Scan the auto-generated unique QR before editing
      const scanBefore = await api('GET', `/qr/public/${autoGeneratedQrCode}`);
      assert.equal(scanBefore.status, 200);
      assert.equal(scanBefore.json.data.pet.name, 'Koda E2E');
      assert.equal(scanBefore.json.data.pet.color, 'Dorado');

      const listRes = await api('GET', '/pets', undefined, accessToken);
      assert.equal(listRes.status, 200);
      const found = listRes.json.data.find((p: any) => p.id === createdPetId);
      assert.ok(found, 'La mascota creada debe aparecer en GET /pets');
      assert.equal(found.qr_code, autoGeneratedQrCode);

      const dashRes = await api('GET', '/pets/dashboard/summary', undefined, accessToken);
      assert.equal(dashRes.status, 200, `Falló dashboard summary: ${JSON.stringify(dashRes.json)}`);
      assert.equal(dashRes.json.data.totalPets, 1);

      // Edit pet information -> QR code stays identical, destination data updates!
      const uniqueChip = `98511${runTimestamp.toString().slice(-10)}`;
      const patchRes = await api(
        'PATCH',
        `/pets/${createdPetId}`,
        {
          name: 'Koda Editado QR',
          color: 'Dorado Claro',
          microchipNumber: uniqueChip,
          description: 'Alérgico al pollo, muy dócil',
        },
        accessToken,
      );
      assert.equal(patchRes.status, 200, `Falló PATCH /pets/:id: ${JSON.stringify(patchRes.json)}`);
      assert.equal(patchRes.json.data.microchip_number, uniqueChip);

      const scanAfter = await api('GET', `/qr/public/${autoGeneratedQrCode}`);
      assert.equal(scanAfter.status, 200);
      assert.equal(scanAfter.json.data.qrCode, autoGeneratedQrCode, 'El código QR no cambia');
      assert.equal(scanAfter.json.data.pet.name, 'Koda Editado QR', 'El nombre en el destino del QR debe actualizarse');
      assert.equal(scanAfter.json.data.pet.color, 'Dorado Claro', 'El color en el destino del QR debe actualizarse');
      assert.equal(scanAfter.json.data.pet.microchipNumber, uniqueChip);
      assert.equal(scanAfter.json.data.pet.description, 'Alérgico al pollo, muy dócil');

      // Restore name 'Koda E2E' for subsequent assertions
      await api('PATCH', `/pets/${createdPetId}`, { name: 'Koda E2E' }, accessToken);
    });

    // 7. PETS: Emergency Contacts & Public Profile Privacy (both snake_case & camelCase)
    await step('7. Pets Privacy & Contacts: Agregar contacto de emergencia y guardar privacidad QR (snake_case y camelCase)', async () => {
      const contactRes = await api(
        'POST',
        `/pets/${createdPetId}/contacts`,
        {
          name: 'Carlos Mendoza',
          relationship: 'Hermano',
          phone: '+51911222333',
          whatsapp: '+51911222333',
          isPrimary: true,
        },
        accessToken,
      );
      assert.equal(contactRes.status, 201, `Falló agregar contacto: ${JSON.stringify(contactRes.json)}`);
      createdContactId = contactRes.json.data.id;

      // Test snake_case payload (as sent by PetDetailPage state)
      const privSnake = await api(
        'PATCH',
        `/pets/${createdPetId}/public-profile`,
        {
          pet_id: createdPetId,
          show_pet_name: true,
          show_owner_name: true,
          show_owner_phone: true,
          show_contacts: true,
          show_medical_info: true,
          emergency_message: 'Si me encuentras, llama a Lucia por favor.',
        },
        accessToken,
      );
      assert.equal(privSnake.status, 200, `Falló PATCH public-profile snake_case: ${JSON.stringify(privSnake.json)}`);
      assert.equal(privSnake.json.data.show_owner_name, true);
      assert.equal(privSnake.json.data.emergency_message, 'Si me encuentras, llama a Lucia por favor.');

      // 7b. Co-Caregivers (Collaborators)
      const addCollabRes = await api(
        'POST',
        `/pets/${createdPetId}/collaborators`,
        { email: 'admin@mascotasqr.pe', role: 'caregiver' },
        accessToken,
      );
      assert.equal(addCollabRes.status, 201, `Falló vincular co-cuidador familiar: ${JSON.stringify(addCollabRes.json)}`);
      assert.equal(addCollabRes.json.data.added, true);
      assert.ok(Array.isArray(addCollabRes.json.data.collaborators) && addCollabRes.json.data.collaborators.length >= 1);
      const collabUserId = addCollabRes.json.data.collaborators[0].user_id;

      const remCollabRes = await api(
        'DELETE',
        `/pets/${createdPetId}/collaborators/${collabUserId}`,
        undefined,
        accessToken,
      );
      assert.equal(remCollabRes.status, 200, `Falló desvincular co-cuidador familiar: ${JSON.stringify(remCollabRes.json)}`);
      assert.equal(remCollabRes.json.data.removed, true);
    });

    // 8. QR: Create QR Batch, List Available Tags, Assign QR Tag, Public Scan (Normal Mode)
    await step('8. QR Tags: Crear lote de placas QR (Admin), listar disponibles, vincular a mascota y escanear públicamente', async () => {
      const batchRes = await api(
        'POST',
        '/qr/batches',
        {
          batchCode: generatedBatchCode,
          quantity: 2,
          notes: 'Lote de prueba E2E',
        },
        adminToken,
      );
      assert.equal(batchRes.status, 201, `Error creando lote QR: ${JSON.stringify(batchRes.json)}`);
      assignedQrCode = batchRes.json.data.sampleTags[0];
      assert.ok(assignedQrCode);

      const availRes = await api('GET', '/qr/available', undefined, accessToken);
      assert.equal(availRes.status, 200);
      assert.ok(availRes.json.data.some((t: any) => t.public_code === assignedQrCode));

      const assignRes = await api(
        'POST',
        '/qr/assign',
        { publicCode: assignedQrCode, petId: createdPetId },
        accessToken,
      );
      assert.equal(assignRes.status, 201, `Error vinculando placa QR: ${JSON.stringify(assignRes.json)}`);

      const scanRes = await api('GET', `/qr/public/${assignedQrCode}`);
      assert.equal(scanRes.status, 200, `Error escaneando QR público: ${JSON.stringify(scanRes.json)}`);
      assert.equal(scanRes.json.data.status, 'active');
      assert.equal(scanRes.json.data.isLostMode, false);
      assert.equal(scanRes.json.data.pet.name, 'Koda E2E');
      qrTagId = scanRes.json.data.qrTagId;
    });

    // 9. LOST MODE & GPS RESCUE
    await step('9. Lost Mode & GPS: Activar Modo Perdido, escanear en emergencia, reportar ubicación GPS y verificar alerta', async () => {
      const reportRes = await api(
        'POST',
        `/lost-mode/activate/${createdPetId}`,
        {
          emergencyMessage: '¡RECOMPENSA! Se extravió en Parque Kennedy, es muy dócil.',
        },
        accessToken,
      );
      assert.equal(reportRes.status, 201, `Error activando Modo Perdido: ${JSON.stringify(reportRes.json)}`);
      lostModeEventId = reportRes.json.data.event.id;

      // Public scan should now return isLostMode === true
      const scanLostRes = await api('GET', `/qr/public/${assignedQrCode}`);
      assert.equal(scanLostRes.status, 200);
      assert.equal(scanLostRes.json.data.isLostMode, true);
      assert.equal(
        scanLostRes.json.data.pet.emergencyMessage,
        '¡RECOMPENSA! Se extravió en Parque Kennedy, es muy dócil.',
      );

      // Finder sends public GPS location ping
      const gpsRes = await api('POST', '/lost-mode/ping', {
        latitude: -12.1225,
        longitude: -77.0301,
        accuracyM: 8.5,
        lostModeEventId,
        qrTagId,
      });
      assert.equal(gpsRes.status, 201, `Error enviando GPS público: ${JSON.stringify(gpsRes.json)}`);
      assert.equal(gpsRes.json.data.success, true);

      // Owner checks locations & scan history
      const locsRes = await api('GET', `/lost-mode/history/${createdPetId}`, undefined, accessToken);
      assert.equal(locsRes.status, 200);
      assert.equal(locsRes.json.data.pings.length, 1);
      assert.ok(locsRes.json.data.scans.length >= 2, 'Debe registrar eventos de escaneo en bitácora');

      // Owner checks notifications
      const notifRes = await api('GET', '/notifications', undefined, accessToken);
      assert.equal(notifRes.status, 200);
      assert.ok(notifRes.json.data.length >= 1, 'El dueño debe recibir notificación de alerta GPS');

      // Resolve Lost Mode
      const resolveRes = await api(
        'POST',
        `/lost-mode/resolve/${createdPetId}`,
        {
          recoveryMethod: 'via_scan',
          ownerTestimonial: 'Recuperado gracias al escaneo QR en menos de 15 minutos',
        },
        accessToken,
      );
      assert.equal(resolveRes.status, 201, `Error resolviendo Modo Perdido: ${JSON.stringify(resolveRes.json)}`);
      assert.equal(resolveRes.json.data.resolved, true);
    });

    // 10. HEALTH PASSPORT & REMINDERS
    await step('10. Health Passport: Vacunas, Desparasitación, Tratamientos, Peso, Citas, Documentos y Recordatorios Automáticos', async () => {
      // Vaccination with future nextDueDate -> triggers automatic reminder
      const nextDue = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const vacRes = await api(
        'POST',
        `/health/pets/${createdPetId}/vaccinations`,
        {
          vaccineName: 'Séxtuple Canina Anual',
          applicationDate: '2026-01-15',
          nextDueDate: nextDue,
          veterinarianName: 'Dr. Roberto Gómez',
          clinicName: 'Clínica Vet Miraflores',
        },
        accessToken,
      );
      assert.equal(vacRes.status, 201, `Falló crear vacuna: ${JSON.stringify(vacRes.json)}`);

      // Deworming
      const dewRes = await api(
        'POST',
        `/health/pets/${createdPetId}/deworming`,
        {
          productName: 'Simparica Trio',
          applicationDate: '2026-02-01',
          nextDueDate: nextDue,
          weightAtApplicationKg: 26.5,
        },
        accessToken,
      );
      assert.equal(dewRes.status, 201, `Falló crear desparasitación: ${JSON.stringify(dewRes.json)}`);

      // Treatment + Complete status
      const treatRes = await api(
        'POST',
        `/health/pets/${createdPetId}/treatments`,
        {
          treatmentName: 'Tratamiento Otitis Externa',
          medicationName: 'Otomax gotas',
          dosage: '4 gotas',
          frequency: 'Cada 12 horas',
          startDate: '2026-02-10',
        },
        accessToken,
      );
      assert.equal(treatRes.status, 201, `Falló crear tratamiento: ${JSON.stringify(treatRes.json)}`);
      createdTreatmentId = treatRes.json.data.id;

      const treatStatusRes = await api(
        'PATCH',
        `/health/pets/${createdPetId}/treatments/${createdTreatmentId}/status`,
        { status: 'completed' },
        accessToken,
      );
      assert.equal(treatStatusRes.status, 200);
      assert.equal(treatStatusRes.json.data.status, 'completed');

      // Weight Record
      const weightRes = await api(
        'POST',
        `/health/pets/${createdPetId}/weight`,
        {
          weightKg: 28.0,
          measuredAt: '2026-03-01',
          notes: 'Peso ideal alcanzado',
        },
        accessToken,
      );
      assert.equal(weightRes.status, 201, `Falló crear peso: ${JSON.stringify(weightRes.json)}`);

      // Appointment -> triggers automatic reminder + Complete status
      const apptDate = new Date(Date.now() + 3 * 86400000).toISOString();
      const apptRes = await api(
        'POST',
        `/health/pets/${createdPetId}/appointments`,
        {
          scheduledAt: apptDate,
          reason: 'Chequeo General Semestral',
          notes: 'Clínica Veterinaria San Martín',
        },
        accessToken,
      );
      assert.equal(apptRes.status, 201, `Falló crear cita: ${JSON.stringify(apptRes.json)}`);
      createdAppointmentId = apptRes.json.data.id;

      // Verify upcoming reminders before completing appointment
      const remindersRes = await api('GET', '/notifications/reminders', undefined, accessToken);
      assert.equal(remindersRes.status, 200);
      assert.ok(
        remindersRes.json.data.length >= 3,
        `Se esperaban >= 3 recordatorios automáticos, recibidos ${remindersRes.json.data.length}`,
      );

      const apptStatusRes = await api(
        'PATCH',
        `/health/pets/${createdPetId}/appointments/${createdAppointmentId}/status`,
        { status: 'completed' },
        accessToken,
      );
      assert.equal(apptStatusRes.status, 200);
      assert.equal(apptStatusRes.json.data.status, 'completed');

      // Medical Document
      const docRes = await api(
        'POST',
        `/health/pets/${createdPetId}/documents`,
        {
          documentType: 'vaccination_card',
          fileName: `cartilla_firmada_${runTimestamp}.pdf`,
          storagePath: `data:application/pdf;id=${runTimestamp};base64,JVBERi0xLjQK`,
          mimeType: 'application/pdf',
          fileSizeBytes: 1024,
        },
        accessToken,
      );
      assert.equal(docRes.status, 201, `Falló subir documento médico: ${JSON.stringify(docRes.json)}`);
    });

    // 11. STORE, VETERINARY DIRECTORY & AUDIT LOGS
    await step('11. Commerce, Veterinary & Audit: Catálogo tienda, orden con cupón BIENVENIDO20, directorio vet y auditoría', async () => {
      const prodRes = await api('GET', '/commerce/products');
      assert.equal(prodRes.status, 200, `Falló GET /commerce/products: ${JSON.stringify(prodRes.json)}`);
      assert.ok(prodRes.json.data.length >= 1, 'Debe haber productos en la tienda');

      const firstProduct = prodRes.json.data[0];
      const orderRes = await api(
        'POST',
        '/commerce/orders',
        {
          items: [{ productId: firstProduct.id, quantity: 1 }],
          couponCode: 'BIENVENIDO20',
          shippingAddress: 'Av. Arequipa 1234, Lince',
          shippingCity: 'Lima',
        },
        accessToken,
      );
      assert.equal(orderRes.status, 201, `Error creando orden en tienda: ${JSON.stringify(orderRes.json)}`);
      assert.ok(Number(orderRes.json.data.discount) > 0, 'Debe aplicar descuento del cupón BIENVENIDO20');

      const vetsRes = await api('GET', '/veterinary/clinics', undefined, accessToken);
      assert.equal(vetsRes.status, 200);
      assert.ok(vetsRes.json.data.length >= 1, 'Debe listar clínicas veterinarias aliadas');

      const auditRes = await api('GET', '/audit/logs?limit=20', undefined, adminToken);
      assert.equal(auditRes.status, 200, `Falló GET /audit/logs: ${JSON.stringify(auditRes.json)}`);
      assert.ok(auditRes.json.data.length >= 1, 'Debe retornar registros de auditoría');
    });

    // 12. QR UNASSIGN & CONTACT DELETE
    await step('12. Clean Flows: Desvincular placa QR para reemplazo y eliminar contacto de emergencia', async () => {
      const unassignRes = await api(
        'POST',
        '/qr/unassign',
        { publicCode: assignedQrCode, reason: 'Fin de prueba E2E' },
        accessToken,
      );
      assert.equal(unassignRes.status, 201, `Falló desvincular QR: ${JSON.stringify(unassignRes.json)}`);
      assert.equal(unassignRes.json.data.unassigned, true);

      const delContactRes = await api(
        'DELETE',
        `/pets/${createdPetId}/contacts/${createdContactId}`,
        undefined,
        accessToken,
      );
      assert.equal(delContactRes.status, 200, `Falló eliminar contacto: ${JSON.stringify(delContactRes.json)}`);
    });
  } finally {
    // Cleanup test data from database so production/seed data stays spotless
    try {
      if (userId) {
        await db.query(
          `DELETE FROM public.qr_tag_assignments WHERE pet_id IN (SELECT id FROM public.pets WHERE owner_id = $1)`,
          [userId],
        );
        await db.query(`DELETE FROM public.pets WHERE owner_id = $1`, [userId]);
        await db.query(`DELETE FROM public.coupon_redemptions WHERE user_id = $1`, [userId]);
        await db.query(`DELETE FROM public.orders WHERE user_id = $1`, [userId]);
        await db.query(`DELETE FROM public.payments WHERE user_id = $1`, [userId]);
        await db.query(`DELETE FROM public.subscriptions WHERE user_id = $1`, [userId]);
        await db.query(
          `DELETE FROM public.qr_tags WHERE production_batch_id IN (SELECT id FROM public.tag_production_batches WHERE batch_code = $1)`,
          [generatedBatchCode],
        );
        await db.query(`DELETE FROM public.tag_production_batches WHERE batch_code = $1`, [generatedBatchCode]);
        if (generatedVoucherCode) {
          await db.query(`DELETE FROM public.subscription_vouchers WHERE code = $1`, [generatedVoucherCode]);
        }
        await db.query(`DELETE FROM public.users WHERE id = $1`, [userId]);
        await db.query(`DELETE FROM identity.user_accounts WHERE id = $1`, [userId]);
      }
    } catch (cleanupErr) {
      console.warn('⚠️ Nota durante limpieza E2E:', cleanupErr);
    }
    await app.close();
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n==================================================================');
  console.log(`📊 RESUMEN FINAL: ${passedCount}/${results.length} pruebas superadas (${failedCount} fallidas)`);
  console.log('==================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSuite();
