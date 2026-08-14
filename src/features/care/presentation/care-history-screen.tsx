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
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { subscribeToCareDataChanges } from '@/features/care/application/care-data-events';
import type { CareEventFilter, CareHistoryPageSize } from '@/features/care/application/care-history';
import { getCareRecordRetention } from '@/features/care/application/care-record-retention';
import {
  canEditCareRecord,
  getCareRecordKey,
  getSelectableCareRecordKeys,
  reconcileCareRecordSelection,
} from '@/features/care/application/care-record-management';
import { CareOperationError, type CareHistoryPage, type CareRepository } from '@/features/care/application/care-repository';
import { getDurationMinutes } from '@/features/care/application/care-snapshot';
import type { CareEvent } from '@/features/care/domain/care-event';
import { CareEditSheet } from '@/features/care/presentation/care-edit-sheet';
import { CareHistoryControls } from '@/features/care/presentation/care-history-controls';
import { CareRetireConfirmationModal } from '@/features/care/presentation/care-retire-confirmation-modal';
import { DataPagination } from '@/shared/presentation/data-pagination';
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { colors, radius, spacing } from '@/shared/presentation/theme';

interface CareHistoryScreenProps {
  babyId?: string;
  babyName?: string;
  canManage: boolean;
  canRecord: boolean;
  exportHistory: (events: CareEvent[], babyName: string) => Promise<void>;
  repository: CareRepository;
  topContent?: ReactNode;
  userId: string;
}

const eventLabels: Record<CareEvent['type'], string> = {
  diaper: 'Pañal',
  feeding: 'Alimentación',
  measurement: 'Medidas',
  note: 'Nota',
  sleep: 'Sueño',
};

function describeEvent(event: CareEvent): string {
  if (event.type === 'feeding') {
    const method = event.method === 'breast' ? 'Pecho' : event.method === 'formula' ? 'Fórmula' : event.method === 'mixed' ? 'Mixta' : 'Leche extraída';
    return [method, event.amountMilliliters ? `${event.amountMilliliters} ml` : undefined, event.notes].filter(Boolean).join(' · ');
  }
  if (event.type === 'diaper') {
    const condition = event.condition === 'wet' ? 'Pipí' : event.condition === 'dirty' ? 'Caca' : 'Pipí y caca';
    return [condition, event.notes].filter(Boolean).join(' · ');
  }
  if (event.type === 'sleep') {
    return event.endedAt ? `${getDurationMinutes(event.occurredAt, event.endedAt)} min` : 'Sueño en curso';
  }
  if (event.type === 'note') return event.content;
  return [
    event.weightGrams !== undefined ? `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3 }).format(event.weightGrams / 1000)} kg` : undefined,
    event.lengthMillimeters !== undefined ? `${event.lengthMillimeters / 10} cm` : undefined,
    event.headCircumferenceMillimeters !== undefined ? `PC ${event.headCircumferenceMillimeters / 10} cm` : undefined,
    event.notes,
  ].filter(Boolean).join(' · ');
}

export function CareHistoryScreen({
  babyId,
  babyName,
  canManage,
  canRecord,
  exportHistory,
  repository,
  topContent,
  userId,
}: CareHistoryScreenProps) {
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

  async function handleExport() {
    if (!babyId || !babyName) return;
    setIsExporting(true);
    setError(undefined);
    try {
      const events = await repository.loadHistoryForExport({ babyId, date: selectedDate, filter });
      await exportHistory(events, babyName);
    } catch {
      setError('No pudimos preparar el archivo para Excel.');
    } finally {
      setIsExporting(false);
    }
  }

  const visibleEvents = history?.events ?? [];
  const selectedEvents = visibleEvents.filter((event) => selectedKeys.has(getCareRecordKey(event)));
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          {topContent}
          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>Registro completo</Text>
              <Text style={styles.title}>Historial de {babyName ?? 'la familia'}</Text>
              <Text style={styles.subtitle}>Consulta todos los cuidados con paginación real, filtros y exportación.</Text>
            </View>
            <NuniMascot size={116} />
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
                  exportCount={history?.total ?? 0}
                  isExporting={isExporting}
                  onChangeDate={(date) => resetPage(() => setSelectedDate(date))}
                  onChangeFilter={(value) => resetPage(() => setFilter(value))}
                  onExport={() => void handleExport()}
                  selectedDate={selectedDate}
                />
              ) : null}
              <View style={styles.tableCard}>
                <View style={styles.tableHeading}>
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
                        <Archive color={colors.white} size={15} />
                        <Text style={styles.bulkButtonText}>Quitar del relevo</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                <ScrollView contentContainerStyle={styles.tableScrollContent} horizontal showsHorizontalScrollIndicator style={styles.tableScroll}>
                  <View style={styles.table}>
                    <View style={[styles.row, styles.headerRow]}>
                      {canManage && !showRetired ? <View style={styles.selectCell} /> : null}
                      <Text style={[styles.cell, styles.dateCell, styles.headerText]}>Fecha</Text>
                      <Text style={[styles.cell, styles.typeCell, styles.headerText]}>Tipo</Text>
                      <Text style={[styles.cell, styles.detailCell, styles.headerText]}>Detalle</Text>
                      <Text style={[styles.cell, styles.authorCell, styles.headerText]}>Registrado por</Text>
                      <Text style={[styles.cell, styles.actionCell, styles.headerText]}>Acciones</Text>
                    </View>
                    {visibleEvents.map((event) => {
                      const canModify = canEditCareRecord(event, userId, canManage, canRecord);
                      const key = getCareRecordKey(event);
                      const retention = showRetired
                        ? getCareRecordRetention(event.deletedAt)
                        : undefined;
                      return (
                        <View key={key} style={styles.row}>
                          {canManage && !showRetired ? (
                            <Pressable accessibilityLabel={selectedKeys.has(key) ? 'Quitar de la selección' : 'Seleccionar registro'} disabled={!canModify} onPress={() => toggleSelection(event)} style={styles.selectCell}>
                              {selectedKeys.has(key) ? <CheckSquare2 color={colors.primaryPressed} size={19} /> : <Square color={canModify ? colors.textMuted : colors.border} size={19} />}
                            </Pressable>
                          ) : null}
                          <Text style={[styles.cell, styles.dateCell]}>{new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.occurredAt))}</Text>
                          <Text style={[styles.cell, styles.typeCell, styles.typeText]}>{eventLabels[event.type]}</Text>
                          <View style={[styles.cell, styles.detailCell]}>
                            <Text numberOfLines={3} style={styles.detailText}>{describeEvent(event)}</Text>
                            {retention ? (
                              <Text style={retention.isExpired ? styles.retentionExpired : styles.retentionText}>
                                {retention.isExpired
                                  ? 'Plazo de recuperación vencido'
                                  : `Recuperable ${retention.daysRemaining === 1 ? 'durante 1 día más' : `durante ${retention.daysRemaining} días más`} · hasta el ${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(retention.expiresAt))}`}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={[styles.cell, styles.authorCell]}>{event.recordedByName ?? 'Un familiar'}</Text>
                          <View style={[styles.cell, styles.actionCell]}>
                            {showRetired && canManage ? retention?.isExpired ? (
                              <Text style={styles.unavailable}>No recuperable</Text>
                            ) : (
                              <Pressable onPress={() => void handleRestore(event)} style={styles.actionLink}><RotateCcw color={colors.primaryPressed} size={15} /><Text style={styles.actionText}>Restaurar</Text></Pressable>
                            ) : canModify ? (
                              <View style={styles.rowActions}>
                                <Pressable onPress={() => setEditingEvent(event)} style={styles.actionLink}><Pencil color={colors.primaryPressed} size={15} /><Text style={styles.actionText}>Editar</Text></Pressable>
                                <Pressable accessibilityLabel={`Quitar registro de ${eventLabels[event.type]} del relevo`} onPress={() => setPendingRetireId(key)} style={styles.actionLink}><Archive color={colors.error} size={15} /><Text style={styles.retireText}>Quitar</Text></Pressable>
                              </View>
                            ) : <Text style={styles.unavailable}>—</Text>}
                          </View>
                        </View>
                      );
                    })}
                    {!isLoading && visibleEvents.length === 0 ? <Text style={styles.noRows}>{showRetired ? 'No hay registros retirados.' : 'No hay registros con estos filtros.'}</Text> : null}
                  </View>
                </ScrollView>
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

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: { alignItems: 'center', padding: spacing.lg, paddingBottom: 72 },
  content: { gap: spacing.xl, maxWidth: 920, width: '100%' },
  hero: { alignItems: 'center', backgroundColor: colors.sky, borderRadius: radius.lg, flexDirection: 'row', minHeight: 160, overflow: 'hidden', padding: spacing.xl },
  heroCopy: { flex: 1, gap: spacing.sm },
  eyebrow: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, maxWidth: 600 },
  tableCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.lg },
  tableHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headingActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  tableTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  tableSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  refresh: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, height: 38, justifyContent: 'center', width: 38 },
  secondaryButton: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  secondaryButtonText: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900' },
  selectionBar: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.md },
  selectionLink: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  selectionLinkText: { color: colors.primaryPressed, fontSize: 12, fontWeight: '900' },
  selectionCount: { color: colors.textMuted, fontSize: 12 },
  bulkButton: { alignItems: 'center', backgroundColor: colors.error, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.xs, marginLeft: 'auto', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bulkButtonText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  tableScroll: { width: '100%' },
  tableScrollContent: { flexGrow: 1 },
  table: { flex: 1, minWidth: 920, width: '100%' },
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
  actionLink: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, paddingVertical: 3 },
  actionText: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900' },
  retireText: { color: colors.error, fontSize: 11, fontWeight: '900' },
  unavailable: { color: colors.textMuted, fontSize: 14 },
  noRows: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.error, fontSize: 12 },
});
