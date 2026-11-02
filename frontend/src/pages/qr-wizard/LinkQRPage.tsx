import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { petsService } from '../../services/pets.service';
import { qrService } from '../../services/qr.service';
import { subsService } from '../../services/subs.service';
import { useToast } from '../../contexts/ToastContext';
import { Pet, UserSubscription } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PetAvatar } from '../../components/ui/PetAvatar';
import { QRCodeModal } from '../../components/ui/QRCodeModal';
import { Spinner } from '../../components/ui/Spinner';
import styles from './LinkQR.module.css';

export const LinkQRPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPetId = searchParams.get('petId') || '';
  const { success, error } = useToast();

  const [pets, setPets] = useState<Pet[]>([]);
  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Confirmation modal state
  const [confirmPet, setConfirmPet] = useState<Pet | null>(null);
  const [regenerateMode, setRegenerateMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View QR modal state
  const [viewQrPet, setViewQrPet] = useState<Pet | null>(null);

  const loadData = async () => {
    try {
      const [petsData, subData] = await Promise.all([
        petsService.getMyPets(),
        subsService.getMySubscription().catch(() => null),
      ]);
      setPets(petsData);
      setSub(subData);
      if (preselectedPetId) {
        const found = petsData.find((p) => p.id === preselectedPetId);
        if (found && !found.qr_code) {
          setRegenerateMode(false);
          setConfirmPet(found);
        }
      }
    } catch {
      error('Error al cargar tus mascotas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmCreateOrRegenerate = async () => {
    if (!confirmPet) return;
    setIsSubmitting(true);
    try {
      const res = await qrService.ensureUniqueQr(confirmPet.id, regenerateMode);
      success(
        regenerateMode
          ? `¡Se ha generado un nuevo código QR para ${confirmPet.name}!`
          : `¡Código QR creado exitosamente para ${confirmPet.name}!`,
      );
      const updatedPet: Pet = { ...confirmPet, qr_code: res.qrCode };
      setConfirmPet(null);
      await loadData();
      setViewQrPet(updatedPet);
    } catch (err: any) {
      error(err.response?.data?.message || 'No se pudo generar el código QR');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Spinner label="Cargando generador de QR..." />;

  const isPremium = sub?.tier === 'premium';
  const activeQrCount = pets.filter((p) => Boolean(p.qr_code)).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Códigos QR de mis Mascotas</h1>
        <p className={styles.subtitle}>
          Crea el código QR inteligente para tu mascota con un solo clic. No necesitas ingresar ningún código manual.
        </p>
      </div>

      {/* Plan QR Quota Banner */}
      <Card
        padding="md"
        style={{
          marginBottom: '20px',
          background: isPremium ? 'var(--primary-fixed)' : 'var(--surface-container-low)',
          border: isPremium ? '1.5px solid var(--primary)' : '1px solid var(--outline-variant)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--primary)' }}>
              qr_code_2
            </span>
            <div>
              <strong style={{ fontSize: '15px', color: 'var(--on-surface)' }}>
                {isPremium
                  ? 'Plan Premium Activo: Códigos QR Ilimitados'
                  : `Plan Gratuito: ${activeQrCount} de 1 código QR utilizado`}
              </strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                {isPremium
                  ? 'Puedes crear y activar el código QR para todas tus mascotas sin límite.'
                  : 'Puedes registrar hasta 4 mascotas y crear el código QR gratis para 1 de ellas. Con el Plan Mensual tienes QR ilimitados.'}
              </p>
            </div>
          </div>
          {!isPremium && (
            <Button variant="primary" size="sm" icon="workspace_premium" onClick={() => navigate('/cuenta?tab=planes')}>
              Obtener QR Ilimitados
            </Button>
          )}
        </div>
      </Card>

      {pets.length === 0 ? (
        <Card padding="lg" className={styles.stepCard}>
          <div className={styles.cardHeroIcon}>
            <span className="material-symbols-outlined">pets</span>
          </div>
          <h2 className={styles.cardHeading}>Aún no tienes mascotas registradas</h2>
          <p className={styles.cardDescription}>
            Registra primero a tu mascota para poder crear su código QR de identificación.
          </p>
          <Button variant="primary" icon="add_circle" onClick={() => navigate('/pets')}>
            Ir a Registrar Mascota
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {pets.map((pet) => {
            const hasQr = Boolean(pet.qr_code);
            return (
              <Card key={pet.id} padding="md" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <PetAvatar src={pet.photo_storage_path} name={pet.name} species={pet.species} size="md" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>{pet.name}</h3>
                      <Badge variant={hasQr ? 'primary' : 'outline'} size="sm">
                        {hasQr ? 'QR Activo' : 'Sin QR'}
                      </Badge>
                    </div>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                      {pet.species} • {pet.breed || 'Mestizo'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}>
                  {hasQr ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon="qr_code_2"
                        fullWidth
                        onClick={() => setViewQrPet(pet)}
                      >
                        Ver / Descargar QR
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon="refresh"
                        fullWidth
                        onClick={() => {
                          setRegenerateMode(true);
                          setConfirmPet(pet);
                        }}
                      >
                        Generar Nuevo QR
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icon="add_circle"
                      fullWidth
                      onClick={() => {
                        setRegenerateMode(false);
                        setConfirmPet(pet);
                      }}
                    >
                      Crear QR para {pet.name}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm Create / Regenerate QR Modal */}
      <Modal
        isOpen={!!confirmPet}
        onClose={() => setConfirmPet(null)}
        title={regenerateMode ? `¿Generar Nuevo QR para ${confirmPet?.name}?` : `¿Crear Código QR para ${confirmPet?.name}?`}
        subtitle="Confirmación automática sin códigos manuales"
        icon="qr_code_2"
        maxWidth="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--on-surface)', lineHeight: 1.5 }}>
            {regenerateMode ? (
              <>
                ¿Seguro que deseas generar un <strong>nuevo código QR</strong> para <strong>{confirmPet?.name}</strong>? El código QR anterior quedará desactivado y se creará uno nuevo automáticamente.
              </>
            ) : (
              <>
                ¿Seguro que deseas crear el código QR para <strong>{confirmPet?.name}</strong>?
              </>
            )}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="outline" onClick={() => setConfirmPet(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon="qr_code_2"
              isLoading={isSubmitting}
              onClick={handleConfirmCreateOrRegenerate}
            >
              {regenerateMode ? 'Sí, Generar Nuevo QR' : 'Sí, Crear QR'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Scannable QR Modal */}
      {viewQrPet && viewQrPet.qr_code && (
        <QRCodeModal
          isOpen={!!viewQrPet}
          onClose={() => setViewQrPet(null)}
          qrCode={viewQrPet.qr_code}
          petName={viewQrPet.name}
          isLost={viewQrPet.is_lost}
          onEditInfo={() => navigate(`/pets/${viewQrPet.id}?tab=privacy`)}
        />
      )}
    </div>
  );
};
