# Mascotas QR - Backend API (NestJS + PostgreSQL / Supabase)

Backend modular y de alto rendimiento para la plataforma de identificación inteligente, pasaporte digital de salud y sistema de emergencia Modo Perdido de **Mascotas QR**.

---

## 🏛 Arquitectura del Sistema

Construido siguiendo los principios de **Monolito Modular** y **DDD ligero**:
- **Desacoplamiento Estricto de Identidad y Negocio**: El esquema `identity` maneja cuentas y credenciales con **Argon2id**, mientras que `public` gestiona la lógica de mascotas, salud, placas QR y comercio.
- **Auditoría Automática**: El esquema `audit` registra automáticamente cambios en tablas sensibles (`audit_logs`) mediante triggers en PostgreSQL aprovechando variables de contexto de sesión (`app.user_id`, `app.ip_address`).
- **Respeto a la Privacidad por Defecto**: El endpoint público de escaneo QR (`/api/v1/qr/public/:code`) solo expone la información explícitamente autorizada por el dueño en `public.pet_public_profiles`.
- **Modo Perdido & GPS Pings**: En caso de extravío, permite a cualquier persona que escanee la chapa enviar coordenadas GPS en tiempo real sin instalar ninguna aplicación.

---

## 📦 Módulos Implementados

| Módulo | Endpoint Base | Descripción |
| :--- | :--- | :--- |
| **Identity / Auth** | `/api/v1/auth` | Registro, Login con Argon2id, rotación de sesiones JWT y Refresh Token. |
| **Users** | `/api/v1/users` | Perfiles de usuario, avatars y datos de contacto. |
| **Pets** | `/api/v1/pets` | CRUD de mascotas, contactos de emergencia, colaboradores y configuración de privacidad. |
| **QR Tags** | `/api/v1/qr` | Resolución pública de escaneo, vinculación/desvinculación de chapas y lotes de producción. |
| **Lost Mode** | `/api/v1/lost-mode` | Activación de Modo Perdido, recepción de coordenadas GPS (`location_pings`) y resolución de caso. |
| **Health** | `/api/v1/health` | Vacunas, desparasitaciones, tratamientos, diagnósticos, peso, citas y documentos. |
| **Notifications** | `/api/v1/notifications` | Preferencias de alerta (Push/Email/SMS), tokens de dispositivo (FCM/Expo) y recordatorios. |
| **Subscriptions** | `/api/v1/subscriptions` | Catálogo de planes (Free / Premium), límites y suscripciones activas. |
| **Commerce** | `/api/v1/commerce` | Catálogo de placas y collares, cupones de descuento y pedidos en PEN. |
| **Veterinary** | `/api/v1/veterinary` | Directorio de clínicas veterinarias y profesionales. |
| **Audit** | `/api/v1/audit` | Consulta de trazas de auditoría (Admin / Support). |

---

## 🚀 Despliegue y Ejecución

### 1. Requisitos Previos
- Node.js v18+ o v20+
- PostgreSQL 15+ (o proyecto en Supabase)

### 2. Base de Datos en Supabase
1. Abre tu proyecto en [Supabase](https://supabase.com).
2. Ve a **SQL Editor**.
3. Pega y ejecuta el contenido de [`database/schema_v1.sql`](file:///c:/Users/murci/Desktop/MVP-mascotas/database/schema_v1.sql).
4. (Opcional) Ejecuta [`database/seed_v1.sql`](file:///c:/Users/murci/Desktop/MVP-mascotas/database/seed_v1.sql) para cargar datos de prueba.

### 3. Configuración de Variables de Entorno (`.env`)
Edita el archivo `backend/.env` con la cadena de conexión de tu base de datos de Supabase:

```env
PORT=4000
DATABASE_URL=postgresql://postgres.xxxx:tu_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=tu-clave-secreta-jwt-de-al-menos-32-caracteres
```

### 4. Iniciar el Servidor
```bash
# Modo desarrollo con recarga en caliente
npm run start:dev

# Compilar para producción
npm run build
npm run start:prod
```

### 5. Documentación Interactiva Swagger
Una vez iniciado el servidor, accede a:
👉 `http://localhost:4000/docs`
