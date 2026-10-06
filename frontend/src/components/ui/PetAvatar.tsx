import React, { useState } from 'react';
import styles from './PetAvatar.module.css';

interface PetAvatarProps {
  src?: string | null;
  name: string;
  species?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PetAvatar: React.FC<PetAvatarProps> = ({
  src,
  name,
  species = 'perro',
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const cleanSpecies = species?.toLowerCase() || 'perro';
  const isDog = cleanSpecies.includes('perro') || cleanSpecies.includes('can');
  const isCat = cleanSpecies.includes('gato') || cleanSpecies.includes('fel');

  const themeClass = isDog ? styles.dogTheme : isCat ? styles.catTheme : styles.otherTheme;
  const iconName = 'pets';

  const hasValidPhoto = src && src.trim() !== '' && !imgError;

  return (
    <div className={`${styles.avatarContainer} ${styles[size]} ${className}`}>
      {hasValidPhoto ? (
        <img
          src={src}
          alt={name}
          className={styles.image}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`${styles.placeholder} ${themeClass}`} title={`${name} (${species})`}>
          <span className={`material-symbols-outlined ${styles.placeholderIcon}`}>{iconName}</span>
        </div>
      )}
    </div>
  );
};
