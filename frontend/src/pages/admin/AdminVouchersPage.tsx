import React, { useState, useEffect } from 'react';
import { authService } from '../../services/auth.service';
import { subsService } from '../../services/subs.service';
import { qrService } from '../../services/qr.service';
import { useToast } from '../../contexts/ToastContext';
import { AdminUserAccount, Voucher } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { Spinner } from '../../components/ui/Spinner';
import styles from './AdminVouchers.module.css';

export const AdminVouchersPage: React.FC = () => {
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState<AdminUserAccount[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [qrBatchesData, setQrBatchesData] = useState<{ batches: any[]; tags: any[] }>({ batches: [], tags: [] });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTableFilter, setAuditTableFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Account Subscription Management Modal state
  const [selectedAccount, setSelectedAccount] = useState<AdminUserAccount | null>(null);
  const [grantPlanType, setGrantPlanType] = useState<
    'trial_7d' | 'trial_14d' | 'monthly_1m' | 'quarterly_3m' | 'semiannual_6m' | 'annual_1y' | 'custom' | 'free'
  >('monthly_1m');
  const [grantCustomDays, setGrantCustomDays] = useState<number | ''>(30);
  const [grantNotes, setGrantNotes] = useState('');
  const [isGranting, setIsGranting] = useState(false);

  // Admin Password Reset Modal state
  const [resetPasswordAccount, setResetPasswordAccount] = useState<AdminUserAccount | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Voucher Generator form
  const [tier, setTier] = useState('premium');
  const [durationOption, setDurationOption] = useState('30');
  const [customDays, setCustomDays] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [prefix, setPrefix] = useState('ACT');
  const [notes, setNotes] = useState('');
  const [lastGenerated, setLastGenerated] = useState<Voucher[]>([]);

  // QR Batch Generator form
  const [batchCode, setBatchCode] = useState(`LOT-${new Date().getFullYear()}-002`);
  const [batchQty, setBatchQty] = useState(10);
  const [batchNotes, setBatchNotes] = useState('');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [lastBatchTags, setLastBatchTags] = useState<string[]>([]);

  const fetchAllAdminData = async () => {
    try {
      const [accountsRes, vouchersRes, batchesRes, auditRes] = await Promise.all([
        subsService.listAccountsForAdmin().catch(() => []),
        subsService.listVouchers(undefined, 100),
        qrService.getBatches().catch(() => ({ batches: [], tags: [] })),
        qrService.getAuditLogs(undefined, 100).catch(() => []),
      ]);
      setAccounts(accountsRes);
      setVouchers(vouchersRes);
      setQrBatchesData(batchesRes);
      setAuditLogs(auditRes);
    } catch {
      error('Error al cargar los datos de administración');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const handleOpenGrantModal = (acc: AdminUserAccount) => {
    setSelectedAccount(acc);
    setGrantPlanType('monthly_1m');
    setGrantCustomDays(30);
    setGrantNotes('');
  };

  const handleConfirmGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setIsGranting(true);
    try {
      const res = await subsService.adminGrantSubscription(selectedAccount.id, {
        planType: grantPlanType,
        customDays: grantPlanType === 'custom' ? Number(grantCustomDays) || 30 : undefined,
        notes: grantNotes || undefined,
      });
      success(res.message || 'Suscripción de la cuenta actualizada con éxito');
      setSelectedAccount(null);
      await fetchAllAdminData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al actualizar la cuenta');
    } finally {
      setIsGranting(false);
    }
  };

  const handleConfirmAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordAccount) return;
    if (adminNewPassword.trim().length < 8) {
      error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await authService.adminResetPassword(resetPasswordAccount.id, {
        newPassword: adminNewPassword.trim(),
      });
      success(res.message || `Contraseña restablecida para ${resetPasswordAccount.email}`);
      setResetPasswordAccount(null);
      setAdminNewPassword('');
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al restablecer la contraseña');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleFilterAudit = async (table: string) => {
    setAuditTableFilter(table);
    try {
      const data = await qrService.getAuditLogs(table || undefined, 100);
      setAuditLogs(data);
    } catch {
      error('Error al filtrar auditoría');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    const durationDays = durationOption === 'custom' ? Number(customDays) || 30 : Number(durationOption);

    try {
      const res = await subsService.generateVouchers({
        tier,
        durationDays,
        quantity,
        codePrefix: prefix,
        notes: notes || undefined,
      });

      success(`¡Se generaron ${res.generatedCount} códigos de activación con éxito!`);
      setLastGenerated(res.vouchers);
      setNotes('');
      fetchAllAdminData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al generar los códigos de activación');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCode.trim()) return;
    setIsGeneratingBatch(true);
    try {
      const res = await qrService.createBatch({
        batchCode: batchCode.trim().toUpperCase(),
        quantity: batchQty,
        notes: batchNotes || undefined,
      });
      success(`¡Lote ${res.batch.batch_code} creado con ${res.generatedTagsCount} placas QR!`);
      setLastBatchTags(res.sampleTags || []);
      setBatchNotes('');
      fetchAllAdminData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al crear el lote de placas QR');
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    success(`Código ${code} copiado al portapapeles`);
  };

  if (isLoading) return <Spinner label="Cargando centro de control administrativo..." />;

  const adminTabs = [
    { id: 'accounts', label: `Gestión de Cuentas (${accounts.length})`, icon: 'manage_accounts' },
    { id: 'vouchers', label: `Vouchers & Códigos (${vouchers.length})`, icon: 'confirmation_number' },
    { id: 'qr_batches', label: `Lotes de Placas QR (${qrBatchesData.tags.length})`, icon: 'qr_code_2' },
    { id: 'audit', label: `Auditoría del Sistema (${auditLogs.length})`, icon: 'policy' },
  ];

  const getAccountDaysRemaining = (endDate?: string | null) => {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Centro de Control Administrativo</h1>
          <p className={styles.subtitle}>
            Gestión de cuentas (pruebas gratis, planes por mes/año), emisión de vouchers, placas QR y auditoría.
          </p>
        </div>
        <Badge variant="primary" size="md">
          ADMIN / SUPPORT
        </Badge>
      </div>

      <Tabs tabs={adminTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'accounts' && (
        <Card padding="lg" className={styles.auditCard}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div className={styles.cardTitleRow} style={{ marginBottom: '4px' }}>
                <span className="material-symbols-outlined text-primary">manage_accounts</span>
                <h3>Cuentas de Usuarios y Suscripciones por Tiempo ({accounts.length})</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--on-surface-variant)' }}>
                Activa pruebas gratis (7 o 14 días), asigna planes de 1 mes, 3 meses, 6 meses o 1 año, o administra el
                estado de cada tutor.
              </p>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tutor / Cuenta</th>
                  <th>Teléfono</th>
                  <th>Mascotas</th>
                  <th>Plan Actual</th>
                  <th>Vigencia / Días Restantes</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => {
                  const isTrial = acc.tier === 'premium' && acc.subscription_status === 'trialing';
                  const isPrem = acc.tier === 'premium';
                  const daysLeft = getAccountDaysRemaining(acc.current_period_end);

                  return (
                    <tr key={acc.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--on-surface)' }}>
                          {acc.first_name} {acc.last_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>{acc.email}</div>
                      </td>
                      <td>{acc.phone || <span className={styles.mutedText}>No reg.</span>}</td>
                      <td>
                        <Badge variant="neutral" size="sm">
                          🐾 {acc.pets_count ?? 0}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          variant={isTrial ? 'warning' : isPrem ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {isTrial ? 'Prueba Gratis' : isPrem ? 'Premium Activo' : 'Plan Free'}
                        </Badge>
                        {acc.provider_subscription_id && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                            {acc.provider_subscription_id}
                          </div>
                        )}
                      </td>
                      <td>
                        {isPrem && acc.current_period_end ? (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                              {daysLeft} {daysLeft === 1 ? 'día restante' : 'días restantes'}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: 'var(--on-surface-variant)' }}>
                              Hasta {new Date(acc.current_period_end).toLocaleDateString('es-PE')}
                            </div>
                          </div>
                        ) : (
                          <span className={styles.mutedText}>Sin fecha límite (Free)</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            icon="edit_calendar"
                            onClick={() => handleOpenGrantModal(acc)}
                          >
                            Tiempo / Plan
                          </Button>
                          <Button
                            variant="surface"
                            size="sm"
                            icon="lock_reset"
                            onClick={() => {
                              setResetPasswordAccount(acc);
                              setAdminNewPassword('Maskay2026!');
                            }}
                          >
                            Clave
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'vouchers' && (
        <div className={styles.grid}>
          {/* Left: Generator Form */}
          <Card padding="lg" className={styles.generatorCard}>
            <div className={styles.cardTitleRow}>
              <span className="material-symbols-outlined text-primary">add_circle</span>
              <h3>Generar Nuevos Códigos</h3>
            </div>

            <form onSubmit={handleGenerate} className={styles.form}>
              <Select
                label="Plan a Activar"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                options={[
                  { value: 'premium', label: 'Plan Premium (Acceso Total)' },
                  { value: 'free', label: 'Plan Free' },
                ]}
              />

              <Select
                label="Duración del Código"
                value={durationOption}
                onChange={(e) => setDurationOption(e.target.value)}
                options={[
                  { value: '7', label: 'Prueba Gratis Corta (7 días de acceso)' },
                  { value: '14', label: 'Prueba Gratis Estándar (14 días de acceso)' },
                  { value: '30', label: '1 Mes (30 días de acceso)' },
                  { value: '90', label: '3 Meses (90 días de acceso)' },
                  { value: '180', label: '6 Meses (180 días de acceso)' },
                  { value: '365', label: '1 Año (365 días de acceso)' },
                  { value: 'custom', label: 'Días Personalizados...' },
                ]}
              />

              {durationOption === 'custom' && (
                <Input
                  label="Número de días exactos *"
                  type="number"
                  min={1}
                  placeholder="Ej: 45 o 60"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value ? parseInt(e.target.value) : '')}
                  required
                />
              )}

              <div className={styles.row}>
                <Input
                  label="Cantidad en Lote"
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  helperText="Máximo 100 por lote"
                />

                <Input
                  label="Prefijo (Opcional)"
                  placeholder="Ej: ACT, TRIAL, VIP"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                />
              </div>

              <Input
                label="Nota de Emisión / Auditoría"
                placeholder="Ej: Venta Yape #1042 - Juan Perez, o Promo Prueba Gratis"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isGenerating}
                icon="confirmation_number"
              >
                Generar {quantity} Código(s) de Activación
              </Button>
            </form>

            {/* Newly Generated Result Box */}
            {lastGenerated.length > 0 && (
              <div className={styles.generatedBox}>
                <h4>🎉 Códigos recién generados ({lastGenerated.length}):</h4>
                <div className={styles.codeList}>
                  {lastGenerated.map((v) => (
                    <div key={v.id} className={styles.codeItem}>
                      <code>{v.code}</code>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => copyToClipboard(v.code)}
                        title="Copiar código"
                      >
                        <span className="material-symbols-outlined">content_copy</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Right: History & Audit Table */}
          <Card padding="lg" className={styles.auditCard}>
            <div className={styles.cardTitleRow}>
              <span className="material-symbols-outlined text-secondary">history</span>
              <h3>Historial de Códigos Emitidos ({vouchers.length})</h3>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Duración</th>
                    <th>Estado</th>
                    <th>Canjeado por</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className={styles.codeRow}>
                          <strong>{v.code}</strong>
                          <button
                            className={styles.smallCopy}
                            onClick={() => copyToClipboard(v.code)}
                            title="Copiar"
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                        </div>
                        {v.notes && <span className={styles.tableNotes}>{v.notes}</span>}
                      </td>
                      <td>{v.duration_days} días</td>
                      <td>
                        <Badge
                          variant={
                            v.status === 'available'
                              ? 'success'
                              : v.status === 'redeemed'
                              ? 'neutral'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {v.status === 'available'
                            ? 'Disponible'
                            : v.status === 'redeemed'
                            ? 'Canjeado'
                            : v.status}
                        </Badge>
                      </td>
                      <td>
                        {v.redeemed_by_name ? (
                          <span>
                            {v.redeemed_by_name} ({v.redeemed_by_phone || 'Sin tel.'})
                          </span>
                        ) : (
                          <span className={styles.mutedText}>Sin canjear</span>
                        )}
                      </td>
                      <td>{new Date(v.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'qr_batches' && (
        <div className={styles.grid}>
          <Card padding="lg" className={styles.generatorCard}>
            <div className={styles.cardTitleRow}>
              <span className="material-symbols-outlined text-primary">qr_code_2</span>
              <h3>Fabricar Lote de Placas QR</h3>
            </div>
            <form onSubmit={handleCreateBatch} className={styles.form}>
              <Input
                label="Código de Lote de Producción *"
                placeholder="Ej: LOT-2026-002"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
                required
              />
              <Input
                label="Cantidad de Placas QR a Generar *"
                type="number"
                min={1}
                max={200}
                value={batchQty}
                onChange={(e) => setBatchQty(parseInt(e.target.value) || 1)}
                required
              />
              <Input
                label="Notas de Producción / Proveedor"
                placeholder="Ej: Acero inoxidable grabado láser - Lima"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isGeneratingBatch}
                icon="factory"
              >
                Generar {batchQty} Placas QR
              </Button>
            </form>

            {lastBatchTags.length > 0 && (
              <div className={styles.generatedBox}>
                <h4>🎉 Placas QR generadas ({lastBatchTags.length}):</h4>
                <div className={styles.codeList}>
                  {lastBatchTags.map((code) => (
                    <div key={code} className={styles.codeItem}>
                      <code>{code}</code>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => copyToClipboard(code)}
                      >
                        <span className="material-symbols-outlined">content_copy</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card padding="lg" className={styles.auditCard}>
            <div className={styles.cardTitleRow}>
              <span className="material-symbols-outlined text-secondary">inventory_2</span>
              <h3>Inventario de Placas QR ({qrBatchesData.tags.length})</h3>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código QR</th>
                    <th>Lote</th>
                    <th>Estado</th>
                    <th>Mascota Vinculada</th>
                    <th>Escaneos</th>
                  </tr>
                </thead>
                <tbody>
                  {qrBatchesData.tags.map((t: any) => (
                    <tr key={t.id}>
                      <td>
                        <div className={styles.codeRow}>
                          <strong>{t.public_code}</strong>
                          <button
                            className={styles.smallCopy}
                            onClick={() => copyToClipboard(t.public_code)}
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                        </div>
                      </td>
                      <td>{t.batch_code || '—'}</td>
                      <td>
                        <Badge
                          variant={t.status === 'active' ? 'primary' : t.status === 'available' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {t.status === 'active' ? 'Vinculada' : t.status === 'available' ? 'Disponible' : t.status}
                        </Badge>
                      </td>
                      <td>{t.pet_name || <span className={styles.mutedText}>Sin vincular</span>}</td>
                      <td>{t.scans_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'audit' && (
        <Card padding="lg" className={styles.auditCard}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div className={styles.cardTitleRow} style={{ marginBottom: 0 }}>
              <span className="material-symbols-outlined text-secondary">policy</span>
              <h3>Bitácora de Auditoría de Base de Datos ({auditLogs.length})</h3>
            </div>
            <div style={{ minWidth: 220 }}>
              <Select
                label=""
                value={auditTableFilter}
                onChange={(e) => handleFilterAudit(e.target.value)}
                options={[
                  { value: '', label: 'Todas las tablas' },
                  { value: 'pets', label: 'Mascotas (pets)' },
                  { value: 'qr_tags', label: 'Placas QR (qr_tags)' },
                  { value: 'lost_pet_reports', label: 'Alertas SOS (lost_pet_reports)' },
                  { value: 'subscriptions', label: 'Suscripciones (subscriptions)' },
                  { value: 'orders', label: 'Órdenes Tienda (orders)' },
                ]}
              />
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Tabla</th>
                  <th>Acción</th>
                  <th>Registro ID</th>
                  <th>Usuario Actor</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td>{new Date(log.changed_at || log.created_at).toLocaleString()}</td>
                    <td>
                      <code>{log.table_name}</code>
                    </td>
                    <td>
                      <Badge
                        variant={
                          log.action === 'INSERT'
                            ? 'success'
                            : log.action === 'DELETE'
                            ? 'emergency'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem' }}>{log.record_id}</code>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem' }}>
                        {log.first_name
                          ? `${log.first_name} ${log.last_name || ''}`.trim()
                          : log.changed_by || log.actor_user_id || 'Sistema / Público'}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Admin Grant Subscription / Trial to Account */}
      <Modal
        isOpen={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        title={
          selectedAccount
            ? `Gestionar Cuenta: ${selectedAccount.first_name} ${selectedAccount.last_name}`
            : 'Gestionar Suscripción'
        }
        subtitle="Otorga una prueba gratis, activa un plan por meses/año o cambia el estado de la cuenta."
        icon="manage_accounts"
      >
        {selectedAccount && (
          <form onSubmit={handleConfirmGrant} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                fontSize: '0.84rem',
              }}
            >
              <div>
                <strong>Correo:</strong> {selectedAccount.email}
              </div>
              <div>
                <strong>Estado actual:</strong>{' '}
                {selectedAccount.tier === 'premium'
                  ? selectedAccount.subscription_status === 'trialing'
                    ? 'Prueba Gratis Activa'
                    : 'Premium Activo'
                  : 'Plan Free'}
              </div>
            </div>

            <Select
              label="Tipo de Plan o Tiempo a Otorgar *"
              value={grantPlanType}
              onChange={(e) => setGrantPlanType(e.target.value as any)}
              options={[
                { value: 'trial_7d', label: '🎁 Prueba Gratis Premium — 7 Días' },
                { value: 'trial_14d', label: '🎁 Prueba Gratis Premium — 14 Días' },
                { value: 'monthly_1m', label: '📅 Plan Mensual — 1 Mes (+30 días)' },
                { value: 'quarterly_3m', label: '📅 Plan Trimestral — 3 Meses (+90 días)' },
                { value: 'semiannual_6m', label: '📅 Plan Semestral — 6 Meses (+180 días)' },
                { value: 'annual_1y', label: '⭐ Plan Anual — 1 Año (+365 días)' },
                { value: 'custom', label: '⚙️ Días Personalizados...' },
                { value: 'free', label: '⬇️ Pasar a Plan Free Básico' },
              ]}
            />

            {grantPlanType === 'custom' && (
              <Input
                label="Cantidad de Días a Otorgar *"
                type="number"
                min={1}
                max={3650}
                value={grantCustomDays}
                onChange={(e) => setGrantCustomDays(e.target.value ? parseInt(e.target.value) : '')}
                required
              />
            )}

            <Input
              label="Motivo / Nota Administrativa (Opcional)"
              placeholder="Ej: Pago confirmado por Yape, Cortesía de soporte, etc."
              value={grantNotes}
              onChange={(e) => setGrantNotes(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="outline" type="button" onClick={() => setSelectedAccount(null)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" isLoading={isGranting} icon="save">
                Aplicar a la Cuenta
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Admin Reset Password for Account */}
      <Modal
        isOpen={!!resetPasswordAccount}
        onClose={() => setResetPasswordAccount(null)}
        title={
          resetPasswordAccount
            ? `Restablecer Contraseña: ${resetPasswordAccount.first_name} ${resetPasswordAccount.last_name}`
            : 'Restablecer Contraseña'
        }
        subtitle="Asigna una nueva contraseña temporal para que el dueño pueda ingresar a su cuenta."
        icon="lock_reset"
      >
        {resetPasswordAccount && (
          <form
            onSubmit={handleConfirmAdminResetPassword}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                fontSize: '0.84rem',
              }}
            >
              <div>
                <strong>Cuenta:</strong> {resetPasswordAccount.email}
              </div>
              <div>
                <strong>Teléfono:</strong> {resetPasswordAccount.phone || 'No registrado'}
              </div>
            </div>

            <Input
              label="Nueva Contraseña Temporal (mínimo 8 caracteres) *"
              type="text"
              placeholder="Ej: Maskay2026!"
              value={adminNewPassword}
              onChange={(e) => setAdminNewPassword(e.target.value)}
              required
              helperText="Comparte esta contraseña con el dueño por su WhatsApp verificado para que pueda iniciar sesión y cambiarla."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="outline" type="button" onClick={() => setResetPasswordAccount(null)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" isLoading={isResettingPassword} icon="save">
                Guardar Nueva Contraseña
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
