import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { petsService } from '../../services/pets.service';
import styles from './Pets.module.css';

interface CreatePetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreatePetModal: React.FC<CreatePetModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { success, error } = useToast();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('perro');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'unknown'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [color, setColor] = useState('');
  const [microchipNumber, setMicrochipNumber] = useState('');
  const [isSterilized, setIsSterilized] = useState(false);
  const [createQr, setCreateQr] = useState(false);
  const [description, setDescription] = useState('');
  const [photoStoragePath, setPhotoStoragePath] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      error('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 480;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setPhotoStoragePath(dataUrl);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('El nombre de la mascota es requerido');
      return;
    }
    if (!breed.trim()) {
      error('Por favor indica la raza o escribe Mestizo');
      return;
    }
    if (!color.trim()) {
      error('Por favor describe el color o señas particulares de la mascota');
      return;
    }

    setIsLoading(true);
    try {
      await petsService.createPet({
        name: name.trim(),
        species,
        breed: breed.trim(),
        sex,
        birthDate: birthDate || undefined,
        color: color.trim(),
        microchipNumber: microchipNumber.trim() || undefined,
        isSterilized,
        description: description.trim(),
        photoStoragePath: photoStoragePath.trim() || undefined,
        createQr,
      });
      success(
        createQr
          ? `¡${name} ha sido registrado con su código QR activo!`
          : `¡${name} ha sido registrado! Puedes crear su QR cuando lo desees.`,
      );
      // Reset form
      setName('');
      setBreed('');
      setColor('');
      setDescription('');
      setPhotoStoragePath('');
      setMicrochipNumber('');
      setCreateQr(false);
      onCreated();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al registrar la mascota');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Nueva Mascota"
      subtitle="Datos para su identificación y rescate. Solo la foto, microchip y fecha son opcionales."
      icon="pets"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className={styles.modalForm}>
        <div className={styles.formGrid}>
          <Input
            label="Nombre de la Mascota *"
            placeholder="Ej: Max, Luna, Toby..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Select
            label="Especie *"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            options={[
              { value: 'perro', label: 'Perro (Canino)' },
              { value: 'gato', label: 'Gato (Felino)' },
              { value: 'otro', label: 'Otro animal' },
            ]}
          />

          <Input
            label="Raza *"
            placeholder="Ej: Golden Retriever, Siames, Mestizo..."
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            required
          />

          <Select
            label="Sexo *"
            value={sex}
            onChange={(e) => setSex(e.target.value as any)}
            options={[
              { value: 'male', label: 'Macho' },
              { value: 'female', label: 'Hembra' },
              { value: 'unknown', label: 'Desconocido / No especificado' },
            ]}
          />

          <Input
            label="Color y señas particulares *"
            placeholder="Ej: Dorado claro, mancha blanca en pecho"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            required
          />

          <Input
            label="Fecha de Nacimiento / Adopción (Opcional)"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />

          <Input
            label="Número de Microchip (Opcional)"
            placeholder="Ej: 981020000123456"
            value={microchipNumber}
            onChange={(e) => setMicrochipNumber(e.target.value)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Input
              label="Foto de la Mascota (URL o Subir Imagen)"
              placeholder="https://... o sube una foto abajo"
              value={photoStoragePath.startsWith('data:image') ? 'Imagen cargada desde dispositivo ✓' : photoStoragePath}
              onChange={(e) => setPhotoStoragePath(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  background: 'var(--surface-container-low)',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  border: '1px solid var(--outline-variant)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  upload_file
                </span>
                <span>Subir foto desde mi equipo/móvil</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  style={{ display: 'none' }}
                />
              </label>
              {photoStoragePath && (
                <button
                  type="button"
                  onClick={() => setPhotoStoragePath('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--error)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.checkboxRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isSterilized}
              onChange={(e) => setIsSterilized(e.target.checked)}
            />
            <span>Mascota esterilizada / castrada</span>
          </label>

          <div
            style={{
              width: '100%',
              background: createQr ? 'var(--primary-fixed)' : 'var(--surface-container-low)',
              border: createQr ? '1.5px solid var(--primary)' : '1px solid var(--outline-variant)',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <label className={styles.checkboxLabel} style={{ fontWeight: 700, color: 'var(--on-surface)' }}>
              <input
                type="checkbox"
                checked={createQr}
                onChange={(e) => setCreateQr(e.target.checked)}
              />
              <span>Crear código QR para esta mascota ahora</span>
            </label>
            <p style={{ margin: '4px 0 0 24px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
              {createQr
                ? `¿Seguro que deseas crear el QR para ${name || 'esta mascota'}? Se generará automáticamente al guardar.`
                : 'Puedes registrar hasta 4 mascotas gratis (1 con QR incluido, o QR ilimitados con Plan Mensual).'}
            </p>
          </div>
        </div>

        <div className={styles.fieldFull}>
          <label className={styles.label}>Notas / Descripción:</label>
          <textarea
            className={styles.textarea}
            rows={2}
            placeholder="Personalidad, alergias conocidas o recomendaciones..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.modalActions}>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading} icon="save">
            Guardar Mascota
          </Button>
        </div>
      </form>
    </Modal>
  );
};
