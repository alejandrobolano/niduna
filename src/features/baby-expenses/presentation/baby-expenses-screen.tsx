import {
  Archive,
  Download,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createBabyExpenseCsv } from '@/features/baby-expenses/application/baby-expense-csv';
import {
  canCreateBabyExpense,
  canManageBabyExpense,
} from '@/features/baby-expenses/application/baby-expense-permissions';
import {
  BabyExpenseError,
  type BabyExpenseDraft,
  type BabyExpenseFilters,
  type BabyExpensePage,
  type BabyExpensePageSize,
  type BabyExpenseRepository,
} from '@/features/baby-expenses/application/baby-expense-repository';
import {
  createExpensePresetRange,
  formatExpenseAmount,
  parseExpenseAmount,
  type BabyExpense,
  type BabyExpenseCategory,
  type ExpensePayer,
} from '@/features/baby-expenses/domain/baby-expense';
import { exportBabyExpenseFile } from '@/features/baby-expenses/infrastructure/baby-expense-file';
import { DatePickerField } from '@/features/baby-profile/presentation/date-picker-field';
import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import { SelectField, type SelectOption } from '@/features/baby-profile/presentation/select-field';
import type { FamilyRole } from '@/features/family/domain/family';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { DataPagination } from '@/shared/presentation/data-pagination';
import { dateToIso } from '@/shared/presentation/date';
import { KeyboardAwareScrollView } from '@/shared/presentation/keyboard-aware-scroll-view';
import { ScreenHero } from '@/shared/presentation/screen-hero';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const categoryOptions = [
  { label: 'Alimentación', value: 'feeding' },
  { label: 'Pañales', value: 'diapers' },
  { label: 'Salud', value: 'health' },
  { label: 'Ropa', value: 'clothing' },
  { label: 'Higiene', value: 'hygiene' },
  { label: 'Equipamiento', value: 'equipment' },
  { label: 'Cuidados', value: 'childcare' },
  { label: 'Otro', value: 'other' },
] satisfies SelectOption<BabyExpenseCategory>[];

const categoryLabels = Object.fromEntries(
  categoryOptions.map(({ label, value }) => [value, label]),
) as Record<BabyExpenseCategory, string>;

type RangePreset = 'month' | '30d' | 'custom';

interface BabyExpensesScreenProps {
  babyId: string;
  babyName: string;
  familyId: string;
  familyRole: FamilyRole;
  onBack: () => void;
  repository: BabyExpenseRepository;
  topContent?: ReactNode;
  userId: string;
}

function errorMessage(error: unknown): string {
  if (error instanceof BabyExpenseError && error.reason === 'currency_locked') {
    return 'La moneda queda bloqueada después del primer gasto para no mezclar importes.';
  }
  if (error instanceof BabyExpenseError && error.reason === 'not_allowed') {
    return 'No tienes permiso para realizar este cambio.';
  }
  if (error instanceof BabyExpenseError && error.reason === 'invalid') {
    return 'Revisa el importe, la fecha y los datos del gasto.';
  }
  return 'No pudimos completar la acción. Comprueba la conexión e inténtalo de nuevo.';
}

export function BabyExpensesScreen({
  babyId,
  babyName,
  familyId,
  familyRole,
  onBack,
  repository,
  topContent,
  userId,
}: BabyExpensesScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const initialRange = createExpensePresetRange('month');
  const [preset, setPreset] = useState<RangePreset>('month');
  const [range, setRange] = useState(initialRange);
  const [category, setCategory] = useState<BabyExpenseCategory | 'all'>('all');
  const [payerId, setPayerId] = useState<string>('all');
  const [retired, setRetired] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<BabyExpensePageSize>(20);
  const [result, setResult] = useState<BabyExpensePage>();
  const [payers, setPayers] = useState<ExpensePayer[]>([]);
  const [currency, setCurrency] = useState('EUR');
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BabyExpense>();
  const [confirming, setConfirming] = useState<BabyExpense>();
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [draftCategory, setDraftCategory] = useState<BabyExpenseCategory>('diapers');
  const [draftPayerId, setDraftPayerId] = useState(userId);
  const [expenseDate, setExpenseDate] = useState(dateToIso(new Date()));
  const [notes, setNotes] = useState('');
  const [validation, setValidation] = useState<Record<string, string>>({});

  const filters: BabyExpenseFilters = useMemo(() => ({
    category: category === 'all' ? undefined : category,
    endDate: range.endDate,
    paidByUserId: payerId === 'all' ? undefined : payerId,
    retired,
    startDate: range.startDate,
  }), [category, payerId, range.endDate, range.startDate, retired]);

  const payerNames = useMemo(
    () => new Map(payers.map((payer) => [payer.userId, payer.displayName])),
    [payers],
  );
  const payerOptions = payers.map((payer) => ({
    label: payer.displayName,
    value: payer.userId,
  }));
  const payerFilterOptions = [{ label: 'Todas las personas', value: 'all' }, ...payerOptions];
  const categoryFilterOptions: SelectOption<BabyExpenseCategory | 'all'>[] = [
    { label: 'Todas las categorías', value: 'all' },
    ...categoryOptions,
  ];

  useEffect(() => {
    let active = true;
    void repository.loadPayers(familyId).then((nextPayers) => {
      if (!active) return;
      setPayers(nextPayers);
      setDraftPayerId(
        nextPayers.some((payer) => payer.userId === userId)
          ? userId
          : (nextPayers[0]?.userId ?? userId),
      );
    }).catch((reason) => active && setError(errorMessage(reason)));
    return () => { active = false; };
  }, [familyId, repository, userId]);

  useEffect(() => {
    let active = true;
    void repository.loadCurrency(familyId).then((nextCurrency) => {
      if (!active) return;
      setCurrency(nextCurrency);
    }).catch((reason) => active && setError(errorMessage(reason)));
    return () => { active = false; };
  }, [familyId, repository]);

  useEffect(() => {
    let active = true;
    void repository.loadPage(babyId, page, pageSize, filters)
      .then((nextResult) => {
        if (!active) return;
        if (page > nextResult.totalPages) {
          setPage(nextResult.totalPages);
          return;
        }
        setResult(nextResult);
      })
      .catch((reason) => active && setError(errorMessage(reason)))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [babyId, filters, page, pageSize, reloadVersion, repository]);

  function selectPreset(nextPreset: RangePreset) {
    setPreset(nextPreset);
    if (nextPreset !== 'custom') setRange(createExpensePresetRange(nextPreset));
    setPage(1);
  }

  function resetForm() {
    setAmount('');
    setConcept('');
    setDraftCategory('diapers');
    setDraftPayerId(userId);
    setExpenseDate(dateToIso(new Date()));
    setNotes('');
    setEditing(undefined);
    setShowForm(false);
    setValidation({});
  }

  function beginEdit(expense: BabyExpense) {
    setConcept(expense.concept);
    setAmount((expense.amountMinor / 100).toFixed(2).replace('.', ','));
    setDraftCategory(expense.category);
    setDraftPayerId(expense.paidByUserId);
    setExpenseDate(expense.expenseDate);
    setNotes(expense.notes ?? '');
    setEditing(expense);
    setShowForm(true);
    setValidation({});
  }

  async function save() {
    const amountMinor = parseExpenseAmount(amount);
    const nextValidation: Record<string, string> = {};
    if (!concept.trim()) nextValidation.concept = 'Escribe un concepto.';
    if (!amountMinor) nextValidation.amount = 'Introduce un importe válido con hasta 2 decimales.';
    if (!draftPayerId) nextValidation.payer = 'Selecciona quién pagó.';
    if (!expenseDate) nextValidation.date = 'Selecciona la fecha.';
    if (Object.keys(nextValidation).length) {
      setValidation(nextValidation);
      return;
    }
    setIsSaving(true);
    setError(undefined);
    try {
      const draft: BabyExpenseDraft = {
        amountMinor: amountMinor!,
        category: draftCategory,
        concept: concept.trim(),
        expenseDate,
        notes: notes.trim() || undefined,
        paidByUserId: draftPayerId,
      };
      await repository.save(babyId, draft, editing?.id);
      resetForm();
      setReloadVersion((value) => value + 1);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setIsSaving(false);
    }
  }

  async function changeRetirement() {
    if (!confirming) return;
    setIsSaving(true);
    try {
      await repository.setRetired(confirming.id, !confirming.retiredAt);
      setConfirming(undefined);
      setReloadVersion((value) => value + 1);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setIsSaving(false);
    }
  }

  async function exportCsv() {
    setIsExporting(true);
    setError(undefined);
    try {
      const expenses = await repository.exportAll(babyId, filters);
      await exportBabyExpenseFile({
        content: `\uFEFF${createBabyExpenseCsv(expenses, payerNames)}`,
        fileName: `niduna-gastos-${babyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${range.startDate}-${range.endDate}.csv`,
      });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <KeyboardAwareScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          {topContent}
          <ScreenHero
            compactStack
            eyebrow="Organización familiar"
            leading={<View style={styles.heroIcon}><ReceiptText color={colors.aqua} size={30} /></View>}
            mascot={false}
            subtitle="Registra compras y consulta cuánto habéis gastado por periodo, categoría o persona."
            title={`Gastos de ${babyName}`}
            trailing={<Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}><Text style={styles.backButtonText}>Volver al bebé</Text></Pressable>}
          />

          {error ? <Text accessibilityLiveRegion="polite" style={styles.errorBanner}>{error}</Text> : null}

          <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total del periodo</Text>
            <Text style={styles.summaryValue}>
              {formatExpenseAmount(result?.totalAmountMinor ?? 0, currency)}
            </Text>
            <Text style={styles.summaryMeta}>{result?.totalCount ?? 0} gastos · {range.startDate} — {range.endDate}</Text>
          </View>
          {canCreateBabyExpense(familyRole) ? (
            <Pressable
              onPress={() => { resetForm(); setShowForm(true); }}
              style={styles.primaryAction}
            >
              <Plus color={colors.onAccent} size={18} />
              <Text style={styles.primaryActionText}>Añadir gasto</Text>
            </Pressable>
          ) : null}
          </View>

          {showForm ? (
          <View style={styles.formCard}>
            <View style={styles.formHeading}>
              <Text style={styles.sectionTitle}>{editing ? 'Editar gasto' : 'Nuevo gasto'}</Text>
              <Pressable accessibilityLabel="Cerrar formulario" onPress={resetForm} style={styles.iconButton}>
                <X color={colors.text} size={20} />
              </Pressable>
            </View>
            <View style={styles.formGrid}>
              <ProfileField error={validation.concept} label="Concepto" maxLength={120} onChangeText={setConcept} value={concept} />
              <ProfileField
                error={validation.amount}
                keyboardType="decimal-pad"
                label={`Importe (${currency})`}
                onChangeText={setAmount}
                value={amount}
              />
              <SelectField
                label="Categoría"
                onChange={setDraftCategory}
                options={categoryOptions}
                placeholder="Categoría"
                title="Categoría del gasto"
                value={draftCategory}
              />
              <SelectField
                error={validation.payer}
                label="Pagado por"
                onChange={setDraftPayerId}
                options={payerOptions}
                placeholder="Persona"
                title="¿Quién pagó?"
                value={draftPayerId}
              />
              <DatePickerField
                error={validation.date}
                label="Fecha"
                maximumDate={dateToIso(new Date())}
                onChange={setExpenseDate}
                value={expenseDate}
              />
              <ProfileField label="Nota opcional" maxLength={500} multiline onChangeText={setNotes} value={notes} />
            </View>
            <Pressable disabled={isSaving} onPress={() => void save()} style={styles.saveAction}>
              {isSaving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveActionText}>Guardar gasto</Text>}
            </Pressable>
          </View>
          ) : null}

          <View style={styles.filtersCard}>
          <View style={styles.presetRow}>
            {([['month', 'Este mes'], ['30d', 'Últimos 30 días'], ['custom', 'Personalizado']] as const).map(([value, label]) => (
              <Pressable key={value} onPress={() => selectPreset(value)} style={[styles.chip, preset === value && styles.chipSelected]}>
                <Text style={[styles.chipText, preset === value && styles.chipTextSelected]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {preset === 'custom' ? (
            <View style={styles.filterGrid}>
              <DatePickerField label="Desde" maximumDate={range.endDate} onChange={(startDate) => { setRange((current) => ({ ...current, startDate })); setPage(1); }} value={range.startDate} />
              <DatePickerField
                label="Hasta"
                maximumDate={dateToIso(new Date())}
                onChange={(endDate) => {
                  setRange((current) => ({
                    endDate,
                    startDate: current.startDate > endDate ? endDate : current.startDate,
                  }));
                  setPage(1);
                }}
                value={range.endDate}
              />
            </View>
          ) : null}
          <View style={styles.filterGrid}>
            <SelectField label="Categoría" onChange={(value) => { setCategory(value); setPage(1); }} options={categoryFilterOptions} placeholder="Todas" title="Filtrar por categoría" value={category} />
            <SelectField label="Pagado por" onChange={(value) => { setPayerId(value); setPage(1); }} options={payerFilterOptions} placeholder="Todos" title="Filtrar por persona" value={payerId} />
          </View>
          <View style={styles.filterActions}>
            <Pressable onPress={() => { setRetired((value) => !value); setPage(1); }} style={styles.secondaryAction}>
              {retired ? <RotateCcw color={colors.primaryPressed} size={18} /> : <Archive color={colors.primaryPressed} size={18} />}
              <Text style={styles.secondaryActionText}>{retired ? 'Ver activos' : 'Ver retirados'}</Text>
            </Pressable>
            <Pressable disabled={isExporting || !result?.totalCount} onPress={() => void exportCsv()} style={styles.secondaryAction}>
              <Download color={colors.primaryPressed} size={18} />
              <Text style={styles.secondaryActionText}>{isExporting ? 'Preparando…' : 'Exportar CSV'}</Text>
            </Pressable>
          </View>
          </View>

          <View style={styles.listCard}>
            <View style={styles.listHeading}>
              <View>
                <Text style={styles.sectionTitle}>{retired ? 'Gastos retirados' : 'Gastos registrados'}</Text>
                <Text style={styles.sectionHint}>{isLoading ? 'Actualizando…' : `${result?.totalCount ?? 0} gastos · ${babyName}`}</Text>
              </View>
              <Pressable
                accessibilityLabel="Actualizar gastos"
                onPress={() => {
                  setIsLoading(true);
                  setError(undefined);
                  setReloadVersion((value) => value + 1);
                }}
                style={styles.refresh}
              >
                <RefreshCw color={colors.aqua} size={19} />
              </Pressable>
            </View>
            {isLoading ? <ActivityIndicator color={colors.primaryPressed} size="large" /> : null}
            {!isLoading && !result?.expenses.length ? (
              <View style={styles.emptyState}>
                <ReceiptText color={colors.primaryPressed} size={34} />
                <Text style={styles.emptyTitle}>Todavía no hay gastos en este periodo</Text>
                <Text style={styles.emptyText}>Cuando registres uno, aparecerá aquí y se sumará al total.</Text>
              </View>
            ) : null}
            {result?.expenses.map((expense) => (
              <View key={expense.id} style={[styles.expenseRow, compact && styles.expenseRowCompact]}>
                <View style={styles.expenseMain}>
                  <Text style={styles.expenseConcept}>{expense.concept}</Text>
                  <Text style={styles.expenseMeta}>
                    {expense.expenseDate} · {categoryLabels[expense.category]} · {payerNames.get(expense.paidByUserId) ?? 'Miembro retirado'}
                  </Text>
                  {expense.notes ? <Text style={styles.expenseNotes}>{expense.notes}</Text> : null}
                </View>
                <Text style={styles.expenseAmount}>{formatExpenseAmount(expense.amountMinor, expense.currency)}</Text>
                {canManageBabyExpense(expense, familyRole, userId) ? (
                  <View style={styles.rowActions}>
                    {!expense.retiredAt ? (
                      <Pressable accessibilityLabel="Editar gasto" onPress={() => beginEdit(expense)} style={styles.rowAction}>
                        <Pencil color={colors.primaryPressed} size={17} />
                      </Pressable>
                    ) : null}
                    <Pressable accessibilityLabel={expense.retiredAt ? 'Restaurar gasto' : 'Retirar gasto'} onPress={() => setConfirming(expense)} style={styles.rowAction}>
                      {expense.retiredAt ? <RotateCcw color={colors.primaryPressed} size={17} /> : <Archive color={colors.coral} size={17} />}
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
            {result ? (
              <DataPagination
                onChangePage={setPage}
                onChangePageSize={(value) => { setPageSize(value); setPage(1); }}
                page={page}
                pageSize={pageSize}
                total={result.totalCount}
                totalPages={result.totalPages}
              />
            ) : null}
          </View>
        </View>
      </KeyboardAwareScrollView>

      <ConfirmationModal
        confirmLabel={confirming?.retiredAt ? 'Restaurar' : 'Retirar'}
        description={confirming?.retiredAt
          ? 'El gasto volverá al listado y a los totales.'
          : 'El gasto dejará de aparecer en los totales, pero conservará su auditoría.'}
        isPending={isSaving}
        icon={<ReceiptText color={colors.coral} size={24} />}
        onCancel={() => setConfirming(undefined)}
        onConfirm={() => void changeRetirement()}
        title={confirming?.retiredAt ? '¿Restaurar este gasto?' : '¿Retirar este gasto?'}
        tone={confirming?.retiredAt ? 'primary' : 'danger'}
        visible={Boolean(confirming)}
      />
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: { paddingBottom: 120 },
  content: { alignSelf: 'center', gap: spacing.xl, maxWidth: 1180, padding: spacing.lg, width: '100%' },
  heroIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, height: 58, justifyContent: 'center', width: 58 },
  backButton: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backButtonText: { color: colors.primaryPressed, fontWeight: '900' },
  iconButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 46, justifyContent: 'center', width: 46 },
  errorBanner: { backgroundColor: colors.errorSoft, borderRadius: radius.md, color: colors.error, fontSize: 13, padding: spacing.lg },
  summaryCard: { alignItems: 'center', backgroundColor: colors.sky, borderRadius: radius.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, justifyContent: 'space-between', padding: spacing.xl },
  summaryLabel: { color: colors.primaryPressed, fontSize: 13, fontWeight: '800' },
  summaryValue: { color: colors.text, fontSize: 34, fontWeight: '900', marginVertical: spacing.xs },
  summaryMeta: { color: colors.textMuted, fontSize: 12 },
  primaryAction: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.xl },
  primaryActionText: { color: colors.onAccent, fontSize: 14, fontWeight: '900' },
  formCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.lg, padding: spacing.xl },
  formHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  saveAction: { alignItems: 'center', backgroundColor: colors.primaryPressed, borderRadius: radius.md, justifyContent: 'center', minHeight: 52 },
  saveActionText: { color: colors.onAccent, fontSize: 15, fontWeight: '900' },
  filtersCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.lg, padding: spacing.lg },
  presetRow: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.xs },
  chip: { alignItems: 'center', borderRadius: radius.pill, flexGrow: 1, minHeight: 44, minWidth: 110, justifyContent: 'center', paddingHorizontal: spacing.md },
  chipSelected: { backgroundColor: colors.primaryPressed },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  chipTextSelected: { color: colors.onAccent },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  filterActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  secondaryAction: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.sm, minHeight: 46, paddingHorizontal: spacing.lg },
  secondaryActionText: { color: colors.primaryPressed, fontSize: 13, fontWeight: '900' },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg },
  listHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  refresh: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, height: 46, justifyContent: 'center', width: 46 },
  emptyState: { alignItems: 'center', gap: spacing.sm, padding: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  expenseRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 82, paddingVertical: spacing.md },
  expenseRowCompact: { alignItems: 'flex-start', flexWrap: 'wrap' },
  expenseMain: { flex: 1, gap: spacing.xs, minWidth: 200 },
  expenseConcept: { color: colors.text, fontSize: 15, fontWeight: '900' },
  expenseMeta: { color: colors.textMuted, fontSize: 12 },
  expenseNotes: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  expenseAmount: { color: colors.text, fontSize: 18, fontWeight: '900' },
  rowActions: { flexDirection: 'row', gap: spacing.sm },
  rowAction: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 42, justifyContent: 'center', width: 42 },
}));
