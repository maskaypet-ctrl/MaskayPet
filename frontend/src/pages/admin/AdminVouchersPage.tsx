import React, { useState, useEffect } from 'react';
import { subsService } from '../../services/subs.service';
import { useToast } from '../../contexts/ToastContext';
import { Voucher } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import styles from './AdminVouchers.module.css';

export const AdminVouchersPage: React.FC = () => {
  const { success, error } = useToast();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generator form
  const [tier, setTier] = useState('premium');
  const [durationOption, setDurationOption] = useState('30');
  const [customDays, setCustomDays] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [prefix, setPrefix] = useState('ACT');
  const [notes, setNotes] = useState('');
  const [lastGenerated, setLastGenerated] = useState<Voucher[]>([]);

  const fetchVouchers = async () => {
    try {
      const data = await subsService.listVouchers(undefined, 100);
      setVouchers(data);
    } catch {
      error('Error al cargar la lista de vouchers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

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
      fetchVouchers();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al generar los códigos de activación');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    success(`Código ${code} copiado al portapapeles`);
  };

  if (isLoading) return <Spinner label="Cargando panel de administración de vouchers..." />;

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Generador & Auditoría de Códigos de Activación</h1>
          <p className={styles.subtitle}>
            Emite códigos de un solo uso para activar suscripciones Premium con duración personalizable
            (1 mes, 6 meses, 1 año).
          </p>
        </div>
        <Badge variant="primary" size="md">
          ADMIN / SUPPORT
        </Badge>
      </div>

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
                placeholder="Ej: ACT, VIP, VET-SM"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              />
            </div>

            <Input
              label="Nota de Emisión / Auditoría"
              placeholder="Ej: Venta Yape #1042 - Juan Perez, o Convenio Vet San Martin"
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
                        <span>{v.redeemed_by_name} ({v.redeemed_by_phone || 'Sin tel.'})</span>
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
    </div>
  );
};
