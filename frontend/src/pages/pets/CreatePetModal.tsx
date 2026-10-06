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
  const [description, setDescription] = useState('');
  const [photoStoragePath, setPhotoStoragePath] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      });
      success(`¡${name} ha sido registrado exitosamente!`);
      // Reset form
      setName('');
      setBreed('');
      setColor('');
      setDescription('');
      setPhotoStoragePath('');
      setMicrochipNumber('');
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

          <Input
            label="Foto URL (Opcional)"
            placeholder="https://... o dejar vacío para usar avatar"
            value={photoStoragePath}
            onChange={(e) => setPhotoStoragePath(e.target.value)}
          />
        </div>

        <div className={styles.checkboxRow}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isSterilized}
              onChange={(e) => setIsSterilized(e.target.checked)}
            />
            <span>Mascota esterilizada / castrada</span>
          </label>
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
