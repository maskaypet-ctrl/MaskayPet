import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './Auth.module.css';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    </div>
  );
};
