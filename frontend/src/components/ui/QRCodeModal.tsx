import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useToast } from '../../contexts/ToastContext';
import styles from './QRCodeModal.module.css';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string;
  petName?: string;
  isLost?: boolean;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  qrCode,
  petName,
  isLost = false,
}) => {
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  if (!qrCode) return null;

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const targetOrigin = isLocalhost ? `https://192.168.1.2:${window.location.port || '3000'}` : window.location.origin;
  const publicUrl = `${targetOrigin}/qr/${qrCode}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&data=${encodeURIComponent(
    publicUrl,
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    success('Enlace de escaneo copiado al portapapeles');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `QR-${qrCode}-${petName || 'mascota'}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Descargando código QR...');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Código QR de Identificación"
      subtitle="Escanea este código con cualquier cámara de smartphone para probar el rescate"
      icon="qr_code_2"
      maxWidth="md"
    >
      <div className={styles.modalBody}>
        <div className={styles.petInfoBadge}>
          <h3 className={styles.petTitle}>{petName || 'Mascota Protegida'}</h3>
          <span className={styles.codePill}>{qrCode}</span>
        </div>

        <div className={`${styles.qrFrame} ${isLost ? styles.lostFrame : ''}`}>
          <img
            src={qrImageUrl}
            alt={`Código QR para ${qrCode}`}
            className={styles.qrImage}
          />
          <div className={`${styles.scanNotice} ${isLost ? styles.lostNotice : ''}`}>
            <span className="material-symbols-outlined">
              {isLost ? 'warning' : 'qr_code_scanner'}
            </span>
            <span>{isLost ? 'PLACA EN MODO PERDIDO' : 'Escaneable con cualquier smartphone'}</span>
          </div>
        </div>

        <div className={styles.urlBox}>
          <span>{publicUrl}</span>
        </div>

        <div className={styles.actionsRow}>
          <Button
            variant="primary"
            icon={copied ? 'done' : 'content_copy'}
            onClick={handleCopyLink}
          >
            {copied ? '¡Copiado!' : 'Copiar Enlace'}
          </Button>

          <Button
            variant="secondary"
            icon="download"
            onClick={handleDownload}
          >
            Descargar Imagen QR
          </Button>

          <Button
            variant="surface"
            icon="open_in_new"
            onClick={() => window.open(publicUrl, '_blank')}
          >
            Abrir Vista Pública
          </Button>
        </div>
      </div>
    </Modal>
  );
};
