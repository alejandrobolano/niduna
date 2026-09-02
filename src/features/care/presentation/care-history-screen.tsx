import {
  Archive,
  CheckSquare2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Square,
  Star,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BabyContactRepository } from '@/features/baby-contacts/application/baby-contact-repository';
import type { BabyContact } from '@/features/baby-contacts/domain/baby-contact';
import { subscribeToCareDataChanges } from '@/features/care/application/care-data-events';
import {
  careEventLabels,
  describeCareEvent,
} from '@/features/care/application/care-event-description';
import type { CareEventFilter, CareHistoryPageSize } from '@/features/care/application/care-history';
import { getCareRecordRetention } from '@/features/care/application/care-record-retention';
import {
  canEditCareRecord,
  getCareEventsForExport,
  getCareRecordKey,
  getSelectableCareRecordKeys,
  reconcileCareRecordSelection,
} from '@/features/care/application/care-record-management';
import { CareOperationError, type CareHistoryPage, type CareRepository } from '@/features/care/application/care-repository';
import type { CareReportInput } from '@/features/care/application/care-report';
import type { CareEvent } from '@/features/care/domain/care-event';
import { CareEditSheet } from '@/features/care/presentation/care-edit-sheet';
import { CareHistoryControls } from '@/features/care/presentation/care-history-controls';
import {
  CareReportModal,
  type CareReportSelection,
} from '@/features/care/presentation/care-report-modal';
import { CareRetireConfirmationModal } from '@/features/care/presentation/care-retire-confirmation-modal';
import { CareRecordViewTabs } from '@/features/care-summary/presentation/care-record-view-tabs';
import { DataPagination } from '@/shared/presentation/data-pagination';
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface CareHistoryScreenProps {
  babyId?: string;
  babyName?: string;
  canManage: boolean;
  canRecord: boolean;
  contactRepository: BabyContactRepository;
  exportHistory: (events: CareEvent[], babyName: string) => Promise<void>;
  exportReport: (input: CareReportInput) => Promise<void>;
  familyName: string;
  onOpenSummary: () => void;
  repository: CareRepository;
  topContent?: ReactNode;
  userId: string;
}

const filterLabels: Record<CareEventFilter, string> = {
  all: 'Todos los cuidados',
  diaper: 'Pañales',
  feeding: 'Alimentación',
  measurement: 'Medidas',
  note: 'Notas',
  sleep: 'Sueño',
};

export function CareHistoryScreen({
  babyId,
  babyName,
  canManage,
  canRecord,
  contactRepository,
  exportHistory,
  exportReport,
  familyName,
  onOpenSummary,
  repository,
  topContent,
  userId,
}: CareHistoryScreenProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 720;
  const [filter, setFilter] = useState<CareEventFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<CareHistoryPageSize>(20);
  const [history, setHistory] = useState<CareHistoryPage>();
  const [loadVersion, setLoadVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(babyId));
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string>();
  const [editingEvent, setEditingEvent] = useState<CareEvent>();
  const [pendingRetireId, setPendingRetireId] = useState<string>();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [showBulkConfirmation, setShowBulkConfirmation] = useState(false);
  const [isRetiring, setIsRetiring] = useState(false);
  const [showRetired, setShowRetired] = useState(false);
  const [reportContacts, setReportContacts] = useState<BabyContact[]>([]);
  const [reportEvents, setReportEvents] = useState<CareEvent[]>([]);
  const [reportVisible, setReportVisible] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isReportGenerating, setIsReportGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    if (!babyId) return () => { active = false; };
    const request = showRetired ? repository.loadRetiredHistory : repository.loadHistory;
    void request({ babyId, date: selectedDate, filter, page, pageSize })
      .then((result) => {
        if (!active) return;
        if (page > result.totalPages) setPage(result.totalPages);
        else {
          setHistory(result);
          setSelectedKeys((current) => reconcileCareRecordSelection(current, result.events));
          setShowBulkConfirmation(false);
        }
      })
      .catch(() => active && setError('No pudimos cargar los registros.'))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [babyId, filter, loadVersion, page, pageSize, repository, selectedDate, showRetired]);

  useEffect(() => {
    if (!babyId) return;
    const reload = () => setLoadVersion((value) => value + 1);
    const unsubscribeRepository = repository.subscribe(babyId, reload);
    const unsubscribeNotifications = subscribeToCareDataChanges(reload);
    return () => { unsubscribeRepository(); unsubscribeNotifications(); };
  }, [babyId, repository]);

  function resetPage(action: () => void) {
    setIsLoading(true);
    setError(undefined);
    action();
    setPage(1);
    setPendingRetireId(undefined);
    setSelectedKeys(new Set());
    setShowBulkConfirmation(false);
  }

  async function handleRetire(events: CareEvent[]) {
    setError(undefined);
    setIsRetiring(true);
    try {
      await repository.retireEvents(events);
      setPendingRetireId(undefined);
      setSelectedKeys(new Set());
      setShowBulkConfirmation(false);
      setLoadVersion((value) => value + 1);
    } catch {
      setPendingRetireId(undefined);
      setShowBulkConfirmation(false);
      setError('No pudimos quitar los registros del relevo. No se aplicó ningún cambio.');
    } finally {
      setIsRetiring(false);
    }
  }

  async function handleRestore(event: CareEvent) {
    setError(undefined);
    try {
      await repository.restoreEvent(event);
      setLoadVersion((value) => value + 1);
    } catch (restoreError) {
      setError(
        restoreError instanceof CareOperationError && restoreError.reason === 'recovery_expired'
          ? 'El plazo de recuperación de 30 días ya ha terminado.'
          : 'No pudimos restaurar el registro. Comprueba tus permisos.',
      );
    }
  }

  function toggleSelection(event: CareEvent) {
    const key = getCareRecordKey(event);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setShowBulkConfirmation(false);
  }

  const visibleEvents = history?.events ?? [];
  const selectedEvents = visibleEvents.filter((event) =>
    selectedKeys.has(getCareRecordKey(event)),
  );
  const exportEvents = getCareEventsForExport(visibleEvents, selectedKeys);
  const isSelectionExport = selectedKeys.size > 0;
  const exportCount = isSelectionExport ? exportEvents.length : history?.total ?? 0;

  async function handleExport() {
    if (!babyId || !babyName) return;
    setIsExporting(true);
    setError(undefined);
    try {
      const events = isSelectionExport
        ? exportEvents
        : await repository.loadHistoryForExport({ babyId, date: selectedDate, filter });
      await exportHistory(events, babyName);
    } catch {
      setError('No pudimos preparar el archivo para Excel.');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleOpenReport() {
    if (!babyId) return;
    setIsReportLoading(true);
    setError(undefined);

    try {
      const eventsPromise = isSelectionExport
        ? Promise.resolve(exportEvents)
        : repository.loadHistoryForExport({ babyId, date: selectedDate, filter });
      const [events, contacts] = await Promise.all([
        eventsPromise,
        contactRepository.loadActive(babyId),
      ]);
      setReportEvents(events);
      setReportContacts(contacts);
      setReportVisible(true);
    } catch {
      setReportVisible(false);
      setError('No pudimos preparar los datos del informe.');
    } finally {
      setIsReportLoading(false);
    }
  }

  async function handleGenerateReport(selection: CareReportSelection) {
    if (!babyName) return;
    setIsReportGenerating(true);
    setError(undefined);

    try {
      await exportReport({
        babyName,
        columns: selection.columns,
        contacts: selection.contacts,
        events: reportEvents,
        familyName,
        filterLabel: isSelectionExport
          ? `Selección manual · ${reportEvents.length} registros`
          : selectedDate
          ? `${filterLabels[filter]} · ${new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(`${selectedDate}T12:00:00`))}`
          : filterLabels[filter],
      });
      setReportVisible(false);
    } catch {
      setError('No pudimos generar el informe PDF.');
    } finally {
      setIsReportGenerating(false);
    }
  }

  const pendingSingleEvent = visibleEvents.find(
    (event) => getCareRecordKey(event) === pendingRetireId,
  );
  const pendingRetireEvents = showBulkConfirmation
    ? selectedEvents
    : pendingSingleEvent
      ? [pendingSingleEvent]
      : [];

  function closeRetireConfirmation() {
    setPendingRetireId(undefined);
    setShowBulkConfirmation(false);
  }

  function renderEvent(event: CareEvent, compact: boolean) {
    const canModify = canEditCareRecord(event, userId, canManage, canRecord);
    const key = getCareRecordKey(event);
    const retention = showRetired
      ? getCareRecordRetention(event.deletedAt)
      : undefined;
    const occurredAt = new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(event.occurredAt));
    const selection = canManage && !showRetired ? (
      <Pressable
        accessibilityLabel={selectedKeys.has(key) ? 'Quitar de la selección' : 'Seleccionar registro'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selectedKeys.has(key), disabled: !canModify }}
        disabled={!canModify}
        onPress={() => toggleSelection(event)}
        style={compact ? styles.mobileSelect : styles.selectCell}
      >
        {selectedKeys.has(key) ? (
          <CheckSquare2 color={colors.primaryPressed} size={20} />
        ) : (
          <Square color={canModify ? colors.textMuted : colors.border} size={20} />
        )}
      </Pressable>
    ) : null;
    const actions = showRetired && canManage ? (
      retention?.isExpired ? (
        <Text style={styles.unavailable}>No recuperable</Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleRestore(event)}
          style={styles.actionLink}
        >
          <RotateCcw color={colors.primaryPressed} size={16} />
          <Text style={styles.actionText}>Restaurar</Text>
        </Pressable>
      )
    ) : canModify ? (
      <View style={[styles.rowActions, compact && styles.mobileRowActions]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditingEvent(event)}
          style={styles.actionLink}
        >
          <Pencil color={colors.primaryPressed} size={16} />
          <Text style={styles.actionText}>Editar</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Quitar registro de ${careEventLabels[event.type]} del relevo`}
          accessibilityRole="button"
          onPress={() => setPendingRetireId(key)}
          style={styles.actionLink}
        >
          <Archive color={colors.error} size={16} />
          <Text style={styles.retireText}>Quitar</Text>
        </Pressable>
      </View>
    ) : (
      <Text style={styles.unavailable}>—</Text>
    );
    const retentionLabel = retention
      ? retention.isExpired
        ? 'Plazo de recuperación vencido'
        : `Recuperable ${retention.daysRemaining === 1 ? 'durante 1 día más' : `durante ${retention.daysRemaining} días más`} · hasta el ${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(retention.expiresAt))}`
      : undefined;

    if (compact) {
      return (
        <View key={key} style={styles.mobileRecord}>
          <View style={styles.mobileRecordHeader}>
            <View style={styles.mobileRecordIdentity}>
              <Text style={styles.mobileType}>{careEventLabels[event.type]}</Text>
              <Text style={styles.mobileDate}>{occurredAt}</Text>
            </View>
            {selection}
          </View>
          <Text style={styles.mobileDetail}>{describeCareEvent(event)}</Text>
          {retentionLabel ? (
            <Text style={retention?.isExpired ? styles.retentionExpired : styles.retentionText}>
              {retentionLabel}
            </Text>
          ) : null}
          <View style={styles.mobileRecordFooter}>
            <Text style={styles.mobileAuthor}>
              Registrado por {event.recordedByName ?? 'un familiar'}
            </Text>
            <View style={styles.mobileActions}>{actions}</View>
          </View>
        </View>
      );
    }

    return (
      <View key={key} style={styles.row}>
        {selection}
        <Text style={[styles.cell, styles.dateCell]}>{occurredAt}</Text>
        <Text style={[styles.cell, styles.typeCell, styles.typeText]}>
          {careEventLabels[event.type]}
        </Text>
        <View style={[styles.cell, styles.detailCell]}>
          <Text numberOfLines={3} style={styles.detailText}>
            {describeCareEvent(event)}
          </Text>
          {retentionLabel ? (
            <Text style={retention?.isExpired ? styles.retentionExpired : styles.retentionText}>
              {retentionLabel}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.cell, styles.authorCell]}>
          {event.recordedByName ?? 'Un familiar'}
        </Text>
        <View style={[styles.cell, styles.actionCell]}>{actions}</View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          {topContent}
          <CareRecordViewTabs
            onChange={(view) => {
              if (view === 'summary') onOpenSummary();
            }}
            value="history"
          />
          <View style={[styles.hero, isCompact && styles.heroCompact]}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>Registro completo</Text>
              <Text style={[styles.title, isCompact && styles.titleCompact]}>
                Historial de {babyName ?? 'la familia'}
              </Text>
              <Text style={styles.subtitle}>Consulta todos los cuidados con paginación real, filtros y exportación.</Text>
            </View>
            <NuniMascot size={isCompact ? 82 : 116} />
          </View>

          {!babyId ? (
            <View style={styles.empty}>
              <Star color={colors.butter} size={34} />
              <Text style={styles.emptyTitle}>Selecciona un bebé</Text>
              <Text style={styles.emptyText}>El registro pertenece al bebé activo.</Text>
            </View>
          ) : (
            <>
              {!showRetired ? (
                <CareHistoryControls
                  eventFilter={filter}
                  events={visibleEvents}
                  exportCount={exportCount}
                  isExporting={isExporting}
                  isReportPreparing={isReportLoading}
                  isSelectionExport={isSelectionExport}
                  onChangeDate={(date) => resetPage(() => setSelectedDate(date))}
                  onChangeFilter={(value) => resetPage(() => setFilter(value))}
                  onExport={() => void handleExport()}
                  onOpenReport={() => void handleOpenReport()}
                  selectedDate={selectedDate}
                />
              ) : null}
              <View style={styles.tableCard}>
                <View style={[styles.tableHeading, isCompact && styles.tableHeadingCompact]}>
                  <View>
                    <Text style={styles.tableTitle}>{showRetired ? 'Registros retirados' : 'Registros'}</Text>
                    <Text style={styles.tableSubtitle}>
                      {isLoading
                        ? 'Actualizando…'
                        : showRetired
                          ? `${history?.total ?? 0} resultados · recuperables durante 30 días`
                          : `${history?.total ?? 0} resultados`}
                    </Text>
                  </View>
                  <View style={styles.headingActions}>
                    {canManage ? (
                      <Pressable onPress={() => resetPage(() => { setFilter('all'); setSelectedDate(undefined); setShowRetired((value) => !value); })} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>{showRetired ? 'Volver al relevo' : 'Ver retirados'}</Text>
                      </Pressable>
                    ) : null}
                    <Pressable accessibilityLabel="Actualizar registros" onPress={() => { setIsLoading(true); setError(undefined); setLoadVersion((value) => value + 1); }} style={styles.refresh}>
                      <RefreshCw color={colors.primaryPressed} size={17} />
                    </Pressable>
                  </View>
                </View>
                {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                {canManage && !showRetired && visibleEvents.length > 0 ? (
                  <View style={styles.selectionBar}>
                    <Pressable
                      onPress={() => {
                        const selectable = getSelectableCareRecordKeys(visibleEvents);
                        const allSelected = selectable.size > 0 && [...selectable].every((key) => selectedKeys.has(key));
                        setSelectedKeys(allSelected ? new Set() : selectable);
                        setShowBulkConfirmation(false);
                      }}
                      style={styles.selectionLink}
                    >
                      <CheckSquare2 color={colors.primaryPressed} size={16} />
                      <Text style={styles.selectionLinkText}>Seleccionar todos los visibles</Text>
                    </Pressable>
                    <Text style={styles.selectionCount}>{selectedKeys.size} seleccionados</Text>
                    {selectedKeys.size > 0 ? (
                      <Pressable onPress={() => setShowBulkConfirmation(true)} style={styles.bulkButton}>
                        <Archive color={colors.onAccent} size={15} />
                        <Text style={styles.bulkButtonText}>Quitar del relevo</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {isCompact ? (
                  <View style={styles.mobileList}>
                    {visibleEvents.map((event) => renderEvent(event, true))}
                  </View>
                ) : (
                  <ScrollView
                    contentContainerStyle={styles.tableScrollContent}
                    horizontal
                    showsHorizontalScrollIndicator
                    style={styles.tableScroll}
                  >
                    <View style={styles.table}>
                      <View style={[styles.row, styles.headerRow]}>
                        {canManage && !showRetired ? <View style={styles.selectCell} /> : null}
                        <Text style={[styles.cell, styles.dateCell, styles.headerText]}>Fecha</Text>
                        <Text style={[styles.cell, styles.typeCell, styles.headerText]}>Tipo</Text>
                        <Text style={[styles.cell, styles.detailCell, styles.headerText]}>Detalle</Text>
                        <Text style={[styles.cell, styles.authorCell, styles.headerText]}>Registrado por</Text>
                        <Text style={[styles.cell, styles.actionCell, styles.headerText]}>Acciones</Text>
                      </View>
                      {visibleEvents.map((event) => renderEvent(event, false))}
                    </View>
                  </ScrollView>
                )}
                {!isLoading && visibleEvents.length === 0 ? (
                  <Text style={styles.noRows}>
                    {showRetired ? 'No hay registros retirados.' : 'No hay registros con estos filtros.'}
                  </Text>
                ) : null}
                <DataPagination
                  onChangePage={(value) => { setIsLoading(true); setError(undefined); setSelectedKeys(new Set()); setShowBulkConfirmation(false); setPage(value); }}
                  onChangePageSize={(value) => resetPage(() => setPageSize(value))}
                  page={history?.page ?? page}
                  pageSize={pageSize}
                  total={history?.total ?? 0}
                  totalPages={history?.totalPages ?? 1}
                />
              </View>
              {editingEvent ? (
                <CareEditSheet key={getCareRecordKey(editingEvent)} event={editingEvent} onClose={() => setEditingEvent(undefined)} onSaved={() => setLoadVersion((value) => value + 1)} repository={repository} />
              ) : null}
              {reportVisible ? (
                <CareReportModal
                  contacts={reportContacts}
                  events={reportEvents}
                  filterLabel={isSelectionExport
                    ? `Selección manual · ${reportEvents.length} registros`
                    : selectedDate
                      ? `${filterLabels[filter]} · día seleccionado`
                      : filterLabels[filter]}
                  isGenerating={isReportGenerating}
                  isLoading={isReportLoading}
                  onClose={() => setReportVisible(false)}
                  onGenerate={(selection) => void handleGenerateReport(selection)}
                  visible
                />
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
      <CareRetireConfirmationModal
        babyName={babyName ?? 'este bebé'}
        isSubmitting={isRetiring}
        onCancel={closeRetireConfirmation}
        onConfirm={() => void handleRetire(pendingRetireEvents)}
        recordCount={pendingRetireEvents.length}
      />
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: { alignItems: 'center', padding: spacing.lg, paddingBottom: 72 },
  content: { gap: spacing.xl, maxWidth: 920, width: '100%' },
  hero: { alignItems: 'center', backgroundColor: colors.sky, borderRadius: radius.lg, flexDirection: 'row', minHeight: 160, overflow: 'hidden', padding: spacing.xl },
  heroCompact: { minHeight: 140, padding: spacing.lg },
  heroCopy: { flex: 1, gap: spacing.sm },
  eyebrow: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  titleCompact: { fontSize: 24, lineHeight: 29 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, maxWidth: 600 },
  tableCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.lg },
  tableHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  tableHeadingCompact: { alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.md },
  headingActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  tableTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  tableSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  refresh: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  secondaryButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  secondaryButtonText: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900' },
  selectionBar: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.md },
  selectionLink: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  selectionLinkText: { color: colors.primaryPressed, fontSize: 12, fontWeight: '900' },
  selectionCount: { color: colors.textMuted, fontSize: 12 },
  bulkButton: { alignItems: 'center', backgroundColor: colors.error, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.xs, marginLeft: 'auto', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bulkButtonText: { color: colors.onAccent, fontSize: 11, fontWeight: '900' },
  tableScroll: { width: '100%' },
  tableScrollContent: { flexGrow: 1 },
  table: { flex: 1, minWidth: 920, width: '100%' },
  mobileList: { gap: spacing.md },
  mobileRecord: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  mobileRecordHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  mobileRecordIdentity: { flex: 1, gap: 2 },
  mobileType: { color: colors.text, fontSize: 15, fontWeight: '900' },
  mobileDate: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  mobileDetail: { color: colors.text, fontSize: 14, lineHeight: 21 },
  mobileSelect: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  mobileRecordFooter: {
    alignItems: 'flex-start',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  mobileAuthor: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  mobileActions: { width: '100%' },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 64 },
  headerRow: { backgroundColor: colors.surfaceMuted, borderBottomWidth: 0, borderRadius: radius.sm, minHeight: 42 },
  cell: { color: colors.text, fontSize: 14, lineHeight: 20, paddingHorizontal: spacing.sm },
  headerText: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  selectCell: { alignItems: 'center', justifyContent: 'center', width: 42 },
  dateCell: { width: 145 },
  typeCell: { width: 120 },
  typeText: { fontWeight: '900' },
  detailCell: { flex: 1, minWidth: 250 },
  detailText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  retentionText: { color: colors.primaryPressed, fontSize: 11, fontWeight: '800', lineHeight: 16, marginTop: 3 },
  retentionExpired: { color: colors.error, fontSize: 11, fontWeight: '800', lineHeight: 16, marginTop: 3 },
  authorCell: { width: 135 },
  actionCell: { width: 180 },
  rowActions: { alignItems: 'flex-start', gap: 4 },
  mobileRowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionLink: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  actionText: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900' },
  retireText: { color: colors.error, fontSize: 11, fontWeight: '900' },
  unavailable: { color: colors.textMuted, fontSize: 14 },
  noRows: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.error, fontSize: 12 },
}));
