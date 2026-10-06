import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { petsService } from '../../services/pets.service';
import { lostService } from '../../services/lost.service';
import { Pet } from '../../types';
import styles from './EmergencyModal.module.css';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  onStatusChanged,
}) => {
  const { success, error } = useToast();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [emergencyMessage, setEmergencyMessage] = useState<string>(
    '¡Esta mascota se encuentra extraviada! Por favor comunícate urgente con su familia.',
  );
  const [recoveryMethod, setRecoveryMethod] = useState<'via_scan' | 'otro_medio'>('via_scan');
  const [testimonial, setTestimonial] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      petsService
        .getMyPets()
        .then((data) => {
          setPets(data);
          if (data.length > 0 && !selectedPetId) {
            setSelectedPetId(data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, selectedPetId]);

  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const isLost = Boolean(selectedPet?.is_lost);

  const handleActivate = async () => {
    if (!selectedPetId) return;
    setIsLoading(true);
    try {
      await lostService.activateLostMode(selectedPetId, emergencyMessage);
      success(`¡Modo Perdido activado para ${selectedPet?.name}! La alerta satelital está operativa.`);
      onStatusChanged?.();
      onClose();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al activar el Modo Perdido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedPetId) return;
    setIsLoading(true);
    try {
      await lostService.resolveLostMode(selectedPetId, {
        recoveryMethod,
        ownerTestimonial: testimonial,
      });
      success(`¡Excelente noticia! ${selectedPet?.name} ha sido marcado como recuperado.`);
      onStatusChanged?.();
      onClose();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al resolver el Modo Perdido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLost ? 'Resolver Modo Perdido' : 'Activar Modo Perdido & Rescate'}
      subtitle={
        isLost
          ? 'Desactiva la alerta pública y confirma que tu mascota regresó a casa.'
          : 'Despliega la pantalla de emergencia en la placa QR y solicita ubicación GPS.'
      }
      icon="e911_emergency"
      iconVariant={isLost ? 'primary' : 'emergency'}
      maxWidth="md"
    >
      <div className={styles.container}>
        {pets.length === 0 ? (
          <p className={styles.noPets}>No tienes mascotas registradas aún.</p>
        ) : (
          <>
            <Select
              label="Selecciona la Mascota"
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              options={pets.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.species}) ${p.is_lost ? '⚠️ [EN MODO PERDIDO]' : '✅ [Segura]'}`,
              }))}
            />

            {isLost ? (
              <div className={styles.resolveForm}>
                <div className={styles.alertBoxSuccess}>
                  <span className="material-symbols-outlined">sentiment_very_satisfied</span>
                  <p>
                    {selectedPet?.name} se encuentra actualmente con la alerta activa. Marca esta
                    opción para finalizar la emergencia.
                  </p>
                </div>

                <Select
                  label="¿Cómo fue recuperada?"
                  value={recoveryMethod}
                  onChange={(e) => setRecoveryMethod(e.target.value as any)}
                  options={[
                    { value: 'via_scan', label: 'Gracias a la placa QR inteligente y geolocalización' },
                    { value: 'otro_medio', label: 'Por otro medio / Regresó por su cuenta' },
                  ]}
                />

                <div className={styles.field}>
                  <label className={styles.label}>Testimonio o comentario (Opcional):</label>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    placeholder="Cuéntanos brevemente cómo fue el rescate..."
                    value={testimonial}
                    onChange={(e) => setTestimonial(e.target.value)}
                  />
                </div>

                <div className={styles.actions}>
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button variant="primary" onClick={handleResolve} isLoading={isLoading}>
                    Confirmar Mascota Recuperada
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.activateForm}>
                <div className={styles.alertBoxWarning}>
                  <span className="material-symbols-outlined">warning</span>
                  <p>
                    Al activar el Modo Perdido, cualquier persona que escanee la chapa de{' '}
                    <strong>{selectedPet?.name}</strong> verá un aviso prioritario de rescate y un
                    botón para compartirte sus coordenadas GPS en tiempo real.
                  </p>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Mensaje de auxilio visible en el escaneo:</label>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={emergencyMessage}
                    onChange={(e) => setEmergencyMessage(e.target.value)}
                    placeholder="Ej: Tiene tratamiento diario, por favor comuníquese urgente..."
                  />
                </div>

                <div className={styles.actions}>
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button variant="emergency" onClick={handleActivate} isLoading={isLoading}>
                    🚨 Activar Protocolo de Emergencia
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
