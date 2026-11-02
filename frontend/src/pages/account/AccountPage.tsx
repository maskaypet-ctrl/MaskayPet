import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services/auth.service';
import { subsService } from '../../services/subs.service';
import { notificationsService } from '../../services/notifications.service';
import { UserSubscription, NotificationPreferences, BillingOption } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { Spinner } from '../../components/ui/Spinner';
import styles from './Account.module.css';

const DEFAULT_BILLING_OPTIONS: BillingOption[] = [
  {
    id: 'monthly_1m',
    label: 'Plan Mensual (1 Mes)',
    durationDays: 30,
    pricePen: 14.9,
    badge: null,
    isTrial: false,
  },
  {
    id: 'quarterly_3m',
    label: 'Plan Trimestral (3 Meses)',
    durationDays: 90,
    pricePen: 39.9,
    badge: 'Ahorra 11%',
    isTrial: false,
  },
  {
    id: 'semiannual_6m',
    label: 'Plan Semestral (6 Meses)',
    durationDays: 180,
    pricePen: 69.9,
    badge: 'Ahorra 22%',
    isTrial: false,
  },
  {
    id: 'annual_1y',
    label: 'Plan Anual (1 Año)',
    durationDays: 365,
    pricePen: 119.9,
    badge: 'Mejor Valor (Ahorra 33%)',
    isTrial: false,
  },
];

export const AccountPage: React.FC = () => {
  const { user, isAdmin, refreshUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const initialTab = searchParams.get('tab') || (searchParams.get('activar') === '1' ? 'planes' : 'perfil');
  const [activeTab, setActiveTab] = useState(initialTab);

  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Plan & Trial state
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [selectedPlanInfo, setSelectedPlanInfo] = useState<BillingOption | null>(null);

  // Edit Profile Modal state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change by Email Verification Code (OTP)
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [devCodePreview, setDevCodePreview] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

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

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (searchParams.get('activar') === '1') {
      setActiveTab('planes');
    }
  }, [searchParams]);

  const handleStartFreeTrial = async () => {
    setIsStartingTrial(true);
    try {
      const res = await subsService.subscribe({
        tier: 'premium',
        billingCycle: 'trial_14d',
        isTrial: true,
        provider: 'free_trial',
      });
      success(res.message || '¡Prueba Gratis de 14 días activada con éxito!');
      await fetchAccountData();
      await refreshUser();
    } catch (err: any) {
      error(err.response?.data?.message || 'No se pudo activar la prueba gratuita');
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      error('Por favor ingresa tu código de activación');
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await subsService.redeemVoucher(voucherCode.trim());
      success(res.message || '¡Código de activación canjeado con éxito!');
      setVoucherCode('');
      setSelectedPlanInfo(null);
      await fetchAccountData();
      await refreshUser();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al canjear el código de activación');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleOpenEditProfile = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setPhone(user?.phone || '');
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      error('El nombre y apellido son obligatorios');
      return;
    }
    setIsSavingProfile(true);
    try {
      await authService.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      success('Datos de tu perfil actualizados con éxito');
      await refreshUser();
      setEditProfileOpen(false);
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al actualizar el perfil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (!user?.email) return;
    setIsSendingCode(true);
    try {
      const res = await authService.requestPasswordCode(user.email);
      setCodeSent(true);
      if (res.verificationCodePreview) {
        setDevCodePreview(res.verificationCodePreview);
      }
      success(`Código de verificación enviado a ${user.email}`);
    } catch (err: any) {
      error(err.response?.data?.message || 'No se pudo enviar el código de verificación');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleConfirmPasswordByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (!verificationCode.trim()) {
      error('Ingresa el código de 6 dígitos enviado a tu correo');
      return;
    }
    if (newPassword.length < 8) {
      error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('La nueva contraseña y su confirmación no coinciden');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await authService.confirmPasswordCode({
        email: user.email,
        code: verificationCode.trim(),
        newPassword,
      });
      success(res.message || 'Contraseña actualizada con éxito');
      setCodeSent(false);
      setVerificationCode('');
      setDevCodePreview(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      error(err.response?.data?.message || 'Código inválido o expirado');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    const newValue = !preferences[key];
    const updated = { ...preferences, [key]: newValue };
    setPreferences(updated);
    try {
      await notificationsService.updatePreferences({ [key]: newValue } as any);
      success('Preferencia actualizada');
    } catch {
      error('Error al guardar preferencia');
    }
  };

  if (isLoading) return <Spinner label="Cargando tu cuenta..." />;

  const isPremium = sub?.tier === 'premium';
  const canUseTrial = !sub?.has_used_trial && !isPremium;
  const daysRemaining = sub?.days_remaining ?? 0;
  const billingOptions = (sub?.billing_options?.length ? sub.billing_options : DEFAULT_BILLING_OPTIONS).filter(
    (opt) => !opt.isTrial,
  );
  const paymentsHistory = sub?.payments || [];

  const accountTabs = [
    { id: 'perfil', label: 'Mi Perfil', icon: 'person' },
    { id: 'planes', label: 'Activar Código y Planes', icon: 'vpn_key' },
    { id: 'seguridad', label: 'Seguridad y Contraseña', icon: 'lock' },
    { id: 'alertas', label: 'Notificaciones e Historial', icon: 'notifications' },
  ];

  return (
    <div className={styles.accountPage}>
      {/* Clean Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Mi Cuenta</h1>
        <p className={styles.subtitle}>
          Administra tus datos personales, tu plan de suscripción y la seguridad de tu cuenta.
        </p>
      </div>

      {/* Sub-Menu Tabs */}
      <Tabs tabs={accountTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* SUB-MENU 1: MI PERFIL */}
      {activeTab === 'perfil' && (
        <Card padding="lg" className={styles.profileCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className={styles.avatarRow}>
              <div className={styles.bigAvatar}>{user?.firstName?.charAt(0).toUpperCase() || 'U'}</div>
              <div>
                <h2 className={styles.userName}>
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className={styles.userEmail}>{user?.email}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <Badge variant={isPremium ? 'primary' : 'neutral'} size="sm">
                    {isPremium ? `Plan Premium (${daysRemaining} días restantes)` : 'Plan Gratuito'}
                  </Badge>
                </div>
              </div>
            </div>

            <Button variant="outline" size="sm" icon="edit" onClick={handleOpenEditProfile}>
              Editar Perfil
            </Button>
          </div>

          {!user?.phone && (
            <div
              style={{
                background: 'var(--error-container)',
                color: 'var(--on-error-container)',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                warning
              </span>
              <span>Aún no has registrado tu teléfono móvil. Agrégalo para recibir llamadas de rescate en caso de extravío.</span>
            </div>
          )}

          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span>Nombre Completo:</span>
              <strong>
                {user?.firstName} {user?.lastName}
              </strong>
            </div>
            <div className={styles.infoRow}>
              <span>Correo Electrónico:</span>
              <strong>{user?.email}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Teléfono / WhatsApp de Emergencia:</span>
              <strong>{user?.phone || 'No registrado'}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Capacidad de Mascotas y QR:</span>
              <strong>
                {isPremium ? 'Mascotas y Códigos QR Ilimitados' : 'Hasta 4 mascotas (1 con QR activo)'}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
            <Button variant="primary" size="sm" icon="vpn_key" onClick={() => setActiveTab('planes')}>
              Ingresar Código de Activación
            </Button>
            <Button variant="surface" size="sm" icon="lock" onClick={() => setActiveTab('seguridad')}>
              Cambiar Contraseña
            </Button>
          </div>
        </Card>
      )}

      {/* SUB-MENU 2: ACTIVAR CÓDIGO Y PLANES */}
      {activeTab === 'planes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Current Status Card */}
          <Card padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <Badge variant={isPremium ? 'primary' : 'neutral'} size="md">
                  {isPremium ? 'PLAN PREMIUM ACTIVO' : 'PLAN GRATUITO'}
                </Badge>
                <h3 style={{ margin: '8px 0 4px 0', fontSize: '18px', fontWeight: 800 }}>
                  {isPremium
                    ? `Tienes ${daysRemaining} día(s) de vigencia activa`
                    : 'Cuenta Básica (Hasta 4 mascotas y 1 QR activo)'}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                  {isPremium && sub?.current_period_end
                    ? `Vigente hasta el ${new Date(sub.current_period_end).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })} • Códigos QR ilimitados habilitados.`
                    : 'Activa un Plan Mensual o superior para habilitar códigos QR ilimitados en todas tus mascotas.'}
                </p>
              </div>
              {canUseTrial && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon="redeem"
                  isLoading={isStartingTrial}
                  onClick={handleStartFreeTrial}
                >
                  Activar 14 Días Gratis
                </Button>
              )}
            </div>
          </Card>

          {/* Clean Activation Code Input Box (No visible codes!) */}
          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '24px' }}>
                vpn_key
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Ingresar Código de Activación</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                  Ingresa el código que recibiste tras realizar tu pago externo para activar tu plan inmediatamente.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleRedeemVoucher}
              style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}
            >
              <input
                ref={codeInputRef}
                type="text"
                placeholder="Ingresa aquí tu código de activación"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className={styles.voucherInput}
                style={{ flex: 1, minWidth: '220px' }}
              />
              <Button variant="primary" type="submit" isLoading={isRedeeming} icon="bolt">
                Activar Código
              </Button>
            </form>

            {isAdmin && (
              <div style={{ marginTop: '12px', fontSize: '12px' }}>
                <Button variant="outline" size="sm" icon="admin_panel_settings" onClick={() => navigate('/admin/vouchers')}>
                  Ir al Panel Administrador de Códigos
                </Button>
              </div>
            )}
          </Card>

          {/* Time-Based Plans Grid */}
          <Card padding="lg">
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Planes Disponibles (QR Ilimitados)</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                Con cualquiera de nuestros planes puedes generar códigos QR sin límite para todas tus mascotas.
              </p>
            </div>

            <div className={styles.timePlansGrid}>
              {billingOptions.map((opt) => (
                <div
                  key={opt.id}
                  className={`${styles.timePlanCard} ${opt.id === 'annual_1y' ? styles.timePlanBest : ''}`}
                >
                  <div className={styles.timePlanTop}>
                    <strong>{opt.label}</strong>
                    {opt.badge && (
                      <Badge variant={opt.id === 'annual_1y' ? 'primary' : 'success'} size="sm">
                        {opt.badge}
                      </Badge>
                    )}
                  </div>
                  <div className={styles.timePlanPrice}>
                    <span className={styles.priceNumber}>S/ {opt.pricePen.toFixed(2)}</span>
                    <span className={styles.priceDays}>/ {opt.durationDays} días</span>
                  </div>
                  <p className={styles.timePlanHint}>
                    Incluye mascotas y códigos QR ilimitados durante {opt.durationDays} días.
                  </p>
                  <Button
                    variant={opt.id === 'annual_1y' ? 'primary' : 'outline'}
                    size="sm"
                    fullWidth
                    icon="chat"
                    onClick={() => setSelectedPlanInfo(opt)}
                  >
                    Solicitar Código
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* SUB-MENU 3: SEGURIDAD Y CONTRASEÑA (POR CÓDIGO DE CORREO) */}
      {activeTab === 'seguridad' && (
        <Card padding="lg" style={{ maxWidth: '580px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '26px' }}>
              mark_email_read
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                Cambiar Contraseña por Confirmación de Correo
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                Para proteger tu cuenta, enviaremos un código de verificación de 6 dígitos a tu correo{' '}
                <strong>{user?.email}</strong>.
              </p>
            </div>
          </div>

          {!codeSent ? (
            <div
              style={{
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--on-surface)' }}>
                Haz clic en el botón de abajo para recibir un código de 6 dígitos en <strong>{user?.email}</strong> y
                establecer tu nueva contraseña.
              </p>
              <div>
                <Button
                  variant="primary"
                  icon="send"
                  isLoading={isSendingCode}
                  onClick={handleSendEmailCode}
                >
                  Enviar Código de Verificación a mi Correo
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmPasswordByCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'var(--primary-fixed)',
                  border: '1px solid var(--primary)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  color: 'var(--on-surface)',
                }}
              >
                📩 Hemos enviado un código de 6 dígitos a <strong>{user?.email}</strong>. Ingresa el código abajo junto
                con tu nueva contraseña.
                {devCodePreview && (
                  <div style={{ marginTop: '6px', fontWeight: 800, color: 'var(--primary)' }}>
                    Código generado (Modo Local): <code>{devCodePreview}</code>
                  </div>
                )}
              </div>

              <Input
                label="Código de Verificación (6 dígitos) *"
                placeholder="Ej: 482910"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
              />

              <Input
                label="Nueva Contraseña (mínimo 8 caracteres) *"
                type="password"
                placeholder="Ingresa tu nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <Input
                label="Confirmar Nueva Contraseña *"
                type="password"
                placeholder="Repite tu nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setVerificationCode('');
                    setDevCodePreview(null);
                  }}
                >
                  Reenviar o Cancelar
                </Button>
                <Button variant="primary" type="submit" icon="check_circle" isLoading={isUpdatingPassword}>
                  Confirmar Código y Actualizar Contraseña
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* SUB-MENU 4: NOTIFICACIONES E HISTORIAL */}
      {activeTab === 'alertas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {preferences && (
            <Card padding="lg">
              <h3 style={{ margin: '0 0 12px 0', fontSize: '17px', fontWeight: 800 }}>Preferencias de Alertas</h3>
              <div className={styles.prefGrid}>
                <label className={styles.prefItem}>
                  <div>
                    <strong>Alertas de Mascota Perdida</strong>
                    <p>Recibir avisos inmediatos cuando alguien escanee el QR de tu mascota</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.lost_pet_alerts}
                    onChange={() => handleTogglePref('lost_pet_alerts')}
                  />
                </label>

                <label className={styles.prefItem}>
                  <div>
                    <strong>Recordatorios de Vacunas y Salud</strong>
                    <p>Avisos antes del vencimiento de vacunas o desparasitaciones</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.vaccine_reminders}
                    onChange={() => handleTogglePref('vaccine_reminders')}
                  />
                </label>

                <label className={styles.prefItem}>
                  <div>
                    <strong>Notificaciones por Correo Electrónico</strong>
                    <p>Reportes de seguridad y confirmaciones en {user?.email}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.email_enabled}
                    onChange={() => handleTogglePref('email_enabled')}
                  />
                </label>
              </div>
            </Card>
          )}

          <Card padding="lg">
            <h3 style={{ margin: '0 0 12px 0', fontSize: '17px', fontWeight: 800 }}>Historial de Activaciones</h3>
            {paymentsHistory.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                Aún no tienes activaciones registradas en tu historial.
              </p>
            ) : (
              <div className={styles.historyTableWrap}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Detalle</th>
                      <th>Importe</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsHistory.map((pay) => (
                      <tr key={pay.id}>
                        <td>{new Date(pay.paid_at || pay.created_at).toLocaleDateString('es-PE')}</td>
                        <td>
                          <strong>Activación de Plan Premium</strong>
                        </td>
                        <td>
                          {Number(pay.amount) === 0 ? (
                            <Badge variant="success" size="sm">
                              Bonificado / Código
                            </Badge>
                          ) : (
                            `S/ ${Number(pay.amount).toFixed(2)}`
                          )}
                        </td>
                        <td>
                          <Badge variant="primary" size="sm">
                            Activo
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal: Request External Payment Code via WhatsApp */}
      <Modal
        isOpen={!!selectedPlanInfo}
        onClose={() => setSelectedPlanInfo(null)}
        title={selectedPlanInfo ? `Solicitar ${selectedPlanInfo.label}` : 'Solicitar Código'}
        subtitle="Pago externo por Yape, Plin o transferencia"
        icon="vpn_key"
        maxWidth="sm"
      >
        {selectedPlanInfo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                background: 'var(--surface-container-low)',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid var(--outline-variant)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{selectedPlanInfo.label}</strong>
                <Badge variant="primary" size="sm">
                  S/ {selectedPlanInfo.pricePen.toFixed(2)} ({selectedPlanInfo.durationDays} días)
                </Badge>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                1. Solicita tu código por WhatsApp realizando el pago por Yape o Plin.
                <br />
                2. Recibirás tu código de activación y podrás ingresarlo en la pestaña <strong>Activar Código y Planes</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <Button variant="outline" onClick={() => setSelectedPlanInfo(null)}>
                Cerrar
              </Button>
              <Button
                variant="primary"
                icon="chat"
                onClick={() => {
                  const text = encodeURIComponent(
                    `Hola Mascotas QR 🐾, deseo adquirir un Código de Activación para el *${selectedPlanInfo.label}* (${selectedPlanInfo.durationDays} días - S/ ${selectedPlanInfo.pricePen.toFixed(2)}).\n\nMi cuenta es: ${user?.email || ''}`,
                  );
                  window.open(`https://wa.me/51999888777?text=${text}`, '_blank', 'noopener,noreferrer');
                }}
              >
                Solicitar por WhatsApp
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Edit Owner Profile */}
      <Modal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        title="Editar Datos de mi Perfil"
        subtitle="Mantén tu teléfono actualizado para emergencias"
        icon="person"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Nombre *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Apellido *"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <Input
            label="Teléfono / WhatsApp de Emergencia *"
            placeholder="+51 987 654 321"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <Button variant="outline" type="button" onClick={() => setEditProfileOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" icon="save" isLoading={isSavingProfile}>
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
