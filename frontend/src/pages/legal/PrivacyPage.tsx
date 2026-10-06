import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Legal.module.css';

export const PrivacyPage: React.FC = () => {
  return (
    <div className={styles.legalContainer}>
      <header className={styles.legalHeader}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brandLink}>
            <div className={styles.logoIcon}>
              <img src="/logo-circle.jpg" alt="MaskayPet Logo" className={styles.logoImg} />
            </div>
            <div>
              <span className={styles.brandName}>MaskayPet</span>
              <span className={styles.brandTagline}>Care & Rescue System</span>
            </div>
          </Link>
          <Link to="/register" className={styles.backBtn}>
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver</span>
          </Link>
        </div>
      </header>

      <main className={styles.legalContent}>
        <div className={styles.legalCard}>
          <div className={styles.titleSection}>
            <h1>Política de Privacidad y Protección de Datos</h1>
            <span className={styles.lastUpdated}>Última actualización: Octubre 2026 • Plataforma MaskayPet</span>
          </div>

          <div className={styles.bodySection}>
            <div className={styles.highlightBox}>
              <strong>Tu privacidad es nuestra prioridad:</strong> En MaskayPet tú tienes el control total sobre qué información personal es visible públicamente en la placa inteligente de tu mascota y qué datos permanecen privados en tu panel.
            </div>

            <h2>1. Responsable del Tratamiento de Datos</h2>
            <p>
              El tratamiento de los datos personales recabados a través de la plataforma <strong>MaskayPet</strong> se realiza conforme a los más altos estándares de seguridad y en estricto cumplimiento de las normativas vigentes sobre protección de datos personales.
            </p>

            <h2>2. Información que Recopilamos</h2>
            <p>
              Para prestar los servicios de identificación, pasaporte de salud y auxilio satelital, recopilamos las siguientes categorías de datos:
            </p>
            <ul>
              <li>
                <strong>Datos del Tutor Registrado:</strong> Nombres, apellidos, número de teléfono móvil / WhatsApp, correo electrónico y credenciales de acceso debidamente cifradas (Argon2).
              </li>
              <li>
                <strong>Datos de la Mascota:</strong> Nombre, especie, raza, sexo, fecha de nacimiento o edad aproximada, color, rasgos particulares, número de microchip, fotografías y registro de esterilización.
              </li>
              <li>
                <strong>Historial Clínico:</strong> Vacunas aplicadas, fechas de refuerzo, desparasitaciones, diagnósticos médicos, pesajes y citas veterinarias.
              </li>
              <li>
                <strong>Contactos de Emergencia:</strong> Nombres, relación y teléfonos de familiares autorizados para recibir avisos de auxilio.
              </li>
              <li>
                <strong>Datos de Escaneo y Geolocalización:</strong> Coordenadas GPS (latitud, longitud, precisión en metros) transmitidas puntualmente por el navegador del rescatista con su consentimiento expreso al escanear la placa.
              </li>
            </ul>

            <h2>3. Finalidad del Tratamiento de Datos</h2>
            <p>Tus datos son utilizados exclusivamente para:</p>
            <ul>
              <li>Permitir el funcionamiento del carnet digital y pasaporte de salud de tu mascota.</li>
              <li>Desplegar la ficha de rescate en la placa QR en caso de extravío.</li>
              <li>Transmitir al tutor las alertas satelitales con mapa interactivo cuando la mascota es localizada.</li>
              <li>Facilitar los botones de llamada y WhatsApp directo entre el rescatista y el tutor.</li>
              <li>Enviar notificaciones de recordatorio sobre próximas vacunas o vencimientos de desparasitación.</li>
            </ul>

            <h2>4. Privacidad Gradual y Control del Tutor</h2>
            <p>
              En la pestaña <strong>"Privacidad del QR"</strong> de cada mascota, el tutor puede encender o apagar en cualquier momento la visibilidad pública de:
            </p>
            <ul>
              <li>Nombre del tutor y teléfono principal.</li>
              <li>Contactos de emergencia alternativos.</li>
              <li>Resumen de condiciones médicas y alergias.</li>
            </ul>
            <p>
              Si el <strong>Modo Perdido</strong> no está activado, la placa solo muestra los datos mínimos que hayas autorizado voluntariamente para el día a día.
            </p>

            <h2>5. Tratamiento de la Ubicación de Quien Escanea (Rescatista)</h2>
            <p>
              MaskayPet respeta escrupulosamente la privacidad de los transeúntes y rescatistas:
            </p>
            <ul>
              <li>La ubicación GPS nunca se obtiene de forma oculta ni en segundo plano.</li>
              <li>Solo se transmite si el rescatista presiona deliberadamente el botón <em>"Compartir mi Ubicación de Rescate Ahora"</em> y autoriza el permiso en el diálogo oficial de su navegador (Chrome, Safari, etc.).</li>
              <li>Las coordenadas se utilizan única y exclusivamente para graficar el punto de encuentro en el radar satelital del dueño de la mascota.</li>
            </ul>

            <h2>6. Seguridad y Almacenamiento</h2>
            <p>
              Implementamos protocolos de seguridad robustos, incluyendo cifrado SSL/TLS en todas las transmisiones de datos (HTTPS), almacenamiento seguro en bases de datos con Row Level Security (RLS) y tokens de autenticación JWT protegidos contra accesos no autorizados.
            </p>

            <h2>7. Tus Derechos (Acceso, Rectificación y Supresión)</h2>
            <p>
              Puedes acceder, modificar o eliminar tus datos y los de tus mascotas en cualquier momento desde tu panel de usuario o solicitar la baja definitiva de tu cuenta y desvinculación de placas a través de los canales oficiales de soporte de MaskayPet.
            </p>
          </div>
        </div>
      </main>

      <footer className={styles.legalFooter}>
        <div className={styles.legalFooterNav}>
          <Link to="/terminos">Términos y Condiciones</Link>
          <span>•</span>
          <Link to="/login">Iniciar Sesión</Link>
          <span>•</span>
          <Link to="/register">Crear Cuenta</Link>
        </div>
        <p>© 2026 MaskayPet. Red Inteligente de Cuidado y Rescate Animal. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};
