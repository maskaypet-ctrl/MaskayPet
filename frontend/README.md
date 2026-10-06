# Mascotas QR - Frontend Web Platform

Plataforma frontend moderna, modular y reactiva para el sistema de identificación inteligente, pasaporte de salud y rescate de **Mascotas QR**.

---

## 🏛 Arquitectura Frontend

Construido con **React 18 + TypeScript + Vite + CSS Modules**:
- **Design System Propio**: Tokens CSS en `src/styles/variables.css` con tipografías *Plus Jakarta Sans* e *Inter*.
- **Desacoplamiento Modular**: Cada vista y componente cuenta con su propio archivo `.module.css`.
- **Capa de Servicios REST**: Conectado a la API NestJS (`http://localhost:4000/api/v1`) con rotación automática de tokens JWT.
- **Rutas y Vistas**:
  - `/login` y `/register`: Autenticación y registro de tutores.
  - `/dashboard`: Panel general con telemetría en tiempo real, resumen de mascotas y botón de activación de Modo Perdido.
  - `/pets`: Listado, búsqueda y registro de mascotas.
  - `/pets/:id`: Ficha clínica integral (Pasaporte de salud, vacunas, desparasitaciones, tratamientos, pesajes, contactos de emergencia y configuración de privacidad del QR).
  - `/vincular-qr`: Asistente de 3 pasos para vincular chapas físicas QR a mascotas.
  - `/tienda`: Catálogo de placas en aluminio y acero con checkout y redención de cupones.
  - `/cuenta`: Mi perfil, estado de plan y **canje de códigos de activación de un solo uso (Vouchers de 1 mes, 6 meses, 1 año)**.
  - `/admin/vouchers`: Panel administrativo para emitir lotes de códigos de activación y auditar canjes.
  - `/qr/:code`: **Perfil público móvil de rescate** (sin necesidad de login) con botón para transmitir coordenadas GPS en tiempo real al dueño.

---

## 🚀 Ejecución en Desarrollo

```bash
# 1. Instalar dependencias
cd frontend
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para producción
npm run build
```

La aplicación abrirá por defecto en `http://localhost:3000`.
