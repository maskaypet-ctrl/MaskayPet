import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { petsService } from '../../services/pets.service';
import { notificationsService } from '../../services/notifications.service';
import { Pet, ReminderItem } from '../../types';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { CreatePetModal } from '../pets/CreatePetModal';
import { PetAvatar } from '../../components/ui/PetAvatar';
import { QRCodeModal } from '../../components/ui/QRCodeModal';
import styles from './Dashboard.module.css';

interface DashboardOutletContext {
  openEmergencyModal: () => void;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();
  const { openEmergencyModal } = useOutletContext<DashboardOutletContext>();

  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [selectedQrPet, setSelectedQrPet] = useState<Pet | null>(null);
  const [summary, setSummary] = useState<{
    totalPets: number;
    petsWithQr: number;
    totalScansMonth: number;
    activeLostAlerts: number;
    vaccines: {
      totalApplied: number;
      overdueCount: number;
      percentage: string;
      statusText: string;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createPetModalOpen, setCreatePetModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [petsData, remindersData, summaryData] = await Promise.all([
        petsService.getMyPets(),
        notificationsService.getUpcomingReminders().catch(() => []),
        petsService.getDashboardSummary().catch(() => null),
      ]);
      setPets(petsData);
      setReminders(remindersData);
      setSummary(summaryData);
    } catch (err) {
      error('Error al cargar la información del panel');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handlePetStatusUpdated = () => fetchData();
    window.addEventListener('pets-status-updated', handlePetStatusUpdated);
    return () => window.removeEventListener('pets-status-updated', handlePetStatusUpdated);
  }, []);

  const petsWithQR = pets.filter((p) => p.qr_code && p.qr_status === 'active').length;
  const lostPetsCount = pets.filter((p) => p.is_lost).length;

  if (isLoading) {
    return <Spinner label="Cargando tu panel de control..." />;
  }

  return (
    <div className={styles.dashboard}>
      {/* 1. Top Welcome & Quick Actions Bar */}
      <section className={styles.welcomeBanner}>
        <div className={styles.welcomeText}>
          <div className={styles.greetingRow}>
            <h1 className={styles.greetingTitle}>¡Hola, {user?.firstName || 'Tutor'}!</h1>
            <span className={styles.waveEmoji}>👋</span>
          </div>
          <p className={styles.greetingSubtitle}>
            Tus <strong className={styles.highlightText}>{pets.length} mascotas</strong> están
            protegidas y monitoreadas en tiempo real con sus placas inteligentes QR y geolocalización
            de rescate activo.
          </p>
        </div>

        <div className={styles.welcomeActions}>
          <Button
            variant="surface"
            icon="qr_code_scanner"
            onClick={() => navigate('/vincular-qr')}
          >
            Vincular Placa QR
          </Button>
          <Button
            variant="secondary"
            icon="add_circle"
            onClick={() => setCreatePetModalOpen(true)}
          >
            Registrar Mascota
          </Button>
        </div>
      </section>

      {/* 2. Emergency / Lost Mode Banner */}
      <section
        className={`${styles.emergencyBanner} ${lostPetsCount > 0 ? styles.lostModeActive : ''}`}
      >
        <div className={styles.emergencyLeft}>
          <div className={styles.emergencyIconBox}>
            <span className="material-symbols-outlined animate-pulse-fast">
              {lostPetsCount > 0 ? 'warning' : 'campaign'}
            </span>
          </div>
          <div className={styles.emergencyInfo}>
            <div className={styles.emergencyTitleRow}>
              <h3 className={styles.emergencyTitle}>
                {lostPetsCount > 0
                  ? '¡ALERTA: TIENES MASCOTAS EN MODO PERDIDO!'
                  : 'Protocolo de Emergencia Satelital en Espera'}
              </h3>
              <Badge variant={lostPetsCount > 0 ? 'emergency' : 'secondary'} size="sm">
                {lostPetsCount > 0 ? 'RESCATE EN CURSO' : 'RED 24/7 ACTIVA'}
              </Badge>
            </div>
            <p className={styles.emergencyDescription}>
              {lostPetsCount > 0
                ? 'El perfil público de escaneo está solicitando coordenadas GPS a cualquiera que encuentre tu mascota.'
                : 'Si tu mascota se extravía, activa el Modo Perdido para desplegar la pantalla de auxilio con geolocalización GPS.'}
            </p>
          </div>
        </div>

        <Button
          variant={lostPetsCount > 0 ? 'primary' : 'emergency'}
          size="md"
          icon="e911_emergency"
          onClick={openEmergencyModal}
        >
          {lostPetsCount > 0 ? 'Gestionar Modo Perdido' : 'Activar Modo Perdido'}
        </Button>
      </section>

      {/* 3. Telemetry KPI Grid */}
      <section className={styles.statsGrid}>
        <StatsCard
          label="Mascotas con QR"
          value={`${summary?.petsWithQr ?? petsWithQR} / ${summary?.totalPets ?? pets.length}`}
          sublabel="activas"
          icon="verified"
          variant="primary"
        />
        <StatsCard
          label="Vacunación Global"
          value={summary?.vaccines?.percentage ?? (pets.length > 0 ? '0%' : '0%')}
          sublabel={summary?.vaccines?.statusText ?? (pets.length > 0 ? 'Sin registros' : 'Sin mascotas')}
          icon="vaccines"
          variant="secondary"
        />
        <StatsCard
          label="Lecturas de Placa"
          value={summary?.totalScansMonth ?? 0}
          sublabel="este mes"
          icon="qr_code_scanner"
          variant="neutral"
        />
        <StatsCard
          label="Alertas Activas"
          value={summary?.activeLostAlerts ?? lostPetsCount}
          sublabel={(summary?.activeLostAlerts ?? lostPetsCount) > 0 ? '¡Modo Perdido!' : 'Zona segura'}
          icon={(summary?.activeLostAlerts ?? lostPetsCount) > 0 ? 'warning' : 'shield_with_heart'}
          variant={(summary?.activeLostAlerts ?? lostPetsCount) > 0 ? 'emergency' : 'success'}
        />
      </section>

      {/* 4. Main Section: Registered Pets Grid */}
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <span className={styles.titleBar}></span>
            <h2 className={styles.sectionTitle}>Mis Mascotas Protegidas</h2>
          </div>
          <Button variant="ghost" size="sm" icon="arrow_forward" iconPosition="right" onClick={() => navigate('/pets')}>
            Gestionar todas
          </Button>
        </div>

        {pets.length === 0 ? (
          <Card padding="lg" className={styles.emptyState}>
            <span className={`material-symbols-outlined ${styles.emptyIcon}`}>pets</span>
            <h3>No tienes mascotas registradas aún</h3>
            <p>Registra a tu primer perro o gato para activar su pasaporte médico y vincular su placa QR.</p>
            <Button
              variant="primary"
              icon="add_circle"
              onClick={() => setCreatePetModalOpen(true)}
            >
              + Registrar Mi Primera Mascota
            </Button>
          </Card>
        ) : (
          <div className={styles.petsGrid}>
            {pets.map((pet) => {
              return (
                <Card
                  key={pet.id}
                  className={`${styles.petCard} ${pet.is_lost ? styles.isLost : ''}`}
                  padding="md"
                >
                  {pet.is_lost && (
                    <div className={styles.lostPetBadge}>
                      <span className="material-symbols-outlined">warning</span>
                      <span>MODO PERDIDO ACTIVO</span>
                    </div>
                  )}

                  <div className={styles.petCardTop}>
                    <div className={styles.petAvatarWrap}>
                      <PetAvatar
                        src={pet.photo_storage_path}
                        name={pet.name}
                        species={pet.species}
                        size="md"
                      />
                      <span
                        className={`${styles.avatarCheck} ${pet.is_lost ? styles.lostAvatarCheck : ''}`}
                        title={pet.is_lost ? 'Mascota Extraviada' : 'Placa Activa'}
                      >
                        <span className="material-symbols-outlined">
                          {pet.is_lost ? 'warning' : 'check'}
                        </span>
                      </span>
                    </div>

                    <div className={styles.petMeta}>
                      <div className={styles.petNameRow}>
                        <h3 className={styles.petName}>{pet.name}</h3>
                        {pet.qr_code ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedQrPet(pet);
                            }}
                            title="Ver Código QR para escanear"
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          >
                            <Badge variant="primary" size="sm">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '3px' }}>
                                qr_code_2
                              </span>
                              {pet.qr_code}
                            </Badge>
                          </button>
                        ) : (
                          <Badge variant="outline" size="sm">
                            Sin QR
                          </Badge>
                        )}
                      </div>
                      <p className={styles.petBreed}>
                        {pet.species.toUpperCase()} • {pet.breed || 'Mestizo'}
                      </p>
                      <div className={styles.petQrStatus}>
                        <span className="material-symbols-outlined">
                          {pet.qr_code ? 'check_circle' : 'help'}
                        </span>
                        <span>{pet.qr_code ? 'Placa física enlazada' : 'Placa pendiente de enlazar'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Biometrics & Fast Info */}
                  <div className={styles.biometricsStrip}>
                    <div className={styles.bioCol}>
                      <span className={styles.bioLbl}>Sexo</span>
                      <span className={styles.bioVal}>
                        {pet.sex === 'male' ? 'Macho' : pet.sex === 'female' ? 'Hembra' : 'Desc.'}
                      </span>
                    </div>
                    <div className={styles.bioCol}>
                      <span className={styles.bioLbl}>Vacunas</span>
                      <span className={`${styles.bioVal} ${styles.greenVal}`}>Al día</span>
                    </div>
                    <div className={styles.bioCol}>
                      <span className={styles.bioLbl}>Estado</span>
                      <span className={styles.bioVal}>Protegido</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className={styles.cardActions}>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => navigate(`/pets/${pet.id}`)}
                    >
                      Ver Ficha & Pasaporte
                    </Button>
                    {pet.qr_code && (
                      <button
                        className={styles.publicViewBtn}
                        title="Simular cómo ve el rescatista el QR público"
                        onClick={() => window.open(`/qr/${pet.qr_code}`, '_blank')}
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Clinical Alerts & Reminders Strip */}
      {reminders.length > 0 && (
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleWrap}>
              <span className={styles.titleBar}></span>
              <h2 className={styles.sectionTitle}>Próximos Recordatorios Clínicos</h2>
            </div>
          </div>

          <div className={styles.remindersList}>
            {reminders.map((rem) => (
              <Card key={rem.id} padding="sm" className={styles.reminderCard}>
                <div className={styles.reminderIcon}>
                  <span className="material-symbols-outlined">event_upcoming</span>
                </div>
                <div className={styles.reminderInfo}>
                  <h4 className={styles.reminderTitle}>{rem.title}</h4>
                  <p className={styles.reminderMessage}>
                    {rem.message} ({rem.pet_name})
                  </p>
                </div>
                <Badge variant="warning" size="sm">
                  {new Date(rem.due_at).toLocaleDateString()}
                </Badge>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Create Pet Modal */}
      <CreatePetModal
        isOpen={createPetModalOpen}
        onClose={() => setCreatePetModalOpen(false)}
        onCreated={() => {
          fetchData();
          setCreatePetModalOpen(false);
        }}
      />

      {/* QR Code Scannable Modal */}
      {selectedQrPet && selectedQrPet.qr_code && (
        <QRCodeModal
          isOpen={!!selectedQrPet}
          onClose={() => setSelectedQrPet(null)}
          qrCode={selectedQrPet.qr_code}
          petName={selectedQrPet.name}
          isLost={selectedQrPet.is_lost}
        />
      )}
    </div>
  );
};
