# 📱 Guía para Empaquetar y Compartir MaskayPet con Contactos

Esta guía detalla los pasos para que tus contactos puedan instalar y usar la aplicación en cualquier parte del mundo (24/7).

---

## 1. Estado Actual

1. **APK Generado:** Ya tienes el archivo instalable de Android listo en la raíz del proyecto:
   - **Ruta:** `MaskayPet.apk`
   - **Tamaño:** ~4.2 MB
2. **Script de Automatización:** Se creó el archivo `generar-apk.bat` para compilar un nuevo APK en 1 solo clic cada vez que hagas cambios.

---

## 2. Paso Clave: Conectar el Backend en la Nube (Render.com)

Actualmente tu base de datos ya está en la nube (Supabase AWS), pero el servidor API debe estar accesible en internet para que tus contactos puedan iniciar sesión y usar la app desde sus casas o redes móviles.

### Pasos para desplegar en Render (Gratis y en 5 minutos):

1. **Crear cuenta o ingresar en Render:**
   - Entra a [https://render.com](https://render.com) e inicia sesión (puedes usar GitHub o Google).

2. **Crear un nuevo Web Service:**
   - Clic en **New +** > **Web Service**.
   - Si tienes tu repositorio en GitHub/GitLab, conéctalo.
   - *(O si usas Docker/CLI, puedes usar el repositorio de código)*.

3. **Configuración del servicio:**
   - **Name:** `maskaypet-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Plan:** `Free`

4. **Variables de Entorno (Environment Variables):**
   - En la sección **Environment**, haz clic en **"Add from .env"** o añade las variables.
   - Abre el archivo preparado: `docs/ENV_RENDER.txt` y copia todo el texto directamente allí.
   - Haz clic en **Create Web Service**.

5. **Obtener tu URL pública:**
   - En 2-3 minutos Render te dará tu URL HTTPS, por ejemplo:
     `https://maskaypet-api.onrender.com`

---

## 3. Actualizar el APK con la URL de la Nube

Una vez que tengas tu URL de Render (ejemplo: `https://maskaypet-api.onrender.com`):

1. Abre el archivo `frontend/.env` y reemplaza la línea por:
   ```env
   VITE_API_URL=https://maskaypet-api.onrender.com/api/v1
   ```
2. Ejecuta el archivo:
   - **Doble clic en `generar-apk.bat`** (en la carpeta principal del proyecto).
3. El script recompilará el frontend y generará el nuevo archivo `MaskayPet.apk` actualizado.

---

## 4. Cómo compartir el APK a tus contactos

1. Pasa el archivo `MaskayPet.apk` por:
   - **WhatsApp / Telegram:** Envíalo como "Documento" (para que no se altere el archivo).
   - **Google Drive / Dropbox / WeTransfer:** Sube el APK y pásales el enlace de descarga.
2. **Instrucciones para tus contactos al instalar:**
   - Al abrir el APK en su teléfono Android, el sistema les pedirá habilitar *"Permitir instalar aplicaciones de orígenes desconocidos"* (es el aviso estándar para APKs de prueba fuera de Google Play Store).
   - Presionan **Instalar** y ¡listo! Ya pueden abrir **MaskayPet**, registrarse y probar.

---

## 5. Extra: ¿Contactos con iPhone o PC? (Versión Web)

Si tienes contactos con iPhone (iOS) o que prefieran probar sin instalar un APK:
- Puedes subir la carpeta `frontend/dist` a **Vercel** o **Netlify** (conectar repositorio o arrastrar la carpeta `dist`).
- Tendrás un enlace web directo (ej. `https://maskaypet.vercel.app`) que funciona en cualquier dispositivo.
