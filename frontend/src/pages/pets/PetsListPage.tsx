import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { petsService } from '../../services/pets.service';
import { Pet } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { CreatePetModal } from './CreatePetModal';
import { PetAvatar } from '../../components/ui/PetAvatar';
import { QRCodeModal } from '../../components/ui/QRCodeModal';
import styles from './Pets.module.css';

export const PetsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedQrPet, setSelectedQrPet] = useState<Pet | null>(null);

  const fetchPets = async () => {
    try {
      const data = await petsService.getMyPets();
      setPets(data);
    } catch {
      // error handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  const filteredPets = pets.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.breed && p.breed.toLowerCase().includes(search.toLowerCase())) ||
      (p.qr_code && p.qr_code.toLowerCase().includes(search.toLowerCase())),
  );

  if (isLoading) return <Spinner label="Cargando tus mascotas..." />;

  return (
    <div className={styles.pageContainer}>
      {/* Top Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageHeading}>Mis Mascotas Protegidas</h1>
          <p className={styles.pageSubheading}>
            Administra los perfiles de salud, placas QR asignadas y contactos de emergencia.
          </p>
        </div>

        <Button
          variant="primary"
          icon="add_circle"
          onClick={() => setModalOpen(true)}
        >
          + Registrar Mascota
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className={styles.searchBarWrap}>
        <div className={styles.searchInputBox}>
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre, raza o código de placa QR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button className={styles.clearSearchBtn} onClick={() => setSearch('')}>
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
        <span className={styles.resultsCount}>
          {filteredPets.length} {filteredPets.length === 1 ? 'mascota encontrada' : 'mascotas'}
        </span>
      </div>

      {/* Pets Grid */}
      {filteredPets.length === 0 ? (
        <Card padding="lg" className={styles.emptyCard}>
          <span className={`material-symbols-outlined ${styles.bigIcon}`}>pets</span>
          <h3>No se encontraron mascotas</h3>
          <p>
            {search
              ? 'No hay mascotas que coincidan con tu búsqueda.'
              : 'Aún no tienes mascotas registradas. ¡Agrega tu primera mascota ahora!'}
          </p>
          {!search && (
            <Button variant="primary" icon="add_circle" onClick={() => setModalOpen(true)}>
              Registrar Mascota
            </Button>
          )}
        </Card>
      ) : (
        <div className={styles.petsGrid}>
          {filteredPets.map((pet) => (
            <Card
              key={pet.id}
              className={`${styles.petCard} ${pet.is_lost ? styles.isLost : ''}`}
              padding="md"
            >
              {pet.is_lost && (
                <div className={styles.lostBanner}>
                  <span className="material-symbols-outlined animate-pulse-fast">warning</span>
                  <span>EN MODO PERDIDO</span>
                </div>
              )}

              <div className={styles.petTop}>
                <div className={styles.avatarWrap}>
                  <PetAvatar
                    src={pet.photo_storage_path}
                    name={pet.name}
                    species={pet.species}
                    size="md"
                  />
                  <span
                    className={`${styles.statusDot} ${pet.is_lost ? styles.lostDot : ''}`}
                    title={pet.is_lost ? 'Mascota Extraviada' : 'Identificación Activa'}
                  >
                    <span className="material-symbols-outlined">
                      {pet.is_lost ? 'warning' : 'check'}
                    </span>
                  </span>
                </div>

                <div className={styles.petMainInfo}>
                  <div className={styles.titleWithBadge}>
                    <h3 className={styles.petCardName}>{pet.name}</h3>
                    {pet.qr_code ? (
                      <Badge variant="primary" size="sm">
                        {pet.qr_code}
                      </Badge>
                    ) : (
                      <Badge variant="outline" size="sm">
                        Sin Placa QR
                      </Badge>
                    )}
                  </div>
                  <p className={styles.petDetails}>
                    {pet.species === 'perro' ? '🐕 Canino' : pet.species === 'gato' ? '🐈 Felino' : '🐾 Mascota'}{' '}
                    • {pet.breed || 'Raza Mixta'}
                  </p>
                  <p className={styles.sexAge}>
                    {pet.sex === 'male' ? 'Macho' : pet.sex === 'female' ? 'Hembra' : 'Sexo no especificado'}
                    {pet.color ? ` • Color: ${pet.color}` : ''}
                  </p>
                </div>
              </div>

              {/* Tag Status Banner */}
              <div
                className={`${styles.tagStrip} ${pet.qr_code ? styles.tagActive : styles.tagPending}`}
              >
                <span className="material-symbols-outlined">
                  {pet.qr_code ? 'verified' : 'qr_code_2'}
                </span>
                <span>
                  {pet.qr_code
                    ? `Placa QR Inteligente activa (${pet.qr_code})`
                    : 'Sin placa vinculada'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className={styles.cardBtnRow}>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => navigate(`/pets/${pet.id}`)}
                >
                  Ficha & Pasaporte de Salud
                </Button>
                {pet.qr_code ? (
                  <button
                    className={styles.qrActionBtn}
                    title="Ver Código QR para escanear"
                    onClick={() => setSelectedQrPet(pet)}
                  >
                    <span className="material-symbols-outlined">qr_code_2</span>
                  </button>
                ) : (
                  <Button
                    variant="surface"
                    size="sm"
                    onClick={() => navigate('/vincular-qr')}
                    title="Vincular placa QR"
                  >
                    Vincular
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Pet Modal */}
      <CreatePetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          fetchPets();
          setModalOpen(false);
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
