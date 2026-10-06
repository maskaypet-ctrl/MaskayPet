import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { subsService } from '../../services/subs.service';
import { notificationsService } from '../../services/notifications.service';
import { UserSubscription, NotificationPreferences } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import styles from './Account.module.css';

export const AccountPage: React.FC = () => {
  const { user, isAdmin, refreshUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccountData = async () => {
    try {
      const [subData, prefData] = await Promise.all([
        subsService.getMySubscription(),
        notificationsService.getPreferences().catch(() => null),
      ]);
      setSub(subData);
      setPreferences(prefData);
    } catch {
      error('Error al cargar datos de cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      error('Por favor ingresa un código de activación');
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await subsService.redeemVoucher(voucherCode.trim());
      success(res.message || '¡Plan Premium activado con éxito!');
      setVoucherCode('');
      fetchAccountData();
      refreshUser();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al canjear el código de activación');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      await notificationsService.updatePreferences(updated);
      success('Preferencias de notificación actualizadas');
    } catch {
      error('Error al guardar preferencias');
    }
  };

  if (isLoading) return <Spinner label="Cargando tu cuenta..." />;

  const isPremium = sub?.tier === 'premium';

  return (
    <div className={styles.accountPage}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Mi Cuenta, Planes & Preferencias</h1>
        <p className={styles.subtitle}>
          Administra tu perfil de tutor, canales de alerta y estado de tu suscripción.
        </p>
      </div>

      <div className={styles.grid}>
        {/* Left Column: Profile & Subscription Status */}
        <div className={styles.leftCol}>
          {/* Profile Card */}
          <Card padding="lg" className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <div className={styles.avatarLarge}>
                {user?.firstName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className={styles.userName}>{user?.firstName} {user?.lastName}</h3>
                <p className={styles.userEmail}>{user?.email}</p>
                <Badge variant={isPremium ? 'primary' : 'neutral'} size="sm">
                  {isPremium ? 'Plan Premium Activo' : 'Plan Free'}
                </Badge>
              </div>
            </div>

            <div className={styles.profileDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Teléfono:</span>
                <span className={styles.detailValue}>{user?.phone || 'No registrado'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Rol:</span>
                <span className={styles.detailValue}>
                  {user?.roles?.includes('admin') ? 'Administrador del Sistema' : 'Tutor Responsable'}
                </span>
              </div>
            </div>
          </Card>

          {/* Subscription Status Card */}
          <Card padding="lg" className={styles.subCard}>
            <div className={styles.subHeader}>
              <div className={styles.subTitleWrap}>
                <span className="material-symbols-outlined text-primary">verified</span>
                <h3>Estado de Suscripción</h3>
              </div>
              <Badge variant={isPremium ? 'success' : 'neutral'} size="md">
                {isPremium ? 'PREMIUM' : 'FREE'}
              </Badge>
            </div>

            <p className={styles.subDesc}>
              {isPremium
                ? 'Tienes acceso a registro ilimitado de mascotas, historial clínico completo y retención de documentos por 10 años.'
                : 'Plan básico con registro de 1 mascota y alertas estándar. Activa un código de activación para desbloquear Premium.'}
            </p>

            <div className={styles.limitsGrid}>
              <div className={styles.limitItem}>
                <span className={styles.limitVal}>
                  {sub?.max_pets === null ? 'Ilimitadas' : sub?.max_pets}
                </span>
                <span className={styles.limitLbl}>Mascotas permitidas</span>
              </div>
              <div className={styles.limitItem}>
                <span className={styles.limitVal}>{sub?.max_collaborators_per_pet || 1}</span>
                <span className={styles.limitLbl}>Co-cuidadores</span>
              </div>
              <div className={styles.limitItem}>
                <span className={styles.limitVal}>{sub?.medical_document_retention_years || 1} años</span>
                <span className={styles.limitLbl}>Retención médica</span>
              </div>
            </div>

            {sub?.current_period_end && (
              <div className={styles.periodEndBox}>
                <span className="material-symbols-outlined">event</span>
                <span>
                  Vigencia activa hasta el:{' '}
                  <strong>{new Date(sub.current_period_end).toLocaleDateString()}</strong>
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Voucher Activation & Notification Settings */}
        <div className={styles.rightCol}>
          {/* Voucher / Single-Use Code Redemption */}
          <Card padding="lg" className={styles.voucherCard}>
            <div className={styles.voucherHeader}>
              <div className={styles.voucherIconBox}>
                <span className="material-symbols-outlined">confirmation_number</span>
              </div>
              <div>
                <h3 className={styles.voucherTitle}>Canjear Código de Activación</h3>
                <p className={styles.voucherSubtitle}>
                  Ingresa tu código de 1 mes, 6 meses o 1 año (obtenido por Yape, WhatsApp o tarjeta física).
                </p>
              </div>
            </div>

            <form onSubmit={handleRedeemVoucher} className={styles.voucherForm}>
              <Input
                label="Código de Activación *"
                placeholder="Ej: ACT-PREM-1M-A8F2K9"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                required
              />

              <div className={styles.voucherTips}>
                <span className="material-symbols-outlined">lightbulb</span>
                <p>
                  <strong>Códigos de prueba:</strong> Si estás probando, puedes usar{' '}
                  <code>ACT-PREM-1M-DEMO01</code> o <code>VIP-PREM-6M-DEMO02</code>.
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                type="submit"
                fullWidth
                isLoading={isRedeeming}
                icon="bolt"
              >
                Canjear & Activar Plan
              </Button>
            </form>

            {isAdmin && (
              <div className={styles.adminVoucherLink}>
                <span className="material-symbols-outlined">admin_panel_settings</span>
                <span>¿Eres administrador? </span>
                <button
                  type="button"
                  className={styles.adminBtn}
                  onClick={() => navigate('/admin/vouchers')}
                >
                  Generar Códigos en Lote →
                </button>
              </div>
            )}
          </Card>

          {/* Notification Preferences */}
          {preferences && (
            <Card padding="lg" className={styles.prefCard}>
              <h3 className={styles.subHeading}>Canales de Notificación y Alertas</h3>
              <p className={styles.prefDesc}>
                Configura los medios por los cuales deseas recibir avisos de Modo Perdido y salud.
              </p>

              <div className={styles.prefList}>
                <label className={styles.prefItem}>
                  <div>
                    <strong>Notificaciones Push en App / Móvil</strong>
                    <p className={styles.prefSub}>Alertas en pantalla cuando se registre un escaneo</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.push_enabled}
                    onChange={() => handleTogglePref('push_enabled')}
                  />
                </label>

                <label className={styles.prefItem}>
                  <div>
                    <strong>Alertas por Correo Electrónico</strong>
                    <p className={styles.prefSub}>Confirmaciones de citas y reportes de ubicación</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.email_enabled}
                    onChange={() => handleTogglePref('email_enabled')}
                  />
                </label>

                <label className={styles.prefItem}>
                  <div>
                    <strong>Alertas de Modo Perdido Prioritarias</strong>
                    <p className={styles.prefSub}>Avisos instantáneos de emergencia 24/7</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.lost_pet_alerts}
                    onChange={() => handleTogglePref('lost_pet_alerts')}
                  />
                </label>

                <label className={styles.prefItem}>
                  <div>
                    <strong>Recordatorios de Vacunación</strong>
                    <p className={styles.prefSub}>Avisos previos a la fecha de refuerzo</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.vaccine_reminders}
                    onChange={() => handleTogglePref('vaccine_reminders')}
                  />
                </label>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
