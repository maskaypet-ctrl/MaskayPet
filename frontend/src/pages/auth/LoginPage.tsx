import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import styles from './Auth.module.css';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password recovery by Email Code (OTP)
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [devCodePreview, setDevCodePreview] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);

  const handleRequestRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim() || !recoveryEmail.includes('@')) {
      error('Ingresa el correo electrónico de tu cuenta');
      return;
    }
    setIsRecoveryLoading(true);
    try {
      const res = await authService.requestPasswordCode(recoveryEmail.trim());
      setRecoveryStep(2);
      if (res.verificationCodePreview) {
        setDevCodePreview(res.verificationCodePreview);
      }
      success(`Código de verificación enviado a ${recoveryEmail.trim()}`);
    } catch (err: any) {
      error(err.response?.data?.message || 'No se pudo enviar el código de verificación');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  const handleConfirmRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim()) {
      error('Ingresa el código de 6 dígitos enviado a tu correo');
      return;
    }
    if (newPassword.length < 8) {
      error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      error('Las contraseñas no coinciden');
      return;
    }
    setIsRecoveryLoading(true);
    try {
      const res = await authService.confirmPasswordCode({
        email: recoveryEmail.trim(),
        code: recoveryCode.trim(),
        newPassword,
      });
      success(res.message || '¡Contraseña actualizada! Ahora puedes iniciar sesión.');
      setEmail(recoveryEmail.trim());
      setForgotModalOpen(false);
      setRecoveryStep(1);
      setRecoveryCode('');
      setDevCodePreview(null);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      error(err.response?.data?.message || 'Código inválido o expirado');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email, password });
      success('¡Bienvenido de vuelta!');
      navigate('/dashboard');
    } catch (err: any) {
      if (!err.response) {
        error(
          'No se pudo conectar con el servidor. Verifica que tu teléfono y tu PC estén en la misma red Wi-Fi.',
          'Error de Conexión',
        );
      } else {
        const rawMsg = err.response?.data?.message;
        const msg = Array.isArray(rawMsg)
          ? rawMsg.join(', ')
          : (rawMsg || 'Credenciales inválidas. Revisa tu correo y contraseña.');
        error(msg, 'Error de Autenticación');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authWrapper}>
      {/* Left Branding Banner */}
      <div className={styles.bannerSection}>
        <div className={styles.brandHeader}>
          <div className={styles.logoBox}>
            <img src="/app-logo.png" alt="MaskayPet Logo" className={styles.logoImg} />
          </div>
          <div>
            <h1 className={styles.brandTitle}>MaskayPet</h1>
            <span className={styles.brandSubtitle}>Care & Rescue System</span>
          </div>
        </div>

        <div className={styles.bannerContent}>
          <div className={styles.pillBadge}>
            <span className="material-symbols-outlined">verified_user</span>
            <span>Sistema Integral de Identificación y Salud</span>
          </div>
          <h2 className={styles.bannerHeading}>
            La tranquilidad de saber que tu mejor amigo siempre volverá a casa.
          </h2>
          <p className={styles.bannerDescription}>
            Accede al pasaporte médico de tu mascota, gestiona sus vacunas y mantén su placa
            inteligente conectada a la red de rescate nacional.
          </p>

          <div className={styles.statsPreview}>
            <div className={styles.statMini}>
              <span className={styles.statNum}>100%</span>
              <span className={styles.statLbl}>Geolocalización GPS</span>
            </div>
            <div className={styles.statMini}>
              <span className={styles.statNum}>24/7</span>
              <span className={styles.statLbl}>Modo Perdido Activo</span>
            </div>
            <div className={styles.statMini}>
              <span className={styles.statNum}>Instant</span>
              <span className={styles.statLbl}>Escaneo sin Apps</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className={styles.formSection}>
        <div className={styles.formCard}>
          {/* Mobile Brand Header */}
          <div className={styles.mobileBrandHeader}>
            <div className={styles.mobileLogoBox}>
              <img src="/logo-circle.png" alt="MaskayPet Logo" className={styles.logoImg} />
            </div>
            <div className={styles.mobileBrandText}>
              <span className={styles.mobileBrandTitle}>MaskayPet</span>
              <span className={styles.mobileBrandSubtitle}>Care & Rescue System</span>
            </div>
          </div>

          <div className={styles.formHeader}>
            <h2 className={styles.title}>Iniciar Sesión</h2>
            <p className={styles.subtitle}>Ingresa tus credenciales para acceder a tu panel de tutor.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="tu.correo@ejemplo.com"
              icon="mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon="lock"
              rightIcon={showPassword ? 'visibility_off' : 'visibility'}
              onRightIconClick={() => setShowPassword(!showPassword)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px' }}>
              <button
                type="button"
                onClick={() => {
                  setRecoveryEmail(email);
                  setForgotModalOpen(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              icon="login"
            >
              Ingresar a mi Cuenta
            </Button>
          </form>

          <div className={styles.footerText}>
            <span>¿Aún no tienes una cuenta? </span>
            <Link to="/register" className={styles.link}>
              Crear cuenta de tutor
            </Link>
          </div>

          <div className={styles.legalFooterLinks}>
            <Link to="/terminos">Términos de Uso</Link>
            <span>•</span>
            <Link to="/privacidad">Privacidad</Link>
          </div>
        </div>
      </div>

      {/* Modal: Recuperar Contraseña mediante Código al Correo */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => {
          setForgotModalOpen(false);
          setRecoveryStep(1);
          setDevCodePreview(null);
        }}
        title="Recuperar Contraseña por Correo"
        subtitle="Recibe un código de verificación de 6 dígitos en tu correo electrónico"
        icon="mark_email_read"
      >
        {recoveryStep === 1 ? (
          <form onSubmit={handleRequestRecoveryCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--on-surface-variant)' }}>
              Ingresa el correo electrónico de tu cuenta y te enviaremos un código de verificación de 6 dígitos para
              crear tu nueva contraseña:
            </p>

            <Input
              label="Tu Correo Registrado *"
              type="email"
              placeholder="tu.correo@ejemplo.com"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              required
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" type="button" onClick={() => setForgotModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                icon="send"
                isLoading={isRecoveryLoading}
              >
                Enviar Código al Correo
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmRecoveryCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
              📩 Código enviado a <strong>{recoveryEmail}</strong>. Ingresa los 6 dígitos y tu nueva contraseña.
              {devCodePreview && (
                <div style={{ marginTop: '6px', fontWeight: 800, color: 'var(--primary)' }}>
                  Código generado (Modo Local): <code>{devCodePreview}</code>
                </div>
              )}
            </div>

            <Input
              label="Código de Verificación (6 dígitos) *"
              placeholder="Ej: 482910"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              required
            />

            <Input
              label="Nueva Contraseña (mínimo 8 caracteres) *"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirmar Nueva Contraseña *"
              type="password"
              placeholder="••••••••"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setRecoveryStep(1);
                  setDevCodePreview(null);
                }}
              >
                Cambiar Correo / Reenviar
              </Button>
              <Button
                variant="primary"
                type="submit"
                icon="check_circle"
                isLoading={isRecoveryLoading}
              >
                Actualizar Contraseña
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
