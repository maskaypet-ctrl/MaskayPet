import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { petsService } from '../../services/pets.service';
import { healthService } from '../../services/health.service';
import { lostService } from '../../services/lost.service';
import { useToast } from '../../contexts/ToastContext';
import {
  PetDetail,
  Vaccination,
  Deworming,
  Treatment,
  Diagnosis,
  WeightRecord,
  Appointment,
  MedicalDocument,
  LocationPing,
} from '../../types';
import { Tabs } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { PetAvatar } from '../../components/ui/PetAvatar';
import { QRCodeModal } from '../../components/ui/QRCodeModal';
import styles from './PetDetail.module.css';

export const PetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'passport';
  const { success, error } = useToast();
  const outletContext = useOutletContext<{ openEmergencyModal?: () => void }>() || {};

  const [pet, setPet] = useState<PetDetail | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(true);

  // Radar / GPS Pings state
  const [locationPings, setLocationPings] = useState<LocationPing[]>([]);
  const [selectedPing, setSelectedPing] = useState<LocationPing | null>(null);

  // Health records state
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [deworming, setDeworming] = useState<Deworming[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);

  // Modals state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [addVaccineOpen, setAddVaccineOpen] = useState(false);
  const [addDewormingOpen, setAddDewormingOpen] = useState(false);
  const [addTreatmentOpen, setAddTreatmentOpen] = useState(false);
  const [addDiagnosisOpen, setAddDiagnosisOpen] = useState(false);
  const [addWeightOpen, setAddWeightOpen] = useState(false);
  const [addAppointmentOpen, setAddAppointmentOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);

  // Form states for adding items
  const [vaccineForm, setVaccineForm] = useState({ vaccineName: '', applicationDate: '', nextDueDate: '', clinicName: '', notes: '' });
  const [dewormingForm, setDewormingForm] = useState({ productName: '', applicationDate: '', nextDueDate: '', weightAtApplicationKg: 0, notes: '' });
  const [treatmentForm, setTreatmentForm] = useState({ treatmentName: '', medicationName: '', dosage: '', frequency: '', startDate: '', instructions: '' });
  const [diagnosisForm, setDiagnosisForm] = useState({ diagnosis: '', diagnosisDate: '', description: '' });
  const [weightForm, setWeightForm] = useState({ weightKg: 0, measuredAt: '', notes: '' });
  const [appointmentForm, setAppointmentForm] = useState({ scheduledAt: '', reason: '', notes: '' });
  const [contactForm, setContactForm] = useState({ name: '', relationship: 'Familiar', phone: '', whatsapp: '', isPrimary: false, canReceiveLostAlerts: true });
  const [contactErrors, setContactErrors] = useState<{ name?: string; phone?: string; whatsapp?: string }>({});
  const [sameAsPhone, setSameAsPhone] = useState(false);

  // Privacy Profile Form state
  const [privacyProfile, setPrivacyProfile] = useState({
    show_pet_name: true,
    show_photo: true,
    show_breed: true,
    show_owner_name: false,
    show_owner_phone: false,
    show_contacts: false,
    show_medical_info: false,
    emergency_message: '',
  });

  const loadPetData = useCallback(async () => {
    if (!id) return;
    try {
      const [
        detail,
        vacs,
        deworms,
        treats,
        diags,
        wRecs,
        appts,
        docs,
        locHistory,
      ] = await Promise.all([
        petsService.getPetById(id),
        healthService.getVaccinations(id).catch(() => []),
        healthService.getDeworming(id).catch(() => []),
        healthService.getTreatments(id).catch(() => []),
        healthService.getDiagnoses(id).catch(() => []),
        healthService.getWeightRecords(id).catch(() => []),
        healthService.getAppointments(id).catch(() => []),
        healthService.getDocuments(id).catch(() => []),
        lostService.getLocationHistory(id).catch(() => ({ pings: [], scans: [] })),
      ]);

      setPet(detail);
      setVaccinations(vacs);
      setDeworming(deworms);
      setTreatments(treats);
      setDiagnoses(diags);
      setWeights(wRecs);
      setAppointments(appts);
      setDocuments(docs);
      if (locHistory?.pings) {
        setLocationPings(locHistory.pings);
        if (locHistory.pings.length > 0) {
          setSelectedPing(locHistory.pings[0]);
        }
      }

      if (detail.publicProfile) {
        setPrivacyProfile({
          show_pet_name: detail.publicProfile.show_pet_name,
          show_photo: detail.publicProfile.show_photo,
          show_breed: detail.publicProfile.show_breed,
          show_owner_name: detail.publicProfile.show_owner_name,
          show_owner_phone: detail.publicProfile.show_owner_phone,
          show_contacts: detail.publicProfile.show_contacts,
          show_medical_info: detail.publicProfile.show_medical_info,
          emergency_message: detail.publicProfile.emergency_message || '',
        });
      }
    } catch {
      error('Error al cargar la ficha de la mascota');
    } finally {
      setIsLoading(false);
    }
  }, [id, error]);

  useEffect(() => {
    loadPetData();
  }, [loadPetData]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handlers for adding records
  const handleAddVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await healthService.addVaccination(id, {
        ...vaccineForm,
        nextDueDate: vaccineForm.nextDueDate || undefined,
      });
      success('Vacuna registrada con éxito');
      setAddVaccineOpen(false);
      setVaccineForm({ vaccineName: '', applicationDate: '', nextDueDate: '', clinicName: '', notes: '' });
      loadPetData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al registrar vacuna');
    }
  };

  const handleAddDeworming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await healthService.addDeworming(id, {
        ...dewormingForm,
        weightAtApplicationKg: Number(dewormingForm.weightAtApplicationKg) || undefined,
        nextDueDate: dewormingForm.nextDueDate || undefined,
      });
      success('Desparasitación registrada con éxito');
      setAddDewormingOpen(false);
      setDewormingForm({ productName: '', applicationDate: '', nextDueDate: '', weightAtApplicationKg: 0, notes: '' });
      loadPetData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al registrar desparasitación');
    }
  };

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await healthService.addTreatment(id, treatmentForm);
      success('Tratamiento registrado con éxito');
      setAddTreatmentOpen(false);
      setTreatmentForm({ treatmentName: '', medicationName: '', dosage: '', frequency: '', startDate: '', instructions: '' });
      loadPetData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al registrar tratamiento');
    }
  };

  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await healthService.addDiagnosis(id, diagnosisForm);
      success('Diagnóstico registrado con éxito');
      setAddDiagnosisOpen(false);
      setDiagnosisForm({ diagnosis: '', diagnosisDate: '', description: '' });
      loadPetData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al registrar diagnóstico');
    }
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await healthService.addWeightRecord(id, {
        weightKg: Number(weightForm.weightKg),
        measuredAt: weightForm.measuredAt,
        notes: weightForm.notes,
      });
      success('Pesaje registrado con éxito');
      setAddWeightOpen(false);
      setWeightForm({ weightKg: 0, measuredAt: '', notes: '' });
      loadPetData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al registrar pesaje');
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await healthService.addAppointment(id, appointmentForm);
      success('Cita veterinaria agendada');
      setAddAppointmentOpen(false);
      setAppointmentForm({ scheduledAt: '', reason: '', notes: '' });
      loadPetData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al agendar cita');
    }
  };

  const validatePhoneNumber = (value: string, fieldLabel: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Solo permitir números, espacios, guiones, paréntesis y un '+' opcional al inicio
    if (!/^\+?[0-9\s\-()]+$/.test(trimmed)) {
      return `${fieldLabel} solo puede contener números, espacios y un '+' inicial`;
    }

    // Contar los dígitos numéricos reales
    const digits = (trimmed.match(/\d/g) || []).length;
    if (digits < 7) {
      return `${fieldLabel} incompleto: mínimo 7 dígitos (ej: +51 987 654 321)`;
    }
    if (digits > 15) {
      return `${fieldLabel} inválido: no debe superar 15 dígitos (estándar internacional)`;
    }

    return null;
  };

  const handleContactPhoneChange = (val: string) => {
    const updated = { ...contactForm, phone: val };
    if (sameAsPhone) {
      updated.whatsapp = val;
    }
    setContactForm(updated);

    const err = val.trim() ? validatePhoneNumber(val, 'Teléfono móvil') : 'El teléfono móvil es obligatorio';
    setContactErrors((prev) => ({
      ...prev,
      phone: err || undefined,
      ...(sameAsPhone ? { whatsapp: val.trim() ? (validatePhoneNumber(val, 'WhatsApp') || undefined) : undefined } : {}),
    }));
  };

  const handleContactWhatsappChange = (val: string) => {
    setContactForm({ ...contactForm, whatsapp: val });
    const err = validatePhoneNumber(val, 'WhatsApp');
    setContactErrors((prev) => ({
      ...prev,
      whatsapp: val.trim() ? (err || undefined) : undefined,
    }));
  };

  const handleContactNameChange = (val: string) => {
    setContactForm({ ...contactForm, name: val });
    setContactErrors((prev) => ({
      ...prev,
      name: val.trim().length >= 2 ? undefined : 'El nombre debe tener al menos 2 caracteres',
    }));
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    // Validación estricta y coherente de todos los campos
    const nameErr = contactForm.name.trim().length < 2
      ? 'El nombre completo es obligatorio (mínimo 2 caracteres)'
      : undefined;

    const phoneTrimmed = contactForm.phone.trim();
    const phoneErr = !phoneTrimmed
      ? 'El teléfono móvil es obligatorio'
      : (validatePhoneNumber(phoneTrimmed, 'Teléfono móvil') || undefined);

    const waTrimmed = contactForm.whatsapp.trim();
    const waErr = waTrimmed
      ? (validatePhoneNumber(waTrimmed, 'WhatsApp') || undefined)
      : undefined;

    if (nameErr || phoneErr || waErr) {
      setContactErrors({ name: nameErr, phone: phoneErr, whatsapp: waErr });
      error('Por favor verifica que el teléfono y WhatsApp tengan un formato numérico coherente');
      return;
    }

    try {
      await petsService.addContact(id, {
        name: contactForm.name.trim(),
        relationship: contactForm.relationship.trim() || 'Familiar',
        phone: contactForm.phone.trim(),
        whatsapp: contactForm.whatsapp.trim() || undefined,
        isPrimary: contactForm.isPrimary,
        canReceiveLostAlerts: contactForm.canReceiveLostAlerts,
      });
      success('Contacto de emergencia agregado con éxito');
      setAddContactOpen(false);
      setContactForm({ name: '', relationship: 'Familiar', phone: '', whatsapp: '', isPrimary: false, canReceiveLostAlerts: true });
      setContactErrors({});
      setSameAsPhone(false);
      loadPetData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al agregar contacto');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!id) return;
    try {
      await petsService.deleteContact(id, contactId);
      success('Contacto eliminado');
      loadPetData();
    } catch {
      error('Error al eliminar contacto');
    }
  };

  const handleSavePrivacy = async () => {
    if (!id) return;
    try {
      await petsService.updatePublicProfile(id, privacyProfile as any);
      success('Preferencias de privacidad del perfil QR actualizadas');
    } catch {
      error('Error al actualizar preferencias de privacidad');
    }
  };

  if (isLoading) return <Spinner label="Cargando pasaporte clínico..." />;
  if (!pet) return <p>Mascota no encontrada.</p>;

  const tabs = [
    { id: 'passport', label: 'Pasaporte de Salud & Vacunas', icon: 'medical_services' },
    { id: 'radar', label: 'Radar GPS & Mapa', icon: 'my_location', badge: locationPings.length || undefined },
    { id: 'general', label: 'Datos Generales', icon: 'info' },
    { id: 'contacts', label: 'Contactos de Emergencia', icon: 'contact_phone', badge: pet.contacts?.length },
    { id: 'privacy', label: 'Privacidad del QR', icon: 'visibility' },
  ];

  return (
    <div className={styles.petDetailPage}>
      {/* Back Button */}
      <button className={styles.backBtn} onClick={() => navigate('/pets')}>
        <span className="material-symbols-outlined">arrow_back</span>
        <span>Volver al listado de mascotas</span>
      </button>

      {/* Main Pet Header Banner */}
      <Card padding="lg" className={`${styles.heroCard} ${pet.is_lost ? styles.heroCardLost : ''}`}>
        <div className={styles.heroLeft}>
          <div className={styles.avatarLargeWrap}>
            <PetAvatar
              src={pet.photo_storage_path}
              name={pet.name}
              species={pet.species}
              size="xl"
            />
            {pet.is_lost && (
              <span className={styles.heroLostBadge}>
                <span className="material-symbols-outlined">warning</span>
              </span>
            )}
          </div>

          <div className={styles.heroInfo}>
            <div className={styles.heroTitleRow}>
              <h1 className={styles.heroName}>{pet.name}</h1>
              {pet.qr_public_code ? (
                <Badge variant="primary" size="md">
                  {pet.qr_public_code}
                </Badge>
              ) : (
                <Badge variant="outline" size="md">
                  Sin Placa QR
                </Badge>
              )}
              {pet.is_lost && (
                <Badge variant="emergency" size="md">
                  MODO PERDIDO ACTIVO
                </Badge>
              )}
            </div>

            <p className={styles.heroMeta}>
              {pet.species === 'perro' ? '🐕 Perro' : pet.species === 'gato' ? '🐈 Gato' : '🐾 Mascota'}{' '}
              • {pet.breed || 'Mestizo'} •{' '}
              {pet.sex === 'male' ? 'Macho' : pet.sex === 'female' ? 'Hembra' : 'Desconocido'}
              {pet.birth_date ? ` • Nacimiento: ${pet.birth_date}` : ''}
            </p>

            <div className={styles.heroTags}>
              {pet.is_sterilized && (
                <span className={styles.tagPill}>
                  <span className="material-symbols-outlined">verified</span> Esterilizado
                </span>
              )}
              {pet.microchip_number && (
                <span className={styles.tagPill}>
                  <span className="material-symbols-outlined">memory</span> Chip: {pet.microchip_number}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hero Actions */}
        <div className={styles.heroActions}>
          {pet.is_lost ? (
            <Button
              variant="emergency"
              icon="e911_emergency"
              onClick={() => outletContext.openEmergencyModal?.()}
            >
              Resolver / Desactivar Alerta
            </Button>
          ) : (
            <Button
              variant="outline"
              icon="e911_emergency"
              onClick={() => outletContext.openEmergencyModal?.()}
            >
              Activar Modo Perdido
            </Button>
          )}

          {pet.qr_public_code ? (
            <>
              <Button
                variant="primary"
                icon="qr_code_2"
                onClick={() => setQrModalOpen(true)}
              >
                Ver Código QR
              </Button>
              <Button
                variant="surface"
                icon="visibility"
                onClick={() => window.open(`/qr/${pet.qr_public_code}`, '_blank')}
              >
                Simular Escaneo
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              icon="qr_code_scanner"
              onClick={() => navigate('/vincular-qr')}
            >
              Vincular Placa QR
            </Button>
          )}
        </div>
      </Card>

      {/* Navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Pasaporte de Salud */}
      {activeTab === 'passport' && (
        <div className={styles.tabContent}>
          {/* Vacunas Section */}
          <Card padding="md" className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitleRow}>
                <span className="material-symbols-outlined text-primary">vaccines</span>
                <h3>Historial de Vacunación</h3>
              </div>
              <Button size="sm" variant="secondary" icon="add" onClick={() => setAddVaccineOpen(true)}>
                + Registrar Vacuna
              </Button>
            </div>

            {vaccinations.length === 0 ? (
              <p className={styles.emptyNote}>No hay vacunas registradas aún.</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Vacuna</th>
                      <th>Fecha Aplicación</th>
                      <th>Próximo Refuerzo</th>
                      <th>Lote / Clínica</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccinations.map((vac) => {
                      const isExpired = vac.next_due_date && new Date(vac.next_due_date) < new Date();
                      return (
                        <tr key={vac.id}>
                          <td><strong>{vac.vaccine_name}</strong></td>
                          <td>{vac.application_date}</td>
                          <td>{vac.next_due_date || 'N/A'}</td>
                          <td>{vac.clinic_name || vac.batch_number || 'Veterinaria Particular'}</td>
                          <td>
                            <Badge variant={isExpired ? 'warning' : 'success'} size="sm">
                              {isExpired ? 'Vencida / Requiere Refuerzo' : 'Vigente'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Desparasitaciones & Control de Peso */}
          <div className={styles.twoColGrid}>
            <Card padding="md" className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitleRow}>
                  <span className="material-symbols-outlined text-secondary">bug_report</span>
                  <h3>Desparasitaciones</h3>
                </div>
                <Button size="sm" variant="surface" icon="add" onClick={() => setAddDewormingOpen(true)}>
                  + Añadir
                </Button>
              </div>

              {deworming.length === 0 ? (
                <p className={styles.emptyNote}>Sin registros de desparasitación.</p>
              ) : (
                <ul className={styles.recordList}>
                  {deworming.map((dew) => (
                    <li key={dew.id} className={styles.recordItem}>
                      <div>
                        <strong>{dew.product_name}</strong>
                        <p className={styles.recordSub}>
                          Aplicado: {dew.application_date} {dew.weight_at_application_kg ? `(${dew.weight_at_application_kg} kg)` : ''}
                        </p>
                      </div>
                      {dew.next_due_date && (
                        <Badge variant="neutral" size="sm">
                          Próx: {dew.next_due_date}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card padding="md" className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitleRow}>
                  <span className="material-symbols-outlined">monitor_weight</span>
                  <h3>Control de Peso</h3>
                </div>
                <Button size="sm" variant="surface" icon="add" onClick={() => setAddWeightOpen(true)}>
                  + Pesar
                </Button>
              </div>

              {weights.length === 0 ? (
                <p className={styles.emptyNote}>Sin registros de peso.</p>
              ) : (
                <ul className={styles.recordList}>
                  {weights.map((w) => (
                    <li key={w.id} className={styles.recordItem}>
                      <div>
                        <span className={styles.weightValue}>{w.weight_kg} kg</span>
                        {w.notes && <p className={styles.recordSub}>{w.notes}</p>}
                      </div>
                      <span className={styles.recordSub}>{w.measured_at || w.created_at?.substring(0, 10)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Tratamientos Médicos & Diagnósticos */}
          <div className={styles.twoColGrid}>
            <Card padding="md" className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitleRow}>
                  <span className="material-symbols-outlined">medication</span>
                  <h3>Tratamientos Médicos</h3>
                </div>
                <Button size="sm" variant="surface" icon="add" onClick={() => setAddTreatmentOpen(true)}>
                  + Añadir
                </Button>
              </div>

              {treatments.length === 0 ? (
                <p className={styles.emptyNote}>No hay tratamientos médicos activos.</p>
              ) : (
                <ul className={styles.recordList}>
                  {treatments.map((t) => (
                    <li key={t.id} className={styles.recordItem}>
                      <div>
                        <strong>{t.treatment_name}</strong> {t.medication_name && `(${t.medication_name})`}
                        <p className={styles.recordSub}>
                          {t.dosage} {t.frequency ? `• ${t.frequency}` : ''} ({t.start_date})
                        </p>
                      </div>
                      <Badge variant={t.status === 'active' ? 'primary' : 'neutral'} size="sm">
                        {t.status === 'active' ? 'Activo' : 'Completado'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card padding="md" className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitleRow}>
                  <span className="material-symbols-outlined">stethoscope</span>
                  <h3>Diagnósticos Clínicos</h3>
                </div>
                <Button size="sm" variant="surface" icon="add" onClick={() => setAddDiagnosisOpen(true)}>
                  + Añadir
                </Button>
              </div>

              {diagnoses.length === 0 ? (
                <p className={styles.emptyNote}>Sin diagnósticos registrados.</p>
              ) : (
                <ul className={styles.recordList}>
                  {diagnoses.map((d) => (
                    <li key={d.id} className={styles.recordItem}>
                      <div>
                        <strong>{d.diagnosis}</strong>
                        {d.description && <p className={styles.recordSub}>{d.description}</p>}
                      </div>
                      <span className={styles.recordSub}>{d.diagnosis_date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Datos Generales */}
      {activeTab === 'general' && (
        <Card padding="lg" className={styles.tabContent}>
          <h3 className={styles.subHeading}>Información Básica de la Mascota</h3>
          <div className={styles.generalGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Nombre:</span>
              <span className={styles.detailVal}>{pet.name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Especie:</span>
              <span className={styles.detailVal}>{pet.species.toUpperCase()}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Raza:</span>
              <span className={styles.detailVal}>{pet.breed || 'Mestizo'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Sexo:</span>
              <span className={styles.detailVal}>{pet.sex === 'male' ? 'Macho' : 'Hembra'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Microchip:</span>
              <span className={styles.detailVal}>{pet.microchip_number || 'No registrado'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Esterilizado:</span>
              <span className={styles.detailVal}>{pet.is_sterilized ? 'Sí' : 'No'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Color:</span>
              <span className={styles.detailVal}>{pet.color || 'No especificado'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Placa QR:</span>
              <span className={styles.detailVal}>{pet.qr_public_code || 'Sin placa vinculada'}</span>
            </div>
          </div>
          {pet.description && (
            <div className={styles.descriptionBox}>
              <strong>Descripción / Personalidad:</strong>
              <p>{pet.description}</p>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Contactos de Emergencia */}
      {activeTab === 'contacts' && (
        <div className={styles.tabContent}>
          <div className={styles.tabHeaderRow}>
            <div>
              <h3>Contactos de Emergencia</h3>
              <p className={styles.emptyNote}>
                Estas personas recibirán llamadas o alertas prioritarias cuando alguien escanee la placa QR de {pet.name}.
              </p>
            </div>
            <Button variant="primary" icon="add" onClick={() => setAddContactOpen(true)}>
              + Agregar Contacto
            </Button>
          </div>

          <div className={styles.contactsGrid}>
            {pet.contacts?.map((contact) => (
              <Card key={contact.id} padding="md" className={styles.contactCard}>
                <div className={styles.contactCardHeader}>
                  <div>
                    <h4 className={styles.contactName}>{contact.name}</h4>
                    <span className={styles.contactRel}>{contact.relationship || 'Contacto'}</span>
                  </div>
                  {contact.is_primary && (
                    <Badge variant="primary" size="sm">
                      Principal
                    </Badge>
                  )}
                </div>

                <div className={styles.contactDetails}>
                  {contact.phone && (
                    <div className={styles.contactLine}>
                      <span className="material-symbols-outlined">call</span>
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div className={styles.contactLine}>
                      <span className="material-symbols-outlined">chat</span>
                      <span>WhatsApp: {contact.whatsapp}</span>
                    </div>
                  )}
                </div>

                <div className={styles.contactActions}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon="delete"
                    onClick={() => handleDeleteContact(contact.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Privacidad del QR Público */}
      {activeTab === 'privacy' && (
        <Card padding="lg" className={styles.tabContent}>
          <div className={styles.privacyHeader}>
            <div>
              <h3 className={styles.subHeading}>Configuración de Visibilidad del Perfil QR</h3>
              <p className={styles.emptyNote}>
                Controla exactamente qué datos verá una persona cuando escanee la chapa física de tu mascota en la calle.
              </p>
            </div>
            <Button variant="primary" icon="save" onClick={handleSavePrivacy}>
              Guardar Cambios
            </Button>
          </div>

          <div className={styles.privacyToggles}>
            <label className={styles.toggleRow}>
              <div>
                <strong>Mostrar nombre de la mascota</strong>
                <p className={styles.toggleDesc}>Permite que el rescatista vea cómo se llama {pet.name}</p>
              </div>
              <input
                type="checkbox"
                checked={privacyProfile.show_pet_name}
                onChange={(e) => setPrivacyProfile({ ...privacyProfile, show_pet_name: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <strong>Mostrar foto oficial</strong>
                <p className={styles.toggleDesc}>Facilita la verificación visual de la mascota</p>
              </div>
              <input
                type="checkbox"
                checked={privacyProfile.show_photo}
                onChange={(e) => setPrivacyProfile({ ...privacyProfile, show_photo: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <strong>Mostrar raza y características</strong>
                <p className={styles.toggleDesc}>Muestra color, especie y raza en el escaneo</p>
              </div>
              <input
                type="checkbox"
                checked={privacyProfile.show_breed}
                onChange={(e) => setPrivacyProfile({ ...privacyProfile, show_breed: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <strong>Mostrar teléfono del tutor principal</strong>
                <p className={styles.toggleDesc}>Habilita el botón de llamada directa al tutor</p>
              </div>
              <input
                type="checkbox"
                checked={privacyProfile.show_owner_phone}
                onChange={(e) => setPrivacyProfile({ ...privacyProfile, show_owner_phone: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <strong>Mostrar contactos de emergencia secundarios</strong>
                <p className={styles.toggleDesc}>Lista los teléfonos de los contactos adicionales registrados</p>
              </div>
              <input
                type="checkbox"
                checked={privacyProfile.show_contacts}
                onChange={(e) => setPrivacyProfile({ ...privacyProfile, show_contacts: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <strong>Mostrar resumen médico (Vacunas recientes)</strong>
                <p className={styles.toggleDesc}>Demuestra que la mascota está vacunada y con salud al día</p>
              </div>
              <input
                type="checkbox"
                checked={privacyProfile.show_medical_info}
                onChange={(e) => setPrivacyProfile({ ...privacyProfile, show_medical_info: e.target.checked })}
              />
            </label>

            <div className={styles.emergencyMsgSection}>
              <label className={styles.detailLbl}>Mensaje de Emergencia en Modo Perdido:</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={privacyProfile.emergency_message}
                onChange={(e) => setPrivacyProfile({ ...privacyProfile, emergency_message: e.target.value })}
                placeholder="¡Esta mascota se encuentra extraviada! Por favor comunícate con su familia."
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 5: Radar GPS & Mapa Satelital */}
      {activeTab === 'radar' && (
        <div className={styles.radarContainer}>
          {/* Status Banner */}
          <div className={`${styles.radarStatusBanner} ${pet.is_lost ? styles.activeSearch : ''}`}>
            <div className={styles.radarStatusLeft}>
              <div className={`${styles.radarPulseIcon} ${pet.is_lost ? '' : styles.normalRadar}`}>
                <span className={`material-symbols-outlined ${pet.is_lost ? 'animate-pulse-fast' : ''}`}>
                  {pet.is_lost ? 'emergency_home' : 'radar'}
                </span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  {pet.is_lost ? '¡Alerta de Rastreo Activa: Mascota en Modo Perdido!' : 'Radar Satelital de Coordenadas'}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                  {locationPings.length > 0
                    ? `Se han recibido ${locationPings.length} transmisión(es) de geolocalización satelital.`
                    : 'A la espera de transmisiones satelitales al escanear la placa QR.'}
                </p>
              </div>
            </div>

            <Button
              variant="surface"
              size="sm"
              icon="refresh"
              onClick={loadPetData}
            >
              Actualizar Radar
            </Button>
          </div>

          {locationPings.length > 0 && selectedPing ? (() => {
            const currentLat = Number(selectedPing.latitude) || 0;
            const currentLng = Number(selectedPing.longitude) || 0;
            const currentAcc = Math.round(Number(selectedPing.accuracy_m) || 10);
            const bboxLeft = (currentLng - 0.008).toFixed(6);
            const bboxBottom = (currentLat - 0.006).toFixed(6);
            const bboxRight = (currentLng + 0.008).toFixed(6);
            const bboxTop = (currentLat + 0.006).toFixed(6);
            const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bboxLeft}%2C${bboxBottom}%2C${bboxRight}%2C${bboxTop}&layer=mapnik&marker=${currentLat}%2C${currentLng}`;

            return (
              <>
                {/* Map Card */}
                <Card padding="md" className={styles.mapSectionCard}>
                  <div className={styles.pingsListHead}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                        📍 Ubicación del Hallazgo en el Mapa
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                        Coordenadas recibidas el {new Date(selectedPing.captured_at).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <Badge variant={currentAcc <= 50 ? 'success' : currentAcc <= 200 ? 'primary' : 'warning'} size="sm">
                        Precisión ±{currentAcc}m
                      </Badge>
                      {currentAcc > 200 && (
                        <span style={{ fontSize: '11px', color: 'var(--outline)', textAlign: 'right' }}>
                          Estimación por red Wi-Fi/IP (PC). En smartphone con GPS: 5 a 15m
                        </span>
                      )}
                    </div>
                  </div>

                  {/* OpenStreetMap Real Interactive Map with Marker */}
                  <div className={styles.mapFrameWrap}>
                    <iframe
                      title="Mapa de Ubicación de la Mascota"
                      className={styles.mapIframe}
                      src={osmEmbedUrl}
                    />
                  </div>

                  {/* Map Toolbar Actions */}
                  <div className={styles.mapToolbar}>
                    <div className={styles.mapCoordsText}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                        my_location
                      </span>
                      <span>
                        Lat: {currentLat.toFixed(6)}, Lng: {currentLng.toFixed(6)}
                      </span>
                    </div>

                    <div className={styles.mapActions}>
                      <Button
                        variant="primary"
                        size="sm"
                        icon="open_in_new"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`,
                            '_blank',
                          )
                        }
                      >
                        Abrir en Google Maps
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="navigation"
                        onClick={() =>
                          window.open(
                            `https://waze.com/ul?ll=${currentLat},${currentLng}&navigate=yes`,
                            '_blank',
                          )
                        }
                      >
                        Abrir en Waze
                      </Button>
                      <Button
                        variant="surface"
                        size="sm"
                        icon="content_copy"
                        onClick={() => {
                          navigator.clipboard.writeText(`${currentLat}, ${currentLng}`);
                          success('Coordenadas GPS copiadas al portapapeles');
                        }}
                      >
                        Copiar GPS
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Ping History List */}
                <Card padding="md" className={styles.pingsListCard}>
                  <div className={styles.pingsListHead}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                      Historial de Escaneos y Transmisiones ({locationPings.length})
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--outline)' }}>
                      Haz clic en cualquier punto para visualizarlo en el mapa
                    </span>
                  </div>

                  <div className={styles.pingsGrid}>
                    {locationPings.map((ping, idx) => {
                      const isSelected = selectedPing.id === ping.id;
                      const pLat = Number(ping.latitude) || 0;
                      const pLng = Number(ping.longitude) || 0;
                      const pAcc = Math.round(Number(ping.accuracy_m) || 10);

                      return (
                        <div
                          key={ping.id || idx}
                          className={`${styles.pingCard} ${isSelected ? styles.selectedPing : ''}`}
                          onClick={() => setSelectedPing(ping)}
                        >
                          <div className={styles.pingTopRow}>
                            <span className={styles.pingTime}>
                              {new Date(ping.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <Badge variant={idx === 0 ? 'success' : 'outline'} size="sm">
                              {idx === 0 ? 'Más Reciente' : `Punto #${locationPings.length - idx}`}
                            </Badge>
                          </div>
                          <span className={styles.pingCoords}>
                            {pLat.toFixed(5)}, {pLng.toFixed(5)}
                          </span>
                          <div className={styles.pingTopRow}>
                            <span className={styles.pingAccuracy}>
                              Precisión: ±{pAcc}m
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>
                              {isSelected ? '✓ Viendo en mapa' : 'Ver en mapa →'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            );
          })() : (
            <Card padding="lg" className={styles.emptyRadarCard}>
              <div className={styles.emptyRadarIcon}>
                <span className="material-symbols-outlined">satellite_alt</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
                Aún no hay transmisiones de ubicación
              </h3>
              <p style={{ margin: 0, maxWidth: '520px', color: 'var(--on-surface-variant)', fontSize: '14px', lineHeight: 1.5 }}>
                En cuanto una persona encuentre a tu mascota, escanee su placa inteligente y presione{' '}
                <strong>"📍 Enviar mi ubicación actual"</strong>, las coordenadas GPS aparecerán de inmediato en este mapa satelital.
              </p>
              {pet.qr_public_code && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                  <Button
                    variant="primary"
                    icon="open_in_new"
                    onClick={() => window.open(`/qr/${pet.qr_public_code}`, '_blank')}
                  >
                    Probar Envío de Ubicación (Abrir Vista Pública)
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Modal: Add Vaccine */}
      <Modal isOpen={addVaccineOpen} onClose={() => setAddVaccineOpen(false)} title="Registrar Nueva Vacuna">
        <form onSubmit={handleAddVaccine} className={styles.modalForm}>
          <Input
            label="Nombre de la Vacuna *"
            placeholder="Ej: Antirrábica, Sextuple, Triple Felina..."
            value={vaccineForm.vaccineName}
            onChange={(e) => setVaccineForm({ ...vaccineForm, vaccineName: e.target.value })}
            required
          />
          <Input
            label="Fecha de Aplicación *"
            type="date"
            value={vaccineForm.applicationDate}
            onChange={(e) => setVaccineForm({ ...vaccineForm, applicationDate: e.target.value })}
            required
          />
          <Input
            label="Próximo Refuerzo (Auto recordatorio)"
            type="date"
            value={vaccineForm.nextDueDate}
            onChange={(e) => setVaccineForm({ ...vaccineForm, nextDueDate: e.target.value })}
          />
          <Input
            label="Clínica / Veterinario"
            placeholder="Ej: Clínica San Martín"
            value={vaccineForm.clinicName}
            onChange={(e) => setVaccineForm({ ...vaccineForm, clinicName: e.target.value })}
          />
          <Button variant="primary" type="submit" fullWidth>Guardar Vacuna</Button>
        </form>
      </Modal>

      {/* Modal: Add Deworming */}
      <Modal isOpen={addDewormingOpen} onClose={() => setAddDewormingOpen(false)} title="Registrar Desparasitación">
        <form onSubmit={handleAddDeworming} className={styles.modalForm}>
          <Input
            label="Producto / Antiparasitario *"
            placeholder="Ej: NexGard Spectra, Drontal, Bravecto..."
            value={dewormingForm.productName}
            onChange={(e) => setDewormingForm({ ...dewormingForm, productName: e.target.value })}
            required
          />
          <Input
            label="Fecha de Aplicación *"
            type="date"
            value={dewormingForm.applicationDate}
            onChange={(e) => setDewormingForm({ ...dewormingForm, applicationDate: e.target.value })}
            required
          />
          <Input
            label="Próxima Aplicación"
            type="date"
            value={dewormingForm.nextDueDate}
            onChange={(e) => setDewormingForm({ ...dewormingForm, nextDueDate: e.target.value })}
          />
          <Input
            label="Peso de la mascota (kg)"
            type="number"
            step="0.1"
            value={dewormingForm.weightAtApplicationKg || ''}
            onChange={(e) => setDewormingForm({ ...dewormingForm, weightAtApplicationKg: parseFloat(e.target.value) })}
          />
          <Button variant="primary" type="submit" fullWidth>Guardar Desparasitación</Button>
        </form>
      </Modal>

      {/* Modal: Add Weight */}
      <Modal isOpen={addWeightOpen} onClose={() => setAddWeightOpen(false)} title="Registrar Peso">
        <form onSubmit={handleAddWeight} className={styles.modalForm}>
          <Input
            label="Peso en Kilogramos (kg) *"
            type="number"
            step="0.05"
            placeholder="Ej: 14.5"
            value={weightForm.weightKg || ''}
            onChange={(e) => setWeightForm({ ...weightForm, weightKg: parseFloat(e.target.value) })}
            required
          />
          <Input
            label="Fecha de Pesaje *"
            type="date"
            value={weightForm.measuredAt}
            onChange={(e) => setWeightForm({ ...weightForm, measuredAt: e.target.value })}
            required
          />
          <Input
            label="Notas"
            placeholder="Ej: Control de rutina"
            value={weightForm.notes}
            onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })}
          />
          <Button variant="primary" type="submit" fullWidth>Registrar Pesaje</Button>
        </form>
      </Modal>

      {/* Modal: Add Emergency Contact */}
      <Modal
        isOpen={addContactOpen}
        onClose={() => {
          setAddContactOpen(false);
          setContactErrors({});
        }}
        title="Agregar Contacto de Emergencia"
        subtitle="Registra los números autorizados para recibir avisos de rescate y llamadas"
        icon="contact_phone"
      >
        <form onSubmit={handleAddContact} className={styles.modalForm} noValidate>
          <Input
            label="Nombre Completo *"
            placeholder="Ej: María Ramos"
            icon="person"
            value={contactForm.name}
            onChange={(e) => handleContactNameChange(e.target.value)}
            error={contactErrors.name}
            required
          />
          <Input
            label="Relación / Parentesco"
            placeholder="Ej: Hermano, Pareja, Veterinario de cabecera"
            icon="group"
            value={contactForm.relationship}
            onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
          />
          <Input
            label="Teléfono Móvil *"
            placeholder="+51 987 654 321"
            icon="call"
            type="tel"
            value={contactForm.phone}
            onChange={(e) => handleContactPhoneChange(e.target.value)}
            error={contactErrors.phone}
            helperText="Formato válido de 7 a 15 dígitos (ej: +51 987 654 321 o 987654321)"
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Input
              label="WhatsApp"
              placeholder="+51 987 654 321"
              icon="chat"
              type="tel"
              value={contactForm.whatsapp}
              onChange={(e) => {
                if (sameAsPhone) setSameAsPhone(false);
                handleContactWhatsappChange(e.target.value);
              }}
              error={contactErrors.whatsapp}
              helperText="Formato coherente (habilita botón de chat directo en caso de extravío)"
            />
            <label className={styles.checkboxLabel} style={{ marginTop: '-4px', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={sameAsPhone}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSameAsPhone(checked);
                  if (checked) {
                    const phoneVal = contactForm.phone;
                    setContactForm((prev) => ({ ...prev, whatsapp: phoneVal }));
                    const waErr = validatePhoneNumber(phoneVal, 'WhatsApp');
                    setContactErrors((prev) => ({ ...prev, whatsapp: phoneVal.trim() ? (waErr || undefined) : undefined }));
                  }
                }}
              />
              <span>Usar el mismo número del teléfono para WhatsApp</span>
            </label>
          </div>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={contactForm.isPrimary}
              onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
            />
            <span>Marcar como contacto principal prioritario</span>
          </label>
          <Button variant="primary" type="submit" fullWidth icon="person_add">
            Guardar Contacto
          </Button>
        </form>
      </Modal>

      {/* Modal: Add Treatment */}
      <Modal isOpen={addTreatmentOpen} onClose={() => setAddTreatmentOpen(false)} title="Registrar Tratamiento Médico">
        <form onSubmit={handleAddTreatment} className={styles.modalForm}>
          <Input
            label="Nombre del Tratamiento *"
            placeholder="Ej: Terapia antibiótica, Tratamiento articular..."
            value={treatmentForm.treatmentName}
            onChange={(e) => setTreatmentForm({ ...treatmentForm, treatmentName: e.target.value })}
            required
          />
          <Input
            label="Medicamento"
            placeholder="Ej: Amoxicilina 500mg"
            value={treatmentForm.medicationName}
            onChange={(e) => setTreatmentForm({ ...treatmentForm, medicationName: e.target.value })}
          />
          <div className={styles.formGrid}>
            <Input
              label="Dosis"
              placeholder="Ej: 1 tableta"
              value={treatmentForm.dosage}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, dosage: e.target.value })}
            />
            <Input
              label="Frecuencia"
              placeholder="Ej: Cada 12 horas"
              value={treatmentForm.frequency}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, frequency: e.target.value })}
            />
          </div>
          <Input
            label="Fecha de Inicio *"
            type="date"
            value={treatmentForm.startDate}
            onChange={(e) => setTreatmentForm({ ...treatmentForm, startDate: e.target.value })}
            required
          />
          <Input
            label="Instrucciones / Observaciones"
            placeholder="Ej: Administrar junto con las comidas"
            value={treatmentForm.instructions}
            onChange={(e) => setTreatmentForm({ ...treatmentForm, instructions: e.target.value })}
          />
          <Button variant="primary" type="submit" fullWidth>Guardar Tratamiento</Button>
        </form>
      </Modal>

      {/* Modal: Add Diagnosis */}
      <Modal isOpen={addDiagnosisOpen} onClose={() => setAddDiagnosisOpen(false)} title="Registrar Diagnóstico Clínico">
        <form onSubmit={handleAddDiagnosis} className={styles.modalForm}>
          <Input
            label="Diagnóstico *"
            placeholder="Ej: Otitis externa, Dermatitis alérgica..."
            value={diagnosisForm.diagnosis}
            onChange={(e) => setDiagnosisForm({ ...diagnosisForm, diagnosis: e.target.value })}
            required
          />
          <Input
            label="Fecha de Diagnóstico *"
            type="date"
            value={diagnosisForm.diagnosisDate}
            onChange={(e) => setDiagnosisForm({ ...diagnosisForm, diagnosisDate: e.target.value })}
            required
          />
          <Input
            label="Descripción / Hallazgos Clínicos"
            placeholder="Detalles del examen o recomendaciones veterinarias..."
            value={diagnosisForm.description}
            onChange={(e) => setDiagnosisForm({ ...diagnosisForm, description: e.target.value })}
          />
          <Button variant="primary" type="submit" fullWidth>Guardar Diagnóstico</Button>
        </form>
      </Modal>

      {/* Modal: Add Appointment */}
      <Modal isOpen={addAppointmentOpen} onClose={() => setAddAppointmentOpen(false)} title="Agendar Cita Veterinaria">
        <form onSubmit={handleAddAppointment} className={styles.modalForm}>
          <Input
            label="Fecha y Hora de la Cita *"
            type="datetime-local"
            value={appointmentForm.scheduledAt}
            onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduledAt: e.target.value })}
            required
          />
          <Input
            label="Motivo de Consulta *"
            placeholder="Ej: Chequeo anual, Limpieza dental, Vacunación..."
            value={appointmentForm.reason}
            onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
            required
          />
          <Input
            label="Notas adicionales"
            placeholder="Observaciones previas o clínica seleccionada..."
            value={appointmentForm.notes}
            onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
          />
          <Button variant="primary" type="submit" fullWidth>Agendar Cita</Button>
        </form>
      </Modal>

      {/* QR Code Scannable Modal */}
      {pet.qr_public_code && (
        <QRCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          qrCode={pet.qr_public_code}
          petName={pet.name}
          isLost={pet.is_lost}
        />
      )}
    </div>
  );
};

