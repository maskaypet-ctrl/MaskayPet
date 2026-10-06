import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Legal.module.css';

export const TermsPage: React.FC = () => {
  return (
    <div className={styles.legalContainer}>
      <header className={styles.legalHeader}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brandLink}>
            <div className={styles.logoIcon}>
              <span className="material-symbols-outlined">pets</span>
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
            <h1>Términos y Condiciones de Uso</h1>
            <span className={styles.lastUpdated}>Última actualización: Octubre 2026 • Plataforma MaskayPet</span>
          </div>

          <div className={styles.bodySection}>
            <div className={styles.highlightBox}>
              <strong>Resumen de Compromiso:</strong> MaskayPet es un ecosistema tecnológico diseñado para la identificación preventiva, pasaporte médico y auxilio en el reencuentro de mascotas. Al crear una cuenta o escanear una placa QR, aceptas los presentes términos.
            </div>

            <h2>1. Aceptación de los Términos</h2>
            <p>
              El acceso, registro y uso de la plataforma digital MaskayPet (incluyendo aplicaciones web, servicios de enlace de placas QR físicas, pasaportes clínicos y herramientas de geolocalización satelital) se rige bajo los presentes Términos y Condiciones. Si no estás de acuerdo con alguna cláusula, debes abstenerte de utilizar la plataforma.
            </p>

            <h2>2. Definición del Servicio</h2>
            <p>
              MaskayPet proporciona herramientas digitales que permiten a los tutores de mascotas:
            </p>
            <ul>
              <li>Vincular y gestionar placas físicas con códigos QR únicos e infalsificables.</li>
              <li>Mantener un pasaporte clínico con vacunas, desparasitaciones, citas y tratamientos veterinarios.</li>
              <li>Activar el <strong>Modo Perdido</strong> en caso de extravío para desplegar alertas de emergencia.</li>
              <li>Recibir coordenadas satelitales (GPS) cuando un tercero escanea voluntariamente la placa del animal.</li>
            </ul>

            <h2>3. Responsabilidad del Tutor de la Mascota</h2>
            <p>
              Como tutor registrado en MaskayPet, te comprometes a:
            </p>
            <ul>
              <li>Proporcionar información fidedigna respecto a tu identidad, números de contacto y datos de tus mascotas.</li>
              <li>Mantener actualizada la información médica crítica (alergias, padecimientos, medicación activa).</li>
              <li>Custodiar debidamente tu contraseña y credenciales de acceso.</li>
              <li>No utilizar la plataforma para fines ilícitos, suplantación de identidad o comercialización indebida de animales.</li>
            </ul>

            <h2>4. Protocolo de Rescate y Geolocalización Satelital</h2>
            <p>
              MaskayPet actúa como un puente tecnológico de auxilio. Es fundamental comprender las siguientes condiciones operativas:
            </p>
            <ul>
              <li>
                <strong>Naturaleza tecnológica:</strong> MaskayPet no es una empresa de patrullaje físico ni garantiza la recuperación de un animal extraviado o robado; facilita el contacto directo entre quien encuentra a la mascota y su tutor.
              </li>
              <li>
                <strong>Consentimiento del rescatista:</strong> La transmisión de coordenadas GPS por parte de un transeúnte o rescatista es voluntaria y requiere la autorización explícita a través de su navegador móvil conforme a las normas de seguridad del dispositivo.
              </li>
              <li>
                <strong>Precisión de ubicación:</strong> La exactitud de las coordenadas depende del hardware del dispositivo móvil del rescatista y de la disponibilidad de señal satelital o redes de datos al momento del escaneo.
              </li>
            </ul>

            <h2>5. Propiedad Intelectual</h2>
            <p>
              El nombre comercial <strong>MaskayPet</strong>, su logotipo, software, interfaces gráficas, bases de datos y algoritmos de asignación de placas son propiedad exclusiva de MaskayPet. Queda prohibida la reproducción, duplicación no autorizada de placas inteligentes o ingeniería inversa de los sistemas.
            </p>

            <h2>6. Suspensión y Cancelación de Cuenta</h2>
            <p>
              MaskayPet se reserva el derecho de desactivar perfiles o desvincular placas que incumplan las normas comunitarias, presenten datos falsos o incurran en uso malicioso del sistema de emergencia satelital.
            </p>

            <h2>7. Modificaciones a los Términos</h2>
            <p>
              Nos reservamos el derecho de actualizar estos términos para reflejar mejoras en la plataforma o exigencias legales. Las modificaciones sustanciales serán notificadas a través de la plataforma o al correo electrónico registrado.
            </p>
          </div>
        </div>
      </main>

      <footer className={styles.legalFooter}>
        <div className={styles.legalFooterNav}>
          <Link to="/privacidad">Política de Privacidad</Link>
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
