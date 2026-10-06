import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { petsService } from '../../services/pets.service';
import { qrService } from '../../services/qr.service';
import { useToast } from '../../contexts/ToastContext';
import { Pet } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import styles from './LinkQR.module.css';

export const LinkQRPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [qrCode, setQrCode] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedCode, setAssignedCode] = useState('');

  useEffect(() => {
    petsService
      .getMyPets()
      .then((data) => {
        setPets(data);
        if (data.length > 0) setSelectedPetId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setIsLoadingPets(false));
  }, []);

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCode.trim()) {
      error('Por favor ingresa el código de la placa QR');
      return;
    }
    setStep(2);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedPetId || !qrCode) return;
    setIsSubmitting(true);
    try {
      const res = await qrService.assignTag(selectedPetId, qrCode.trim().toUpperCase());
      setAssignedCode(res.qrCode || qrCode.trim().toUpperCase());
      success('¡Placa QR vinculada con éxito!');
      setStep(3);
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al vincular la placa QR. Verifica el código.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Asistente para Vincular Placa QR</h1>
        <p className={styles.subtitle}>
          Asocia una chapa física inteligente a tu mascota para habilitar la geolocalización de rescate.
        </p>
      </div>

      {/* Steps Indicator */}
      <div className={styles.stepsBar}>
        <div className={`${styles.stepItem} ${step >= 1 ? styles.stepActive : ''}`}>
          <div className={styles.stepNum}>1</div>
          <span>Código de Placa</span>
        </div>
        <div className={styles.stepLine}></div>
        <div className={`${styles.stepItem} ${step >= 2 ? styles.stepActive : ''}`}>
          <div className={styles.stepNum}>2</div>
          <span>Seleccionar Mascota</span>
        </div>
        <div className={styles.stepLine}></div>
        <div className={`${styles.stepItem} ${step >= 3 ? styles.stepActive : ''}`}>
          <div className={styles.stepNum}>3</div>
          <span>Activación Lista</span>
        </div>
      </div>

      {/* Step 1: Input Code */}
      {step === 1 && (
        <Card padding="lg" className={styles.stepCard}>
          <div className={styles.cardHeroIcon}>
            <span className="material-symbols-outlined">qr_code_scanner</span>
          </div>
          <h2 className={styles.cardHeading}>Ingresa el código grabado en la placa</h2>
          <p className={styles.cardDescription}>
            Encontrarás un código alfanumérico grabado en el reverso de la chapa física (ejemplo:{' '}
            <code>PET-QR-DEMO01</code> o <code>QR-2026-A8F2</code>).
          </p>

          <form onSubmit={handleStep1Next} className={styles.stepForm}>
            <Input
              label="Código de la Placa QR *"
              placeholder="Ej: PET-QR-DEMO01"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              required
            />

            <div className={styles.hintBox}>
              <span className="material-symbols-outlined">lightbulb</span>
              <p>
                <strong>Tip de prueba:</strong> Puedes usar códigos demo como <code>PET-QR-DEMO01</code>,{' '}
                <code>PET-QR-DEMO02</code> o <code>PET-QR-DEMO03</code> si estás probando el sistema.
              </p>
            </div>

            <div className={styles.formBtnRow}>
              <Button variant="primary" size="lg" type="submit" icon="arrow_forward" iconPosition="right">
                Continuar al siguiente paso
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 2: Select Pet */}
      {step === 2 && (
        <Card padding="lg" className={styles.stepCard}>
          <div className={styles.cardHeroIcon}>
            <span className="material-symbols-outlined">pets</span>
          </div>
          <h2 className={styles.cardHeading}>¿A qué mascota vincularás la placa?</h2>
          <p className={styles.cardDescription}>
            Placa a vincular: <strong>{qrCode.toUpperCase()}</strong>
          </p>

          {isLoadingPets ? (
            <Spinner label="Cargando tus mascotas..." />
          ) : pets.length === 0 ? (
            <div className={styles.noPetsBox}>
              <p>No tienes mascotas registradas.</p>
              <Button variant="primary" onClick={() => navigate('/pets')}>
                Registrar Mascota Primero
              </Button>
            </div>
          ) : (
            <div className={styles.stepForm}>
              <Select
                label="Selecciona la mascota *"
                value={selectedPetId}
                onChange={(e) => setSelectedPetId(e.target.value)}
                options={pets.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.species} • ${p.breed || 'Mestizo'}) ${p.qr_code ? `[Tiene placa ${p.qr_code}]` : '[Sin placa]'}`,
                }))}
              />

              {selectedPet?.qr_code && (
                <div className={styles.replaceNotice}>
                  <span className="material-symbols-outlined">info</span>
                  <p>
                    {selectedPet.name} ya tenía asignada la placa <strong>{selectedPet.qr_code}</strong>.
                    Al confirmar, esa placa se desvinculará automáticamente y se activará la nueva.
                  </p>
                </div>
              )}

              <div className={styles.btnDoubleRow}>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleConfirmAssignment}
                  isLoading={isSubmitting}
                  icon="verified"
                >
                  Confirmar & Activar Placa
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Step 3: Success State */}
      {step === 3 && (
        <Card padding="lg" className={styles.stepCard}>
          <div className={`${styles.cardHeroIcon} ${styles.successIcon}`}>
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <Badge variant="success" size="md">
            VINCULACIÓN EXITOSA
          </Badge>
          <h2 className={styles.cardHeading}>¡Placa QR Activada con Éxito!</h2>
          <p className={styles.cardDescription}>
            La placa <strong>{assignedCode}</strong> quedó enlazada oficialmente a{' '}
            <strong>{selectedPet?.name}</strong>. Ahora cualquier escaneo abrirá su perfil y
            permitirá el envío de coordenadas satelitales en caso de emergencia.
          </p>

          {/* Visual Scannable QR Code */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: '20px 0',
            padding: '16px 24px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '3px solid var(--primary-fixed)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {(() => {
              const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
              const targetOrigin = isLocalhost ? `https://192.168.1.2:${window.location.port || '3000'}` : window.location.origin;
              const qrTarget = `${targetOrigin}/qr/${assignedCode}`;
              return (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(qrTarget)}`}
                  alt={`Código QR ${assignedCode}`}
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              );
            })()}
            <span style={{ marginTop: '10px', fontSize: '14px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em' }}>
              {assignedCode}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
              📱 Apunta la cámara de tu smartphone para probar el escaneo en vivo
            </span>
          </div>

          <div className={styles.successActions}>
            <Button
              variant="primary"
              size="lg"
              icon="visibility"
              onClick={() => window.open(`/qr/${assignedCode}`, '_blank')}
            >
              Probar Escaneo Público de Rescate
            </Button>
            <Button
              variant="surface"
              onClick={() => navigate(`/pets/${selectedPetId}`)}
            >
              Ir a la Ficha de {selectedPet?.name}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              Volver al Resumen Principal
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
