import { Archive, Check, Download, Pencil, Pill, Plus, RotateCcw, Syringe, X } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  canManageMedicationAdministration,
  canManageMedicationCatalog,
  canRecordMedicationAdministration,
} from '@/features/medications/application/medication-permissions';
import {
  MedicationError,
  type BabyMedicationDraft,
  type MedicationAdministrationFilterOption,
  type MedicationAdministrationDraft,
  type MedicationAdministrationPage,
  type MedicationPageSize,
  type MedicationRepository,
} from '@/features/medications/application/medication-repository';
import {
  createMedicationAdministrationCsv,
  createMedicationAdministrationFileName,
} from '@/features/medications/application/medication-csv';
import {
  formatDose,
  createLocalAdministrationTimestamp,
  createMedicationPresetRange,
  medicationCategoryLabels,
  medicationRangeToTimestamps,
  parseDoseAmount,
  type BabyMedication,
  type BabyMedicationCategory,
  type BabyMedicationStatus,
  type MedicationDateRange,
  type MedicationRangePreset,
  type MedicationAdministration,
} from '@/features/medications/domain/baby-medication';
import { exportMedicationFile } from '@/features/medications/infrastructure/medication-file';
import { DatePickerField } from '@/features/baby-profile/presentation/date-picker-field';
import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import { SelectField, type SelectOption } from '@/features/baby-profile/presentation/select-field';
import { TimePickerField } from '@/features/care/presentation/time-picker-field';
import {
  getMedicationUnitSelection,
  resolveMedicationUnit,
} from '@/features/medications/domain/medication-unit';
import { MedicationUnitField } from '@/features/medications/presentation/medication-unit-field';
import type { FamilyRole } from '@/features/family/domain/family';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { DataPagination } from '@/shared/presentation/data-pagination';
import { dateToIso } from '@/shared/presentation/date';
import { KeyboardAwareScrollView } from '@/shared/presentation/keyboard-aware-scroll-view';
import { ResourceScreenHero } from '@/shared/presentation/resource-screen-hero';
import { resourceScreenContentStyle } from '@/shared/presentation/resource-screen-layout';
import { ResourceFormModal, ResponsiveFieldRow } from '@/shared/presentation/resource-form';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const categoryOptions = [
  { label: 'Medicamento', value: 'medication' },
  { label: 'Vacuna', value: 'vaccine' },
  { label: 'Suplemento', value: 'supplement' },
  { label: 'Otro', value: 'other' },
] satisfies SelectOption<BabyMedicationCategory>[];
const statusOptions = [
  { label: 'Activo', value: 'active' },
  { label: 'Inactivo', value: 'inactive' },
] satisfies SelectOption<BabyMedicationStatus>[];

type ViewMode = 'catalog' | 'administrations';

interface MedicationScreenProps {
  babyId: string;
  babyName: string;
  familyRole: FamilyRole;
  onBack: () => void;
  repository: MedicationRepository;
  topContent?: ReactNode;
  userId: string;
}

function messageFor(error: unknown): string {
  if (error instanceof MedicationError && error.reason === 'not_allowed') return 'No tienes permiso para realizar este cambio.';
  if (error instanceof MedicationError && error.reason === 'invalid') return 'Revisa la dosis, la unidad y los demás datos.';
  if (error instanceof MedicationError && error.reason === 'not_found') return 'Este registro ya no está disponible.';
  return 'No pudimos completar la acción. Comprueba la conexión e inténtalo de nuevo.';
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getMedicationDetails(medication: BabyMedication): string | undefined {
  const details = [
    medication.presentation,
    medication.indicatedDoseAmount !== undefined && medication.indicatedDoseUnit
      ? formatDose(medication.indicatedDoseAmount, medication.indicatedDoseUnit)
      : undefined,
  ].filter((value): value is string => Boolean(value));
  return details.length ? details.join(' · ') : undefined;
}

export function MedicationScreen({
  babyId,
  babyName,
  familyRole,
  onBack,
  repository,
  topContent,
  userId,
}: MedicationScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [mode, setMode] = useState<ViewMode>('administrations');
  const [medications, setMedications] = useState<BabyMedication[]>([]);
  const [showRetiredProducts, setShowRetiredProducts] = useState(false);
  const [showRetiredAdministrations, setShowRetiredAdministrations] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<MedicationPageSize>(20);
  const [administrations, setAdministrations] = useState<MedicationAdministrationPage>();
  const [administrationFilterOptions, setAdministrationFilterOptions] = useState<MedicationAdministrationFilterOption[]>([]);
  const [medicationFilter, setMedicationFilter] = useState('all');
  const [rangePreset, setRangePreset] = useState<MedicationRangePreset>('month');
  const [range, setRange] = useState<MedicationDateRange>(() => createMedicationPresetRange('month'));
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string>();
  const [editingMedication, setEditingMedication] = useState<BabyMedication>();
  const [editingAdministration, setEditingAdministration] = useState<MedicationAdministration>();
  const [retiringMedication, setRetiringMedication] = useState<BabyMedication>();
  const [retiringAdministration, setRetiringAdministration] = useState<MedicationAdministration>();
  const [confirmingAdministration, setConfirmingAdministration] = useState<MedicationAdministrationDraft>();
  const [confirmingIncompleteMedication, setConfirmingIncompleteMedication] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showAdministrationForm, setShowAdministrationForm] = useState(false);

  const [category, setCategory] = useState<BabyMedicationCategory>('medication');
  const [status, setStatus] = useState<BabyMedicationStatus>('active');
  const [name, setName] = useState('');
  const [presentation, setPresentation] = useState('');
  const [dose, setDose] = useState('');
  const [doseUnitPreset, setDoseUnitPreset] = useState('');
  const [customDoseUnit, setCustomDoseUnit] = useState('');
  const [route, setRoute] = useState('');
  const [instructions, setInstructions] = useState('');
  const [indicatedBy, setIndicatedBy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMedicationId, setSelectedMedicationId] = useState('');
  const [administeredDose, setAdministeredDose] = useState('');
  const [administeredUnitPreset, setAdministeredUnitPreset] = useState('');
  const [customAdministeredUnit, setCustomAdministeredUnit] = useState('');
  const [administrationNotes, setAdministrationNotes] = useState('');
  const [administrationDate, setAdministrationDate] = useState(dateToIso(new Date()));
  const [administrationHour, setAdministrationHour] = useState(String(new Date().getHours()).padStart(2, '0'));
  const [administrationMinute, setAdministrationMinute] = useState(String(new Date().getMinutes()).padStart(2, '0'));

  const medicationOptions = useMemo(() => medications.filter((item) => !item.retiredAt && item.status === 'active').map((item) => ({
    label: item.name,
    supportingText: getMedicationDetails(item),
    value: item.id,
  })), [medications]);
  const filterOptions = useMemo(() => [
    { label: 'Todos los medicamentos y vacunas', value: 'all' },
    ...administrationFilterOptions.map((item) => ({
      label: item.name,
      supportingText: item.presentation,
      value: item.medicationId,
    })),
  ], [administrationFilterOptions]);
  const administrationScopeFilters = useMemo(() => ({
    ...medicationRangeToTimestamps(range),
    retired: showRetiredAdministrations,
  }), [range, showRetiredAdministrations]);
  const administrationFilters = useMemo(() => ({
    ...administrationScopeFilters,
    medicationId: medicationFilter === 'all' ? undefined : medicationFilter,
  }), [administrationScopeFilters, medicationFilter]);

  useEffect(() => {
    let active = true;
    void repository.loadMedications(babyId, showRetiredProducts).then((items) => active && setMedications(items))
      .catch((reason) => active && setError(messageFor(reason)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [babyId, reload, repository, showRetiredProducts]);

  useEffect(() => {
    if (mode !== 'administrations') return;
    let active = true;
    void repository.loadAdministrationPage(babyId, page, pageSize, administrationFilters)
      .then((result) => active && setAdministrations(result))
      .catch((reason) => active && setError(messageFor(reason)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [administrationFilters, babyId, mode, page, pageSize, reload, repository]);

  useEffect(() => {
    if (mode !== 'administrations') return;
    let active = true;
    void repository.loadAdministrationFilterOptions(babyId, administrationScopeFilters)
      .then((options) => {
        if (!active) return;
        setAdministrationFilterOptions(options);
        setMedicationFilter((current) => current === 'all' || options.some((option) => option.medicationId === current) ? current : 'all');
      })
      .catch((reason) => active && setError(messageFor(reason)));
    return () => { active = false; };
  }, [administrationScopeFilters, babyId, mode, reload, repository]);

  function clearMedicationForm() {
    setCategory('medication'); setStatus('active'); setName(''); setPresentation(''); setDose('');
    setDoseUnitPreset(''); setCustomDoseUnit('');
    setRoute(''); setInstructions(''); setIndicatedBy(''); setStartDate(''); setEndDate('');
    setConfirmingIncompleteMedication(false); setEditingMedication(undefined); setShowMedicationForm(false);
  }

  function changeMode(nextMode: ViewMode) {
    if (nextMode === mode) return;
    setLoading(nextMode === 'administrations');
    clearMedicationForm();
    setShowAdministrationForm(false);
    setEditingAdministration(undefined);
    setConfirmingAdministration(undefined);
    setError(undefined);
    setPage(1);
    setMode(nextMode);
  }

  function selectRangePreset(nextPreset: MedicationRangePreset) {
    setRangePreset(nextPreset);
    if (nextPreset !== 'custom') setRange(createMedicationPresetRange(nextPreset));
    setPage(1);
  }

  function editMedication(item: BabyMedication) {
    setShowAdministrationForm(false); setEditingAdministration(undefined);
    setCategory(item.category); setStatus(item.status); setName(item.name); setPresentation(item.presentation ?? '');
    setDose(item.indicatedDoseAmount === undefined ? '' : String(item.indicatedDoseAmount).replace('.', ','));
    const unit = getMedicationUnitSelection(item.indicatedDoseUnit);
    setDoseUnitPreset(unit.preset); setCustomDoseUnit(unit.customValue);
    setRoute(item.administrationRoute ?? ''); setInstructions(item.instructions ?? '');
    setIndicatedBy(item.indicatedBy ?? ''); setStartDate(item.startDate ?? ''); setEndDate(item.endDate ?? '');
    setEditingMedication(item); setShowMedicationForm(true);
  }

  async function saveMedication(allowIncomplete = false) {
    const amount = dose.trim() ? parseDoseAmount(dose) : undefined;
    const doseUnit = resolveMedicationUnit(doseUnitPreset, customDoseUnit);
    if (!name.trim()) {
      setError('El nombre es obligatorio.'); return;
    }
    if (dose.trim() && !amount) {
      setError('Revisa la dosis indicada.'); return;
    }
    if (!allowIncomplete && (!presentation.trim() || !amount || !doseUnit.trim())) {
      setConfirmingIncompleteMedication(true); return;
    }
    const draft: BabyMedicationDraft = {
      administrationRoute: route || undefined, category, endDate: endDate || undefined,
      indicatedBy: indicatedBy || undefined, indicatedDoseAmount: amount,
      indicatedDoseUnit: doseUnit || undefined, instructions: instructions || undefined, name,
      presentation: presentation || undefined, startDate: startDate || undefined, status,
    };
    setSaving(true); setError(undefined);
    try { await repository.saveMedication(babyId, draft, editingMedication?.id); setConfirmingIncompleteMedication(false); clearMedicationForm(); setReload((v) => v + 1); }
    catch (reason) { setError(messageFor(reason)); } finally { setSaving(false); }
  }

  function beginAdministration(item?: BabyMedication) {
    clearMedicationForm();
    const now = new Date();
    setSelectedMedicationId(item?.id ?? '');
    setAdministeredDose(item?.indicatedDoseAmount === undefined ? '' : String(item.indicatedDoseAmount).replace('.', ','));
    const unit = getMedicationUnitSelection(item?.indicatedDoseUnit);
    setAdministeredUnitPreset(unit.preset); setCustomAdministeredUnit(unit.customValue);
    setAdministrationDate(dateToIso(now));
    setAdministrationHour(String(now.getHours()).padStart(2, '0'));
    setAdministrationMinute(String(now.getMinutes()).padStart(2, '0'));
    setAdministrationNotes(''); setEditingAdministration(undefined); setShowAdministrationForm(true);
  }

  function editAdministration(item: MedicationAdministration) {
    clearMedicationForm();
    const administeredAt = new Date(item.administeredAt);
    setSelectedMedicationId(item.medicationId); setAdministeredDose(String(item.doseAmount).replace('.', ','));
    const unit = getMedicationUnitSelection(item.doseUnit);
    setAdministeredUnitPreset(unit.preset); setCustomAdministeredUnit(unit.customValue);
    setAdministrationNotes(item.notes ?? '');
    setAdministrationDate(dateToIso(administeredAt));
    setAdministrationHour(String(administeredAt.getHours()).padStart(2, '0'));
    setAdministrationMinute(String(administeredAt.getMinutes()).padStart(2, '0'));
    setEditingAdministration(item); setShowAdministrationForm(true);
  }

  function prepareAdministration() {
    const amount = parseDoseAmount(administeredDose);
    const administeredUnit = resolveMedicationUnit(administeredUnitPreset, customAdministeredUnit);
    const administeredAt = createLocalAdministrationTimestamp(
      administrationDate,
      `${administrationHour}:${administrationMinute}`,
    );
    if (!selectedMedicationId || !amount || !administeredUnit.trim() || !administeredAt) {
      setError('Selecciona el medicamento o vacuna y revisa la dosis, la unidad, la fecha y la hora.'); return;
    }
    setConfirmingAdministration({
      administeredAt,
      doseAmount: amount,
      doseUnit: administeredUnit,
      medicationId: selectedMedicationId,
      notes: administrationNotes || undefined,
    });
  }

  async function confirmAdministration() {
    if (!confirmingAdministration) return;
    setSaving(true); setError(undefined);
    try {
      await repository.saveAdministration(confirmingAdministration, editingAdministration?.id);
      setConfirmingAdministration(undefined); setShowAdministrationForm(false); setEditingAdministration(undefined);
      setReload((v) => v + 1); setMode('administrations');
    } catch (reason) { setError(messageFor(reason)); } finally { setSaving(false); }
  }

  async function toggleMedication(item: BabyMedication) {
    setSaving(true); try { await repository.setMedicationRetired(item.id, !item.retiredAt); setRetiringMedication(undefined); setReload((v) => v + 1); }
    catch (reason) { setError(messageFor(reason)); } finally { setSaving(false); }
  }

  async function toggleAdministration(item: MedicationAdministration) {
    setSaving(true); try { await repository.setAdministrationRetired(item.id, !item.retiredAt); setRetiringAdministration(undefined); setReload((v) => v + 1); }
    catch (reason) { setError(messageFor(reason)); } finally { setSaving(false); }
  }

  async function exportAdministrations() {
    setExporting(true); setError(undefined);
    try {
      const rows = await repository.exportAdministrations(babyId, administrationFilters);
      await exportMedicationFile({
        content: `\uFEFF${createMedicationAdministrationCsv(rows)}`,
        fileName: createMedicationAdministrationFileName(babyName),
      });
    } catch (reason) { setError(messageFor(reason)); } finally { setExporting(false); }
  }

  const confirmationMedication = medications.find((item) => item.id === confirmingAdministration?.medicationId);
  const medicationFormFields = <>
    <ResponsiveFieldRow compact={compact} gap="medium"><View style={[styles.formField, compact && styles.formFieldCompact]}><SelectField label="Tipo" onChange={setCategory} options={categoryOptions} placeholder="Elige un tipo" title="Tipo de registro" value={category} /></View>{editingMedication ? <View style={[styles.formField, compact && styles.formFieldCompact]}><SelectField label="Estado" onChange={setStatus} options={statusOptions} placeholder="Elige un estado" title="Estado" value={status} /></View> : null}</ResponsiveFieldRow>
    <ResponsiveFieldRow compact={compact}><View style={[styles.formField, compact && styles.formFieldCompact]}><ProfileField label="Nombre" maxLength={120} onChangeText={setName} value={name} /></View><View style={[styles.formField, compact && styles.formFieldCompact]}><ProfileField label="Presentación o concentración (opcional)" maxLength={160} onChangeText={setPresentation} placeholder="Ej. 100 mg/ml" value={presentation} /></View></ResponsiveFieldRow>
    <ResponsiveFieldRow compact={compact}><View style={[styles.formField, compact && styles.formFieldCompact]}><ProfileField keyboardType="decimal-pad" label="Dosis indicada (opcional)" onChangeText={setDose} value={dose} /></View><View style={[styles.formField, compact && styles.formFieldCompact]}><MedicationUnitField customValue={customDoseUnit} label="Unidad (opcional)" onCustomValueChange={setCustomDoseUnit} onPresetChange={setDoseUnitPreset} preset={doseUnitPreset} /></View></ResponsiveFieldRow>
    <ResponsiveFieldRow compact={compact}><View style={[styles.formField, compact && styles.formFieldCompact]}><ProfileField label="Vía (opcional)" onChangeText={setRoute} placeholder="Oral, tópica…" value={route} /></View><View style={[styles.formField, compact && styles.formFieldCompact]}><ProfileField label="Indicado por (opcional)" onChangeText={setIndicatedBy} value={indicatedBy} /></View></ResponsiveFieldRow>
    <ResponsiveFieldRow compact={compact}><View style={[styles.formField, compact && styles.formFieldCompact]}><DatePickerField label="Fecha de inicio (opcional)" onChange={setStartDate} value={startDate} /></View><View style={[styles.formField, compact && styles.formFieldCompact]}><DatePickerField label="Fecha de fin (opcional)" onChange={setEndDate} value={endDate} /></View></ResponsiveFieldRow>
    <ProfileField label="Indicaciones (opcional)" maxLength={1000} multiline onChangeText={setInstructions} value={instructions} />
    <Pressable disabled={saving} onPress={() => void saveMedication()} style={[styles.saveAction, saving && styles.disabled]}>{saving ? <ActivityIndicator color={colors.onAccent} /> : <><Check color={colors.onAccent} size={18} /><Text style={styles.primaryButtonText}>Guardar</Text></>}</Pressable>
  </>;
  const administrationFormFields = <>
    <SelectField disabled={Boolean(editingAdministration)} label="Medicamento o vacuna" onChange={(value) => { setSelectedMedicationId(value); const item = medications.find((entry) => entry.id === value); if (item) { setAdministeredDose(item.indicatedDoseAmount === undefined ? '' : String(item.indicatedDoseAmount).replace('.', ',')); const unit = getMedicationUnitSelection(item.indicatedDoseUnit); setAdministeredUnitPreset(unit.preset); setCustomAdministeredUnit(unit.customValue); } }} options={medicationOptions} placeholder="Selecciona una opción" title="Medicamento o vacuna administrado" value={selectedMedicationId} />
    <ResponsiveFieldRow compact={compact}><View style={[styles.formField, compact && styles.formFieldCompact]}><ProfileField keyboardType="decimal-pad" label="Dosis realmente administrada" onChangeText={setAdministeredDose} value={administeredDose} /></View><View style={[styles.formField, compact && styles.formFieldCompact]}><MedicationUnitField customValue={customAdministeredUnit} label="Unidad" onCustomValueChange={setCustomAdministeredUnit} onPresetChange={setAdministeredUnitPreset} preset={administeredUnitPreset} required /></View></ResponsiveFieldRow>
    <ResponsiveFieldRow compact={compact}><View style={[styles.formField, compact && styles.formFieldCompact]}><DatePickerField label="Fecha de administración" maximumDate={dateToIso(new Date())} onChange={setAdministrationDate} value={administrationDate} /></View><View style={[styles.formField, compact && styles.formFieldCompact]}><TimePickerField hour={administrationHour} label="Hora de administración" minute={administrationMinute} onHourChange={setAdministrationHour} onMinuteChange={setAdministrationMinute} title="Hora de administración" /></View></ResponsiveFieldRow>
    <ProfileField label="Nota (opcional)" maxLength={500} multiline onChangeText={setAdministrationNotes} value={administrationNotes} />
    <Text style={styles.formHint}>La hora se interpreta según la zona horaria de este dispositivo.</Text>
    <Pressable onPress={prepareAdministration} style={styles.saveAction}><Syringe color={colors.onAccent} size={18} /><Text style={styles.primaryButtonText}>Revisar y registrar</Text></Pressable>
  </>;

  return (
    <SafeAreaView edges={['bottom']} style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        {topContent}
        <ResourceScreenHero eyebrow="SALUD Y CUIDADOS" icon={<Pill color={colors.primaryPressed} size={28} />} onBack={onBack}
          subtitle={`Registro compartido de ${babyName}`} title="Medicamentos y vacunas" />
        <View style={styles.warning}><Text style={styles.warningTitle}>Registro informativo</Text><Text style={styles.warningText}>Niduna no calcula ni recomienda dosis. Sigue únicamente la indicación de un profesional sanitario y comprueba siempre el medicamento o vacuna, la presentación y la unidad.</Text></View>
        {mode === 'administrations' ? <View style={styles.summaryCard}>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>Administraciones del periodo</Text>
            <Text style={styles.summaryValue}>{administrations?.total ?? 0}</Text>
            <Text style={styles.summaryMeta}>{range.startDate} — {range.endDate}</Text>
          </View>
          <View style={[styles.summaryActions, compact && styles.summaryActionsCompact]}>
            {canRecordMedicationAdministration(familyRole) && medicationOptions.length ? <Pressable onPress={() => beginAdministration()} style={[styles.primaryButton, compact && styles.summaryButtonCompact]}><Syringe color={colors.onAccent} size={18} /><Text style={styles.primaryButtonText}>Registrar administración</Text></Pressable> : null}
            <Pressable onPress={() => changeMode('catalog')} style={[styles.secondaryButton, compact && styles.summaryButtonCompact]}><Pill color={colors.primaryPressed} size={18} /><Text style={styles.secondaryButtonText}>Medicamentos y vacunas</Text></Pressable>
          </View>
        </View> : <View style={styles.catalogHeading}>
          <View style={styles.catalogCopy}><Text style={styles.sectionTitle}>Medicamentos y vacunas</Text><Text style={styles.catalogHint}>Guarda aquí lo que utiliza {babyName} para poder registrar después cada administración.</Text></View>
          <View style={styles.toolbar}>
            <Pressable onPress={() => changeMode('administrations')} style={styles.secondaryButton}><RotateCcw color={colors.primaryPressed} size={18} /><Text style={styles.secondaryButtonText}>Volver al historial</Text></Pressable>
            <Pressable onPress={() => { setLoading(true); setShowRetiredProducts((value) => !value); }} style={styles.secondaryButton}><Archive color={colors.primaryPressed} size={18} /><Text style={styles.secondaryButtonText}>{showRetiredProducts ? 'Ver activos' : 'Ver retirados'}</Text></Pressable>
            {canManageMedicationCatalog(familyRole) && !showRetiredProducts ? <Pressable onPress={() => { setShowAdministrationForm(false); setEditingAdministration(undefined); clearMedicationForm(); setShowMedicationForm(true); }} style={styles.primaryButton}><Plus color={colors.onAccent} size={18} /><Text style={styles.primaryButtonText}>Añadir medicamento o vacuna</Text></Pressable> : null}
          </View>
        </View>}
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityLabel="Cerrar error" onPress={() => setError(undefined)}><X color={colors.error} size={20} /></Pressable></View> : null}

        {mode === 'administrations' ? <View style={styles.filtersCard}>
          <View style={[styles.presetRow, compact && styles.presetRowCompact]}>
            {([['month', 'Este mes'], ['30d', 'Últimos 30 días'], ['custom', 'Personalizado']] as const).map(([value, label]) => <Pressable accessibilityRole="button" accessibilityState={{ selected: rangePreset === value }} key={value} onPress={() => selectRangePreset(value)} style={[styles.chip, compact && styles.chipCompact, rangePreset === value && styles.chipSelected]}><Text numberOfLines={1} style={[styles.chipText, compact && styles.chipTextCompact, rangePreset === value && styles.chipTextSelected]}>{label}</Text></Pressable>)}
          </View>
          {rangePreset === 'custom' ? <View style={[styles.filterGrid, compact && styles.filterGridCompact]}><View style={[styles.filterField, compact && styles.filterFieldCompact]}><DatePickerField label="Desde" maximumDate={range.endDate} onChange={(startDate) => { setRange((current) => ({ ...current, startDate })); setPage(1); }} value={range.startDate} /></View><View style={[styles.filterField, compact && styles.filterFieldCompact]}><DatePickerField label="Hasta" maximumDate={dateToIso(new Date())} onChange={(endDate) => { setRange((current) => ({ endDate, startDate: current.startDate > endDate ? endDate : current.startDate })); setPage(1); }} value={range.endDate} /></View></View> : null}
          <View style={[styles.filterGrid, compact && styles.filterGridCompact]}><View style={[styles.filterField, compact && styles.filterFieldCompact]}><SelectField label="Medicamento o vacuna" onChange={(value) => { setMedicationFilter(value); setPage(1); }} options={filterOptions} placeholder="Todos" title="Filtrar por medicamento o vacuna" value={medicationFilter} /></View></View>
          <View style={styles.filterActions}><Pressable onPress={() => { setShowRetiredAdministrations((value) => !value); setPage(1); }} style={styles.secondaryButton}>{showRetiredAdministrations ? <RotateCcw color={colors.primaryPressed} size={18} /> : <Archive color={colors.primaryPressed} size={18} />}<Text style={styles.secondaryButtonText}>{showRetiredAdministrations ? 'Ver activos' : 'Ver retirados'}</Text></Pressable><Pressable disabled={exporting || !administrations?.total} onPress={() => void exportAdministrations()} style={[styles.secondaryButton, (exporting || !administrations?.total) && styles.disabled]}><Download color={colors.primaryPressed} size={18} /><Text style={styles.secondaryButtonText}>{exporting ? 'Preparando…' : 'Exportar CSV'}</Text></Pressable></View>
        </View> : null}

        {loading ? <ActivityIndicator color={colors.primaryPressed} size="large" /> : mode === 'catalog' ? <View style={styles.list}>{medications.length ? medications.map((item) => <View key={item.id} style={styles.card}><View style={styles.cardHeading}><View style={styles.cardCopy}><Text style={styles.cardEyebrow}>{medicationCategoryLabels[item.category]} · {item.status === 'active' ? 'Activo' : 'Inactivo'}</Text><Text style={styles.cardTitle}>{item.name}</Text>{item.presentation ? <Text style={styles.cardMeta}>{item.presentation}</Text> : null}</View><Pill color={colors.primaryPressed} size={24} /></View>{item.indicatedDoseAmount !== undefined && item.indicatedDoseUnit ? <View style={styles.doseBox}><Text style={styles.doseLabel}>DOSIS INDICADA</Text><Text style={styles.doseValue}>{formatDose(item.indicatedDoseAmount, item.indicatedDoseUnit)}</Text></View> : null}{item.instructions ? <Text style={styles.cardText}>{item.instructions}</Text> : null}<View style={styles.actions}>{!item.retiredAt && canRecordMedicationAdministration(familyRole) && item.status === 'active' ? <Pressable onPress={() => beginAdministration(item)} style={styles.primaryButton}><Syringe color={colors.onAccent} size={17} /><Text style={styles.primaryButtonText}>Registrar administración</Text></Pressable> : null}{canManageMedicationCatalog(familyRole) ? <><Pressable onPress={() => item.retiredAt ? void toggleMedication(item) : editMedication(item)} style={styles.secondaryButton}>{item.retiredAt ? <RotateCcw color={colors.primaryPressed} size={17} /> : <Pencil color={colors.primaryPressed} size={17} />}<Text style={styles.secondaryButtonText}>{item.retiredAt ? 'Restaurar' : 'Editar'}</Text></Pressable>{!item.retiredAt ? <Pressable onPress={() => setRetiringMedication(item)} style={styles.dangerButton}><Archive color={colors.error} size={17} /><Text style={styles.dangerText}>Retirar</Text></Pressable> : null}</> : null}</View></View>) : <Text style={styles.empty}>Todavía no hay medicamentos ni vacunas registrados.</Text>}</View> : <View style={styles.list}><Text style={styles.sectionTitle}>{showRetiredAdministrations ? 'Administraciones retiradas' : 'Administraciones registradas'}</Text>{administrations?.administrations.map((item) => <View key={item.id} style={styles.card}><Text style={styles.cardEyebrow}>ADMINISTRADO · {formatDateTime(item.administeredAt)}</Text><Text style={styles.cardTitle}>{item.medicationName}</Text>{item.medicationPresentation ? <Text style={styles.cardMeta}>{item.medicationPresentation}</Text> : null}<Text style={styles.doseValue}>{formatDose(item.doseAmount, item.doseUnit)}</Text><Text style={styles.cardText}>Registrado por {item.recorderName ?? 'un miembro de la familia'}</Text>{item.notes ? <Text style={styles.cardText}>{item.notes}</Text> : null}{canManageMedicationAdministration(item, familyRole, userId) ? <View style={styles.actions}><Pressable onPress={() => item.retiredAt ? void toggleAdministration(item) : editAdministration(item)} style={styles.secondaryButton}>{item.retiredAt ? <RotateCcw color={colors.primaryPressed} size={17} /> : <Pencil color={colors.primaryPressed} size={17} />}<Text style={styles.secondaryButtonText}>{item.retiredAt ? 'Restaurar' : 'Editar'}</Text></Pressable>{!item.retiredAt ? <Pressable onPress={() => setRetiringAdministration(item)} style={styles.dangerButton}><Archive color={colors.error} size={17} /><Text style={styles.dangerText}>Retirar</Text></Pressable> : null}</View> : null}</View>)}{administrations ? <DataPagination onChangePage={setPage} onChangePageSize={(value) => { setPageSize(value); setPage(1); }} page={page} pageSize={pageSize} total={administrations.total} totalPages={administrations.totalPages} /> : null}</View>}
      </KeyboardAwareScrollView>
      <ResourceFormModal icon={<Pill color={colors.primaryPressed} size={22} />} onClose={clearMedicationForm} title={editingMedication ? 'Editar medicamento o vacuna' : 'Añadir medicamento o vacuna'} visible={showMedicationForm}>{medicationFormFields}</ResourceFormModal>
      <ResourceFormModal icon={<Syringe color={colors.primaryPressed} size={22} />} onClose={() => { setShowAdministrationForm(false); setEditingAdministration(undefined); }} title={editingAdministration ? 'Editar administración' : 'Registrar administración'} visible={showAdministrationForm}>{administrationFormFields}</ResourceFormModal>
      <ConfirmationModal confirmLabel="Guardar de todas formas" description="Añadir la presentación, la dosis indicada y su unidad ayuda a evitar confusiones cuando otra persona consulte o registre una administración. Podrás completar estos datos más adelante." icon={<Pill color={colors.primaryPressed} size={24} />} isPending={saving} onCancel={() => setConfirmingIncompleteMedication(false)} onConfirm={() => void saveMedication(true)} title="Faltan datos recomendados" visible={confirmingIncompleteMedication} />
      <ConfirmationModal confirmLabel="Sí, registrar" description="Comprueba que coinciden el medicamento o vacuna y la dosis realmente administrada." icon={<Syringe color={colors.primaryPressed} size={24} />} isPending={saving} onCancel={() => setConfirmingAdministration(undefined)} onConfirm={() => void confirmAdministration()} title={confirmationMedication ? [confirmationMedication.name, confirmationMedication.presentation, formatDose(confirmingAdministration?.doseAmount ?? 0, confirmingAdministration?.doseUnit ?? '')].filter(Boolean).join(' · ') : 'Confirmar administración'} visible={Boolean(confirmingAdministration)} />
      <ConfirmationModal confirmLabel="Retirar" description="Dejará de aparecer entre los medicamentos y vacunas activos. El histórico de administraciones se conservará." icon={<Archive color={colors.error} size={24} />} isPending={saving} onCancel={() => setRetiringMedication(undefined)} onConfirm={() => retiringMedication && void toggleMedication(retiringMedication)} title={`¿Retirar ${retiringMedication?.name ?? 'este registro'}?`} tone="danger" visible={Boolean(retiringMedication)} />
      <ConfirmationModal confirmLabel="Retirar registro" description="El registro dejará de aparecer en el historial activo, pero podrá restaurarse." icon={<Archive color={colors.error} size={24} />} isPending={saving} onCancel={() => setRetiringAdministration(undefined)} onConfirm={() => retiringAdministration && void toggleAdministration(retiringAdministration)} title="¿Retirar esta administración?" tone="danger" visible={Boolean(retiringAdministration)} />
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((theme) => ({
  root: { backgroundColor: theme.background, flex: 1 },
  content: { ...resourceScreenContentStyle, paddingBottom: 120 },
  warning: { backgroundColor: theme.butterSoft, borderRadius: radius.lg, gap: spacing.xs, padding: spacing.lg },
  warningTitle: { color: theme.text, fontSize: 15, fontWeight: '900' },
  warningText: { color: theme.textMuted, fontSize: 13, lineHeight: 19 },
  summaryCard: { alignItems: 'flex-start', backgroundColor: theme.aquaSoft, borderRadius: radius.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, justifyContent: 'space-between', padding: spacing.xl },
  summaryCopy: { gap: spacing.xs, minWidth: 180 },
  summaryLabel: { color: theme.primaryPressed, fontSize: 13, fontWeight: '900' },
  summaryValue: { color: theme.text, fontSize: 34, fontWeight: '900' },
  summaryMeta: { color: theme.textMuted, fontSize: 12 },
  summaryActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryActionsCompact: { alignItems: 'stretch', flexDirection: 'column', width: '100%' },
  summaryButtonCompact: { alignSelf: 'stretch', minWidth: 0, width: '100%' },
  catalogHeading: { backgroundColor: theme.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl },
  catalogCopy: { gap: spacing.xs },
  catalogHint: { color: theme.textMuted, fontSize: 13, lineHeight: 19 },
  toolbar: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  filtersCard: { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.lg, padding: spacing.lg },
  presetRow: { backgroundColor: theme.surfaceMuted, borderRadius: radius.pill, flexDirection: 'row', padding: 4 },
  presetRowCompact: { width: '100%' },
  chip: { alignItems: 'center', borderRadius: radius.pill, flex: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
  chipCompact: { minWidth: 0, paddingHorizontal: spacing.sm },
  chipSelected: { backgroundColor: theme.aquaSoft },
  chipText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
  chipTextCompact: { fontSize: 10 },
  chipTextSelected: { color: theme.text },
  filterGrid: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.lg },
  filterGridCompact: { flexDirection: 'column' },
  filterField: { flex: 1, minWidth: 0 },
  filterFieldCompact: { alignSelf: 'stretch', flexBasis: 'auto', width: '100%' },
  filterActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  primaryButton: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: theme.onAccent, fontSize: 13, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  secondaryButtonText: { color: theme.primaryPressed, fontSize: 13, fontWeight: '900' },
  dangerButton: { alignItems: 'center', borderColor: theme.error, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  dangerText: { color: theme.error, fontSize: 13, fontWeight: '900' },
  error: { alignItems: 'center', backgroundColor: theme.errorSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', padding: spacing.lg },
  errorText: { color: theme.error, flex: 1, fontSize: 13, fontWeight: '700' },
  formHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', backgroundColor: theme.surfaceMuted, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  saveAction: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 54 },
  disabled: { opacity: 0.55 },
  sectionTitle: { color: theme.text, fontSize: 22, fontWeight: '900' },
  formField: { flex: 1, minWidth: 0 },
  formFieldCompact: { alignSelf: 'stretch', flexBasis: 'auto', width: '100%' },
  formHint: { color: theme.textMuted, fontSize: 12, lineHeight: 18 },
  actions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { gap: spacing.md },
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  cardHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  cardCopy: { flex: 1, minWidth: 0 },
  cardEyebrow: { color: theme.primaryPressed, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  cardTitle: { color: theme.text, fontSize: 19, fontWeight: '900' },
  cardMeta: { color: theme.textMuted, fontSize: 13, marginTop: 2 },
  cardText: { color: theme.textMuted, fontSize: 13, lineHeight: 19 },
  doseBox: { backgroundColor: theme.surfaceMuted, borderRadius: radius.md, gap: 2, padding: spacing.md },
  doseLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  doseValue: { color: theme.text, fontSize: 18, fontWeight: '900' },
  empty: { color: theme.textMuted, fontSize: 14, paddingVertical: spacing.xl, textAlign: 'center' },
}));
