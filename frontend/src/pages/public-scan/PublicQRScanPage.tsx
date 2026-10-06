import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { qrService } from '../../services/qr.service';
import { lostService } from '../../services/lost.service';
import { useToast } from '../../contexts/ToastContext';
import { PublicQRScanResponse } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { PetAvatar } from '../../components/ui/PetAvatar';
import styles from './PublicQRScan.module.css';

export const PublicQRScanPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { success, error, info } = useToast();

  const [data, setData] = useState<PublicQRScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingGPS, setIsSendingGPS] = useState(false);
  const [gpsSent, setGpsSent] = useState(false);

  useEffect(() => {
    if (!code) return;
    qrService
      .resolvePublicScan(code)
      .then((res) => setData(res))
      .catch((err) => {
        error(err.response?.data?.message || 'Código QR no reconocido o inválido');
      })
      .finally(() => setIsLoading(false));
  }, [code, error]);

  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      error('La geolocalización no es compatible con este navegador.');
      return;
    }

    setIsSendingGPS(true);
    info('Obteniendo coordenadas GPS de tu dispositivo...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await lostService.sendLocationPing({
            lostModeEventId: data?.lostModeEventId || undefined,
            qrTagId: data?.qrTagId || undefined,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
          });

          success('¡Ubicación GPS enviada con éxito al dueño de la mascota! Muchísimas gracias.');
          setGpsSent(true);
        } catch {
          error('Error al transmitir la ubicación al servidor');
        } finally {
          setIsSendingGPS(false);
        }
      },
      () => {
        error('Por favor permite el acceso a tu ubicación para enviar las coordenadas de rescate.');
        setIsSendingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  if (isLoading) {
    return (
      <div className={styles.loadingWrapper}>
        <Spinner label="Verificando placa inteligente en la red satelital..." />
      </div>
    );
  }

  if (!data || data.status === 'lost' || data.status === 'damaged' || data.status === 'retired') {
    return (
      <div className={styles.container}>
        <Card padding="lg" className={styles.errorCard}>
          <span className={`material-symbols-outlined ${styles.alertIcon}`}>error</span>
          <h2>Placa Inactiva o Desconocida</h2>
          <p>{data?.message || 'El código escaneado no corresponde a una placa activa registrada.'}</p>
        </Card>
      </div>
    );
  }

  if (data.status === 'unassigned') {
    return (
      <div className={styles.container}>
        <Card padding="lg" className={styles.unassignedCard}>
          <span className={`material-symbols-outlined ${styles.qrIcon}`}>qr_code_2</span>
          <h2>Placa QR Lista para Activación</h2>
          <p>Esta placa física ({data.qrCode}) aún no ha sido enlazada a ninguna mascota.</p>
          <div className={styles.unassignedActions}>
            <a href="/login" className={styles.loginLink}>
              ¿Eres el dueño? Inicia sesión para vincularla
            </a>
          </div>
        </Card>
      </div>
    );
  }

  const { pet, owner, contacts, isLostMode, medicalSummary } = data;

  return (
    <div className={styles.container}>
      {/* Platform Public Branding Header */}
      <div className={styles.publicHeader}>
        <div className={styles.publicLogoBox}>
          <img src="/logo-circle.png" alt="MaskayPet Logo" className={styles.publicLogoImg} />
        </div>
        <div className={styles.publicHeaderText}>
          <span className={styles.publicBrandName}>MaskayPet</span>
          <span className={styles.publicBrandTag}>Red Inteligente de Identificación y Rescate</span>
        </div>
      </div>

      {/* 1. Emergency Banner if Lost */}
      {isLostMode && (
        <div className={styles.emergencyTopBanner}>
          <div className={styles.emergencyIconPulse}>
            <span className="material-symbols-outlined animate-pulse-fast">warning</span>
          </div>
          <div className={styles.emergencyText}>
            <h2>¡ESTA MASCOTA SE ENCUENTRA EXTRAVIADA!</h2>
            <p>
              Su familia la está buscando desesperadamente. Por favor comunícate de inmediato con
              los contactos de abajo.
            </p>
          </div>
        </div>
      )}

      {/* 2. Geolocation Rescue Button (Crucial) */}
      <Card padding="md" className={styles.gpsCard}>
        <div className={styles.gpsHeader}>
          <span className="material-symbols-outlined text-primary">my_location</span>
          <div>
            <h3>Compartir Ubicación del Hallazgo</h3>
            <p className={styles.gpsDesc}>
              Envía tus coordenadas GPS directas al dueño de forma anónima para que sepa dónde está.
            </p>
          </div>
        </div>

        <Button
          variant={isLostMode ? 'emergency' : 'primary'}
          size="lg"
          fullWidth
          icon="location_on"
          onClick={handleSendLocation}
          isLoading={isSendingGPS}
          disabled={gpsSent}
        >
          {gpsSent ? '✓ Ubicación Enviada con Éxito' : '📍 Enviar Mi Ubicación Actual al Dueño'}
        </Button>
        <p style={{ fontSize: '11px', color: 'var(--outline)', marginTop: '8px', textAlign: 'center', lineHeight: '1.4' }}>
          🛡️ <strong>Consentimiento seguro:</strong> Al pulsar el botón, autorizas la transmisión voluntaria y puntual de tus coordenadas GPS exclusivamente al tutor registrado para auxiliar en la localización de la mascota.
        </p>
      </Card>

      {/* 3. Pet Main Identity Card */}
      <Card padding="lg" className={styles.petCard}>
        <div className={styles.petHead}>
          <PetAvatar
            src={pet?.photoStoragePath}
            name={pet?.name || 'Mascota'}
            species={pet?.species}
            size="lg"
          />
          <div className={styles.petTitles}>
            <h1 className={styles.petName}>{pet?.name || 'Mascota Protegida'}</h1>
            <p className={styles.petBreed}>
              {pet?.species === 'perro' ? '🐕 Canino' : '🐈 Felino'} • {pet?.breed || 'Raza Mixta'}
            </p>
            <div className={styles.badgeRow}>
              <Badge variant="success" size="sm">
                <span className="material-symbols-outlined" style={{ fontSize: '13px', marginRight: '3px' }}>
                  verified
                </span>
                Placa Inteligente Activa
              </Badge>
            </div>
          </div>
        </div>

        {pet?.emergencyMessage && (
          <div className={styles.ownerEmergencyMessage}>
            <span className="material-symbols-outlined">campaign</span>
            <div>
              <strong>Mensaje de la Familia:</strong>
              <p>{pet.emergencyMessage}</p>
            </div>
          </div>
        )}

        {pet?.description && (
          <div className={styles.petDescBox}>
            <p><strong>Detalles:</strong> {pet.description}</p>
          </div>
        )}
      </Card>

      {/* 4. Emergency Contacts & Direct Call / WhatsApp */}
      <Card padding="lg" className={styles.contactsCard}>
        <div className={styles.cardHeaderWithIcon}>
          <span className="material-symbols-outlined text-primary">contact_phone</span>
          <h3>Contactos Directos de Rescate</h3>
        </div>

        <div className={styles.contactsList}>
          {owner?.phone && (
            <div className={styles.contactItem}>
              <div>
                <strong>Tutor Principal ({owner.name || 'Dueño'})</strong>
                <p className={styles.contactPhoneText}>{owner.phone}</p>
              </div>
              <div className={styles.contactButtons}>
                <a href={`tel:${owner.phone}`} className={styles.callBtn}>
                  <span className="material-symbols-outlined">call</span>
                  <span>Llamar</span>
                </a>
                <a
                  href={`https://wa.me/${owner.phone.replace(/[^0-9]/g, '')}?text=Hola,%20tengo%20informaci%C3%B3n%20sobre%20tu%20mascota%20${pet?.name || ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.whatsappBtn}
                >
                  <span className="material-symbols-outlined">chat</span>
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {contacts?.map((contact, idx) => (
            <div key={idx} className={styles.contactItem}>
              <div>
                <strong>{contact.name} ({contact.relationship || 'Contacto'})</strong>
                <p className={styles.contactPhoneText}>{contact.phone || contact.whatsapp}</p>
              </div>
              <div className={styles.contactButtons}>
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className={styles.callBtn}>
                    <span className="material-symbols-outlined">call</span>
                    <span>Llamar</span>
                  </a>
                )}
                {contact.whatsapp && (
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}?text=Hola,%20tengo%20informaci%C3%B3n%20sobre%20${pet?.name || 'la mascota'}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.whatsappBtn}
                  >
                    <span className="material-symbols-outlined">chat</span>
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 5. Medical Summary if available */}
      {medicalSummary && (
        <Card padding="md" className={styles.medicalCard}>
          <div className={styles.cardHeaderWithIcon}>
            <span className="material-symbols-outlined text-secondary">medical_services</span>
            <h3>Información Médica Importante</h3>
          </div>

          {medicalSummary.recentVaccines && medicalSummary.recentVaccines.length > 0 && (
            <div className={styles.medSection}>
              <strong className={styles.medSubTitle}>Vacunas Recientes:</strong>
              <ul className={styles.medList}>
                {medicalSummary.recentVaccines.map((v, i) => (
                  <li key={i}>
                    {v.vaccine_name} ({v.application_date})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {medicalSummary.activeTreatments && medicalSummary.activeTreatments.length > 0 && (
            <div className={styles.medSection}>
              <strong className={styles.medSubTitle}>Tratamientos Médicos Activos:</strong>
              <ul className={styles.medList}>
                {medicalSummary.activeTreatments.map((t, i) => (
                  <li key={i}>
                    <strong>{t.treatment_name}:</strong> {t.instructions || 'Seguir indicaciones de receta'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* 6. Footer Thank you & Legal */}
      <footer className={styles.scanFooter}>
        <div className={styles.footerBrand}>
          <span className="material-symbols-outlined">pets</span>
          <span>MaskayPet • Red Satelital de Identificación & Rescate</span>
        </div>
        <p className={styles.footerNote}>
          Gracias por ayudar a que esta mascota regrese sana y salva con su familia.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '10px', fontSize: '12px' }}>
          <a href="/privacidad" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
            Privacidad & Tratamiento de Datos
          </a>
          <span>•</span>
          <a href="/terminos" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
            Términos de Uso
          </a>
        </div>
      </footer>
    </div>
  );
};
