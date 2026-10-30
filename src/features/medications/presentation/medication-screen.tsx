import { Archive, Check, Download, Pencil, Pill, Plus, RotateCcw, Syringe, X } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  canManageMedicationAdministration,
  canManageMedicationCatalog,
  canRecordMedicationAdministration,
} from '@/features/medications/application/medication-permissions';
import {
  MedicationError,
  type BabyMedicationDraft,
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
  medicationCategoryLabels,
  parseDoseAmount,
  type BabyMedication,
  type BabyMedicationCategory,
  type BabyMedicationStatus,
  type MedicationAdministration,
} from '@/features/medications/domain/baby-medication';
import { exportMedicationFile } from '@/features/medications/infrastructure/medication-file';
import { DatePickerField } from '@/features/baby-profile/presentation/date-picker-field';
import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import { SelectField, type SelectOption } from '@/features/baby-profile/presentation/select-field';
import type { FamilyRole } from '@/features/family/domain/family';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { DataPagination } from '@/shared/presentation/data-pagination';
import { dateToIso } from '@/shared/presentation/date';
import { KeyboardAwareScrollView } from '@/shared/presentation/keyboard-aware-scroll-view';
import { ResourceScreenHero } from '@/shared/presentation/resource-screen-hero';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const categoryOptions = [
  { label: 'Medicamento', value: 'medication' },
  { label: 'Vitamina', value: 'vitamin' },
  { label: 'Suplemento', value: 'supplement' },
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
    dateStyle: 'medium',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
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
  const [mode, setMode] = useState<ViewMode>('catalog');
  const [medications, setMedications] = useState<BabyMedication[]>([]);
  const [showRetired, setShowRetired] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<MedicationPageSize>(20);
  const [administrations, setAdministrations] = useState<MedicationAdministrationPage>();
  const [medicationFilter, setMedicationFilter] = useState('all');
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
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showAdministrationForm, setShowAdministrationForm] = useState(false);

  const [category, setCategory] = useState<BabyMedicationCategory>('medication');
  const [status, setStatus] = useState<BabyMedicationStatus>('active');
  const [name, setName] = useState('');
  const [presentation, setPresentation] = useState('');
  const [dose, setDose] = useState('');
  const [doseUnit, setDoseUnit] = useState('');
  const [route, setRoute] = useState('');
  const [instructions, setInstructions] = useState('');
  const [indicatedBy, setIndicatedBy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMedicationId, setSelectedMedicationId] = useState('');
  const [administeredDose, setAdministeredDose] = useState('');
  const [administeredUnit, setAdministeredUnit] = useState('');
  const [administrationNotes, setAdministrationNotes] = useState('');
  const [administrationDate, setAdministrationDate] = useState(dateToIso(new Date()));
  const [administrationTime, setAdministrationTime] = useState(
    `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
  );

  const medicationOptions = useMemo(() => medications.filter((item) => !item.retiredAt).map((item) => ({
    label: item.name,
    supportingText: `${item.presentation} · ${formatDose(item.indicatedDoseAmount, item.indicatedDoseUnit)}`,
    value: item.id,
  })), [medications]);
  const filterOptions = [{ label: 'Todos los productos', value: 'all' }, ...medicationOptions];

  useEffect(() => {
    let active = true;
    setLoading(true);
    void repository.loadMedications(babyId, showRetired).then((items) => active && setMedications(items))
      .catch((reason) => active && setError(messageFor(reason)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [babyId, reload, repository, showRetired]);

  useEffect(() => {
    if (mode !== 'administrations') return;
    let active = true;
    setLoading(true);
    void repository.loadAdministrationPage(babyId, page, pageSize, {
      medicationId: medicationFilter === 'all' ? undefined : medicationFilter,
      retired: showRetired,
    }).then((result) => active && setAdministrations(result))
      .catch((reason) => active && setError(messageFor(reason)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [babyId, medicationFilter, mode, page, pageSize, reload, repository, showRetired]);

  function clearMedicationForm() {
    setCategory('medication'); setStatus('active'); setName(''); setPresentation(''); setDose(''); setDoseUnit('');
    setRoute(''); setInstructions(''); setIndicatedBy(''); setStartDate(''); setEndDate('');
    setEditingMedication(undefined); setShowMedicationForm(false);
  }

  function editMedication(item: BabyMedication) {
    setCategory(item.category); setStatus(item.status); setName(item.name); setPresentation(item.presentation);
    setDose(String(item.indicatedDoseAmount).replace('.', ',')); setDoseUnit(item.indicatedDoseUnit);
    setRoute(item.administrationRoute ?? ''); setInstructions(item.instructions ?? '');
    setIndicatedBy(item.indicatedBy ?? ''); setStartDate(item.startDate ?? ''); setEndDate(item.endDate ?? '');
    setEditingMedication(item); setShowMedicationForm(true);
  }

  async function saveMedication() {
    const amount = parseDoseAmount(dose);
    if (!name.trim() || !presentation.trim() || !amount || !doseUnit.trim()) {
      setError('Nombre, presentación, dosis indicada y unidad son obligatorios.'); return;
    }
    const draft: BabyMedicationDraft = {
      administrationRoute: route || undefined, category, endDate: endDate || undefined,
      indicatedBy: indicatedBy || undefined, indicatedDoseAmount: amount,
      indicatedDoseUnit: doseUnit, instructions: instructions || undefined, name,
      presentation, startDate: startDate || undefined, status,
    };
    setSaving(true); setError(undefined);
    try { await repository.saveMedication(babyId, draft, editingMedication?.id); clearMedicationForm(); setReload((v) => v + 1); }
    catch (reason) { setError(messageFor(reason)); } finally { setSaving(false); }
  }

  function beginAdministration(item: BabyMedication) {
    const now = new Date();
    setSelectedMedicationId(item.id);
    setAdministeredDose(String(item.indicatedDoseAmount).replace('.', ','));
    setAdministeredUnit(item.indicatedDoseUnit);
    setAdministrationDate(dateToIso(now));
    setAdministrationTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setAdministrationNotes(''); setEditingAdministration(undefined); setShowAdministrationForm(true);
  }

  function editAdministration(item: MedicationAdministration) {
    const administeredAt = new Date(item.administeredAt);
    setSelectedMedicationId(item.medicationId); setAdministeredDose(String(item.doseAmount).replace('.', ','));
    setAdministeredUnit(item.doseUnit); setAdministrationNotes(item.notes ?? '');
    setAdministrationDate(dateToIso(administeredAt));
    setAdministrationTime(`${String(administeredAt.getHours()).padStart(2, '0')}:${String(administeredAt.getMinutes()).padStart(2, '0')}`);
    setEditingAdministration(item); setShowAdministrationForm(true);
  }

  function prepareAdministration() {
    const amount = parseDoseAmount(administeredDose);
    const administeredAt = createLocalAdministrationTimestamp(administrationDate, administrationTime);
    if (!selectedMedicationId || !amount || !administeredUnit.trim() || !administeredAt) {
      setError('Selecciona el producto y revisa la dosis, la unidad, la fecha y la hora.'); return;
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
      const rows = await repository.exportAdministrations(babyId, {
        medicationId: medicationFilter === 'all' ? undefined : medicationFilter,
        retired: showRetired,
      });
      await exportMedicationFile({
        content: `\uFEFF${createMedicationAdministrationCsv(rows)}`,
        fileName: createMedicationAdministrationFileName(babyName),
      });
    } catch (reason) { setError(messageFor(reason)); } finally { setExporting(false); }
  }

  const confirmationMedication = medications.find((item) => item.id === confirmingAdministration?.medicationId);

  return (
    <SafeAreaView edges={['bottom']} style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        {topContent}
        <ResourceScreenHero eyebrow="SALUD Y CUIDADOS" icon={<Pill color={colors.primaryPressed} size={28} />} onBack={onBack}
          subtitle={`Registro compartido de ${babyName}`} title="Medicación y vitaminas" />
        <View style={styles.warning}><Text style={styles.warningTitle}>Registro informativo</Text><Text style={styles.warningText}>Niduna no calcula ni recomienda dosis. Sigue únicamente la indicación de un profesional sanitario y comprueba siempre producto, presentación y unidad.</Text></View>
        <View style={styles.tabs}>
          {(['catalog', 'administrations'] as const).map((value) => <Pressable key={value} onPress={() => { setMode(value); setShowRetired(false); }} style={[styles.tab, mode === value && styles.tabActive]}><Text style={[styles.tabText, mode === value && styles.tabTextActive]}>{value === 'catalog' ? 'Productos' : 'Administraciones'}</Text></Pressable>)}
        </View>
        <View style={styles.toolbar}>
          <Pressable onPress={() => setShowRetired((value) => !value)} style={styles.secondaryButton}><Archive color={colors.primaryPressed} size={18} /><Text style={styles.secondaryButtonText}>{showRetired ? 'Ver activos' : 'Ver retirados'}</Text></Pressable>
          {mode === 'catalog' && canManageMedicationCatalog(familyRole) && !showRetired ? <Pressable onPress={() => setShowMedicationForm(true)} style={styles.primaryButton}><Plus color={colors.onAccent} size={18} /><Text style={styles.primaryButtonText}>Añadir producto</Text></Pressable> : null}
          {mode === 'administrations' ? <Pressable disabled={exporting} onPress={() => void exportAdministrations()} style={styles.secondaryButton}><Download color={colors.primaryPressed} size={18} /><Text style={styles.secondaryButtonText}>{exporting ? 'Preparando…' : 'Exportar CSV'}</Text></Pressable> : null}
        </View>
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityLabel="Cerrar error" onPress={() => setError(undefined)}><X color={colors.error} size={20} /></Pressable></View> : null}

        {showMedicationForm ? <View style={styles.formCard}><Text style={styles.sectionTitle}>{editingMedication ? 'Editar producto' : 'Nuevo producto'}</Text>
          <View style={styles.formRow}><SelectField label="Categoría" onChange={setCategory} options={categoryOptions} placeholder="Elige una categoría" title="Tipo de producto" value={category} /><SelectField label="Estado" onChange={setStatus} options={statusOptions} placeholder="Elige un estado" title="Estado del producto" value={status} /></View>
          <View style={styles.formRow}><ProfileField label="Nombre" maxLength={120} onChangeText={setName} value={name} /><ProfileField label="Presentación o concentración" maxLength={160} onChangeText={setPresentation} placeholder="Ej. 100 mg/ml" value={presentation} /></View>
          <View style={styles.formRow}><ProfileField keyboardType="decimal-pad" label="Dosis indicada" onChangeText={setDose} value={dose} /><ProfileField label="Unidad" maxLength={30} onChangeText={setDoseUnit} placeholder="ml, gotas, mg…" value={doseUnit} /></View>
          <View style={styles.formRow}><ProfileField label="Vía (opcional)" onChangeText={setRoute} placeholder="Oral, tópica…" value={route} /><ProfileField label="Indicado por (opcional)" onChangeText={setIndicatedBy} value={indicatedBy} /></View>
          <View style={styles.formRow}><DatePickerField label="Fecha de inicio (opcional)" onChange={setStartDate} value={startDate} /><DatePickerField label="Fecha de fin (opcional)" onChange={setEndDate} value={endDate} /></View>
          <ProfileField label="Indicaciones (opcional)" maxLength={1000} multiline onChangeText={setInstructions} value={instructions} />
          <View style={styles.actions}><Pressable onPress={clearMedicationForm} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancelar</Text></Pressable><Pressable disabled={saving} onPress={() => void saveMedication()} style={styles.primaryButton}><Check color={colors.onAccent} size={18} /><Text style={styles.primaryButtonText}>Guardar producto</Text></Pressable></View>
        </View> : null}

        {showAdministrationForm ? <View style={styles.formCard}><Text style={styles.sectionTitle}>{editingAdministration ? 'Editar administración' : 'Registrar administración'}</Text>
          <SelectField disabled={Boolean(editingAdministration)} label="Producto" onChange={(value) => { setSelectedMedicationId(value); const item = medications.find((entry) => entry.id === value); if (item) { setAdministeredDose(String(item.indicatedDoseAmount).replace('.', ',')); setAdministeredUnit(item.indicatedDoseUnit); } }} options={medicationOptions} placeholder="Selecciona el producto" title="Producto administrado" value={selectedMedicationId} />
          <View style={styles.formRow}><ProfileField keyboardType="decimal-pad" label="Dosis realmente administrada" onChangeText={setAdministeredDose} value={administeredDose} /><ProfileField label="Unidad" maxLength={30} onChangeText={setAdministeredUnit} value={administeredUnit} /></View>
          <View style={styles.formRow}><DatePickerField label="Fecha de administración" maximumDate={dateToIso(new Date())} onChange={setAdministrationDate} value={administrationDate} /><ProfileField autoCapitalize="none" label="Hora (HH:mm)" maxLength={5} onChangeText={setAdministrationTime} placeholder="14:30" value={administrationTime} /></View>
          <ProfileField label="Nota (opcional)" maxLength={500} multiline onChangeText={setAdministrationNotes} value={administrationNotes} />
          <Text style={styles.formHint}>La hora se interpreta según la zona horaria de este dispositivo.</Text>
          <View style={styles.actions}><Pressable onPress={() => { setShowAdministrationForm(false); setEditingAdministration(undefined); }} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancelar</Text></Pressable><Pressable onPress={prepareAdministration} style={styles.primaryButton}><Syringe color={colors.onAccent} size={18} /><Text style={styles.primaryButtonText}>Revisar y registrar</Text></Pressable></View>
        </View> : null}

        {loading ? <ActivityIndicator color={colors.primaryPressed} size="large" /> : mode === 'catalog' ? <View style={styles.list}>{medications.length ? medications.map((item) => <View key={item.id} style={styles.card}><View style={styles.cardHeading}><View style={styles.cardCopy}><Text style={styles.cardEyebrow}>{medicationCategoryLabels[item.category]} · {item.status === 'active' ? 'Activo' : 'Inactivo'}</Text><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.cardMeta}>{item.presentation}</Text></View><Pill color={colors.primaryPressed} size={24} /></View><View style={styles.doseBox}><Text style={styles.doseLabel}>DOSIS INDICADA</Text><Text style={styles.doseValue}>{formatDose(item.indicatedDoseAmount, item.indicatedDoseUnit)}</Text></View>{item.instructions ? <Text style={styles.cardText}>{item.instructions}</Text> : null}<View style={styles.actions}>{!item.retiredAt && canRecordMedicationAdministration(familyRole) && item.status === 'active' ? <Pressable onPress={() => beginAdministration(item)} style={styles.primaryButton}><Syringe color={colors.onAccent} size={17} /><Text style={styles.primaryButtonText}>Registrar administración</Text></Pressable> : null}{canManageMedicationCatalog(familyRole) ? <><Pressable onPress={() => item.retiredAt ? void toggleMedication(item) : editMedication(item)} style={styles.secondaryButton}>{item.retiredAt ? <RotateCcw color={colors.primaryPressed} size={17} /> : <Pencil color={colors.primaryPressed} size={17} />}<Text style={styles.secondaryButtonText}>{item.retiredAt ? 'Restaurar' : 'Editar'}</Text></Pressable>{!item.retiredAt ? <Pressable onPress={() => setRetiringMedication(item)} style={styles.dangerButton}><Archive color={colors.error} size={17} /><Text style={styles.dangerText}>Retirar</Text></Pressable> : null}</> : null}</View></View>) : <Text style={styles.empty}>Todavía no hay productos registrados.</Text>}</View> : <View style={styles.list}><SelectField label="Filtrar por producto" onChange={(value) => { setMedicationFilter(value); setPage(1); }} options={filterOptions} placeholder="Todos" title="Filtrar administraciones" value={medicationFilter} />{administrations?.administrations.map((item) => <View key={item.id} style={styles.card}><Text style={styles.cardEyebrow}>ADMINISTRADO · {formatDateTime(item.administeredAt)}</Text><Text style={styles.cardTitle}>{item.medicationName}</Text><Text style={styles.cardMeta}>{item.medicationPresentation}</Text><Text style={styles.doseValue}>{formatDose(item.doseAmount, item.doseUnit)}</Text><Text style={styles.cardText}>Registrado por {item.recorderName ?? 'un miembro de la familia'}</Text>{item.notes ? <Text style={styles.cardText}>{item.notes}</Text> : null}{canManageMedicationAdministration(item, familyRole, userId) ? <View style={styles.actions}><Pressable onPress={() => item.retiredAt ? void toggleAdministration(item) : editAdministration(item)} style={styles.secondaryButton}>{item.retiredAt ? <RotateCcw color={colors.primaryPressed} size={17} /> : <Pencil color={colors.primaryPressed} size={17} />}<Text style={styles.secondaryButtonText}>{item.retiredAt ? 'Restaurar' : 'Editar'}</Text></Pressable>{!item.retiredAt ? <Pressable onPress={() => setRetiringAdministration(item)} style={styles.dangerButton}><Archive color={colors.error} size={17} /><Text style={styles.dangerText}>Retirar</Text></Pressable> : null}</View> : null}</View>)}{administrations ? <DataPagination onChangePage={setPage} onChangePageSize={(value) => { setPageSize(value); setPage(1); }} page={page} pageSize={pageSize} total={administrations.total} totalPages={administrations.totalPages} /> : null}</View>}
      </KeyboardAwareScrollView>
      <ConfirmationModal confirmLabel="Sí, registrar" description="Comprueba que coinciden el producto, la presentación y la dosis realmente administrada." icon={<Syringe color={colors.primaryPressed} size={24} />} isPending={saving} onCancel={() => setConfirmingAdministration(undefined)} onConfirm={() => void confirmAdministration()} title={confirmationMedication ? `${confirmationMedication.name} · ${confirmationMedication.presentation} · ${formatDose(confirmingAdministration?.doseAmount ?? 0, confirmingAdministration?.doseUnit ?? '')}` : 'Confirmar administración'} visible={Boolean(confirmingAdministration)} />
      <ConfirmationModal confirmLabel="Retirar producto" description="Dejará de aparecer entre los productos activos. El histórico de administraciones se conservará." icon={<Archive color={colors.error} size={24} />} isPending={saving} onCancel={() => setRetiringMedication(undefined)} onConfirm={() => retiringMedication && void toggleMedication(retiringMedication)} title={`¿Retirar ${retiringMedication?.name ?? 'este producto'}?`} tone="danger" visible={Boolean(retiringMedication)} />
      <ConfirmationModal confirmLabel="Retirar registro" description="El registro dejará de aparecer en el historial activo, pero podrá restaurarse." icon={<Archive color={colors.error} size={24} />} isPending={saving} onCancel={() => setRetiringAdministration(undefined)} onConfirm={() => retiringAdministration && void toggleAdministration(retiringAdministration)} title="¿Retirar esta administración?" tone="danger" visible={Boolean(retiringAdministration)} />
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((theme) => ({
  root: { backgroundColor: theme.background, flex: 1 },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 120 },
  warning: { backgroundColor: theme.butterSoft, borderRadius: radius.lg, gap: spacing.xs, padding: spacing.lg },
  warningTitle: { color: theme.text, fontSize: 15, fontWeight: '900' },
  warningText: { color: theme.textMuted, fontSize: 13, lineHeight: 19 },
  tabs: { backgroundColor: theme.surfaceMuted, borderRadius: radius.pill, flexDirection: 'row', padding: 4 },
  tab: { alignItems: 'center', borderRadius: radius.pill, flex: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  tabActive: { backgroundColor: theme.primary },
  tabText: { color: theme.textMuted, fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: theme.onAccent },
  toolbar: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  primaryButton: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: theme.onAccent, fontSize: 13, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  secondaryButtonText: { color: theme.primaryPressed, fontSize: 13, fontWeight: '900' },
  dangerButton: { alignItems: 'center', borderColor: theme.error, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  dangerText: { color: theme.error, fontSize: 13, fontWeight: '900' },
  error: { alignItems: 'center', backgroundColor: theme.errorSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', padding: spacing.lg },
  errorText: { color: theme.error, flex: 1, fontSize: 13, fontWeight: '700' },
  formCard: { backgroundColor: theme.surfaceMuted, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.lg },
  sectionTitle: { color: theme.text, fontSize: 22, fontWeight: '900' },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
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
