import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './Auth.module.css';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      error('Por favor completa todos los campos requeridos');
      return;
    }

    if (password.length < 8) {
      error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      error('Las contraseñas no coinciden. Por favor verifícalas.', 'Validación');
      return;
    }

    if (!acceptedTerms) {
      error('Debes aceptar los Términos y Condiciones y la Política de Privacidad de MaskayPet para continuar.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        firstName,
        lastName,
        phone,
        email,
        password,
      });
      success('¡Cuenta creada con éxito! Bienvenido a MaskayPet.');
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
          : (rawMsg || 'Error al registrar la cuenta. Intente con otro correo.');
        error(msg, 'Error de Registro');
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
            <span className="material-symbols-outlined">pets</span>
          </div>
          <div>
            <h1 className={styles.brandTitle}>MaskayPet</h1>
            <span className={styles.brandSubtitle}>Care & Rescue System</span>
          </div>
        </div>

        <div className={styles.bannerContent}>
          <div className={styles.pillBadge}>
            <span className="material-symbols-outlined">shield</span>
            <span>Registro Oficial de Tutores</span>
          </div>
          <h2 className={styles.bannerHeading}>
            Crea tu cuenta y protege a tus mascotas en minutos.
          </h2>
          <p className={styles.bannerDescription}>
            Vincula placas inteligentes, programa recordatorios veterinarios y mantén a tu familia
            protegida con la plataforma de rescate líder.
          </p>
        </div>
      </div>

      {/* Right Form Section */}
      <div className={styles.formSection}>
        <div className={styles.formCard}>
          {/* Mobile Brand Header */}
          <div className={styles.mobileBrandHeader}>
            <div className={styles.mobileLogoBox}>
              <span className="material-symbols-outlined">pets</span>
            </div>
            <div className={styles.mobileBrandText}>
              <span className={styles.mobileBrandTitle}>MaskayPet</span>
              <span className={styles.mobileBrandSubtitle}>Care & Rescue System</span>
            </div>
          </div>

          <div className={styles.formHeader}>
            <h2 className={styles.title}>Crear Cuenta</h2>
            <p className={styles.subtitle}>Ingresa tus datos para registrarte como tutor responsable.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.row}>
              <Input
                label="Nombre *"
                placeholder="Carlos"
                icon="person"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Apellido *"
                placeholder="Alberto"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <Input
              label="Teléfono Móvil / WhatsApp"
              type="tel"
              placeholder="+51 987 654 321"
              icon="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Se utilizará para contacto de emergencia si tu mascota se extravía"
            />

            <Input
              label="Correo Electrónico *"
              type="email"
              placeholder="tu.correo@ejemplo.com"
              icon="mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className={styles.row}>
              <Input
                label="Contraseña *"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                icon="lock"
                rightIcon={showPassword ? 'visibility_off' : 'visibility'}
                onRightIconClick={() => setShowPassword(!showPassword)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="Confirmar Contraseña *"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repite tu contraseña"
                icon="lock_clock"
                rightIcon={showConfirmPassword ? 'visibility_off' : 'visibility'}
                onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className={styles.termsRow}>
              <label className={styles.termsLabel}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                />
                <span>
                  He leído y acepto los{' '}
                  <a href="/terminos" target="_blank" rel="noreferrer" className={styles.legalLink}>
                    Términos y Condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="/privacidad" target="_blank" rel="noreferrer" className={styles.legalLink}>
                    Política de Privacidad
                  </a>{' '}
                  de <strong>MaskayPet</strong>.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              icon="how_to_reg"
            >
              Completar Registro
            </Button>
          </form>

          <div className={styles.footerText}>
            <span>¿Ya tienes una cuenta registrada? </span>
            <Link to="/login" className={styles.link}>
              Iniciar Sesión
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
