import { RefreshCw, Star, Trash2 } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  CareHistoryPage,
  CareRepository,
} from '@/features/care/application/care-repository';
import { subscribeToCareDataChanges } from '@/features/care/application/care-data-events';
import type {
  CareEventFilter,
  CareHistoryPageSize,
} from '@/features/care/application/care-history';
import { getDurationMinutes } from '@/features/care/application/care-snapshot';
import type { CareEvent } from '@/features/care/domain/care-event';
import { CareHistoryControls } from '@/features/care/presentation/care-history-controls';
import { DataPagination } from '@/shared/presentation/data-pagination';
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { colors, radius, spacing } from '@/shared/presentation/theme';

interface CareHistoryScreenProps {
  babyId?: string;
  babyName?: string;
  canManage: boolean;
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
    const detail = [
      event.method === 'breast'
        ? 'Pecho'
        : event.method === 'formula'
          ? 'Fórmula'
          : event.method === 'mixed'
            ? 'Mixta'
            : 'Leche extraída',
      event.amountMilliliters ? `${event.amountMilliliters} ml` : undefined,
      event.notes,
    ].filter(Boolean);
    return detail.join(' · ');
  }

  if (event.type === 'diaper') {
    const condition =
      event.condition === 'wet'
        ? 'Pipí'
        : event.condition === 'dirty'
          ? 'Caca'
          : 'Pipí y caca';
    return [condition, event.notes].filter(Boolean).join(' · ');
  }

  if (event.type === 'sleep') {
    if (!event.endedAt) {
      return 'Sueño en curso';
    }
    return `${getDurationMinutes(event.occurredAt, event.endedAt)} min`;
  }

  if (event.type === 'note') {
    return event.content;
  }

  return [
    event.weightGrams !== undefined
      ? `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3 }).format(
          event.weightGrams / 1000,
        )} kg`
      : undefined,
    event.lengthMillimeters !== undefined
      ? `${event.lengthMillimeters / 10} cm`
      : undefined,
    event.headCircumferenceMillimeters !== undefined
      ? `PC ${event.headCircumferenceMillimeters / 10} cm`
      : undefined,
    event.notes,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function CareHistoryScreen({
  babyId,
  babyName,
  canManage,
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string>();

  useEffect(() => {
    let active = true;
    if (!babyId) {
      return () => {
        active = false;
      };
    }

    void repository
      .loadHistory({ babyId, date: selectedDate, filter, page, pageSize })
      .then((result) => {
        if (!active) return;
        if (page > result.totalPages) {
          setPage(result.totalPages);
          return;
        }
        setHistory(result);
      })
      .catch(() => active && setError('No pudimos cargar los registros.'))
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
    };
  }, [babyId, filter, loadVersion, page, pageSize, repository, selectedDate]);

  useEffect(() => {
    if (!babyId) return;

    const reload = () => setLoadVersion((value) => value + 1);
    const unsubscribeRepository = repository.subscribe(babyId, reload);
    const unsubscribeNotifications = subscribeToCareDataChanges(reload);

    return () => {
      unsubscribeRepository();
      unsubscribeNotifications();
    };
  }, [babyId, repository]);

  function resetPage(action: () => void) {
    setIsLoading(true);
    setError(undefined);
    action();
    setPage(1);
    setPendingDeleteId(undefined);
  }

  async function handleDelete(event: CareEvent) {
    setError(undefined);
    try {
      await repository.deleteEvent(event);
      setPendingDeleteId(undefined);
      setLoadVersion((value) => value + 1);
    } catch {
      setError('No pudimos eliminar el registro. Comprueba tus permisos.');
    }
  }

  async function handleExport() {
    if (!babyId || !babyName) return;
    setIsExporting(true);
    setError(undefined);
    try {
      const events = await repository.loadHistoryForExport({
        babyId,
        date: selectedDate,
        filter,
      });
      await exportHistory(events, babyName);
    } catch {
      setError('No pudimos preparar el archivo para Excel.');
    } finally {
      setIsExporting(false);
    }
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
              <Text style={styles.subtitle}>
                Consulta todos los cuidados con paginación real, filtros y exportación.
              </Text>
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
              <CareHistoryControls
                eventFilter={filter}
                events={history?.events ?? []}
                exportCount={history?.total ?? 0}
                isExporting={isExporting}
                onChangeDate={(date) => resetPage(() => setSelectedDate(date))}
                onChangeFilter={(value) => resetPage(() => setFilter(value))}
                onExport={() => void handleExport()}
                selectedDate={selectedDate}
              />
              <View style={styles.tableCard}>
                <View style={styles.tableHeading}>
                  <View>
                    <Text style={styles.tableTitle}>Registros</Text>
                    <Text style={styles.tableSubtitle}>
                      {isLoading ? 'Actualizando…' : `${history?.total ?? 0} resultados`}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Actualizar registros"
                    onPress={() => {
                      setIsLoading(true);
                      setError(undefined);
                      setLoadVersion((value) => value + 1);
                    }}
                    style={styles.refresh}
                  >
                    <RefreshCw color={colors.primaryPressed} size={17} />
                  </Pressable>
                </View>
                {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                <ScrollView
                  contentContainerStyle={styles.tableScrollContent}
                  horizontal
                  showsHorizontalScrollIndicator
                  style={styles.tableScroll}
                >
                  <View style={styles.table}>
                    <View style={[styles.row, styles.headerRow]}>
                      <Text style={[styles.cell, styles.dateCell, styles.headerText]}>Fecha</Text>
                      <Text style={[styles.cell, styles.typeCell, styles.headerText]}>Tipo</Text>
                      <Text style={[styles.cell, styles.detailCell, styles.headerText]}>Detalle</Text>
                      <Text style={[styles.cell, styles.authorCell, styles.headerText]}>Registrado por</Text>
                      <Text style={[styles.cell, styles.actionCell, styles.headerText]}>Acciones</Text>
                    </View>
                    {(history?.events ?? []).map((event) => {
                      const canDelete = canManage || event.recordedById === userId;
                      const confirming = pendingDeleteId === `${event.sourceType}:${event.id}`;
                      return (
                        <View key={`${event.sourceType}:${event.id}`} style={styles.row}>
                          <Text style={[styles.cell, styles.dateCell]}>
                            {new Intl.DateTimeFormat('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }).format(new Date(event.occurredAt))}
                          </Text>
                          <Text style={[styles.cell, styles.typeCell, styles.typeText]}>{eventLabels[event.type]}</Text>
                          <Text numberOfLines={3} style={[styles.cell, styles.detailCell]}>{describeEvent(event)}</Text>
                          <Text style={[styles.cell, styles.authorCell]}>{event.recordedByName ?? 'Un familiar'}</Text>
                          <View style={[styles.cell, styles.actionCell]}>
                            {canDelete ? (
                              confirming ? (
                                <View style={styles.confirmActions}>
                                  <Pressable onPress={() => void handleDelete(event)} style={styles.confirmDelete}>
                                    <Text style={styles.confirmDeleteText}>Confirmar</Text>
                                  </Pressable>
                                  <Pressable onPress={() => setPendingDeleteId(undefined)}>
                                    <Text style={styles.cancelText}>Cancelar</Text>
                                  </Pressable>
                                </View>
                              ) : (
                                <Pressable
                                  accessibilityLabel={`Eliminar registro de ${eventLabels[event.type]}`}
                                  onPress={() => setPendingDeleteId(`${event.sourceType}:${event.id}`)}
                                  style={styles.deleteLink}
                                >
                                  <Trash2 color={colors.error} size={15} />
                                  <Text style={styles.deleteText}>Eliminar</Text>
                                </Pressable>
                              )
                            ) : (
                              <Text style={styles.unavailable}>—</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                    {!isLoading && (history?.events.length ?? 0) === 0 ? (
                      <Text style={styles.noRows}>No hay registros con estos filtros.</Text>
                    ) : null}
                  </View>
                </ScrollView>
                <DataPagination
                  onChangePage={(value) => {
                    setIsLoading(true);
                    setError(undefined);
                    setPage(value);
                  }}
                  onChangePageSize={(value) => resetPage(() => setPageSize(value))}
                  page={history?.page ?? page}
                  pageSize={pageSize}
                  total={history?.total ?? 0}
                  totalPages={history?.totalPages ?? 1}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: { alignItems: 'center', padding: spacing.lg, paddingBottom: 72 },
  content: { gap: spacing.xl, maxWidth: 920, width: '100%' },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.lg,
    flexDirection: 'row',
    minHeight: 160,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroCopy: { flex: 1, gap: spacing.sm },
  eyebrow: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, maxWidth: 600 },
  tableCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.lg },
  tableHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  tableTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  tableSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  refresh: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, height: 38, justifyContent: 'center', width: 38 },
  tableScroll: { width: '100%' },
  tableScrollContent: { flexGrow: 1 },
  table: { flex: 1, minWidth: 860, width: '100%' },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 64 },
  headerRow: { backgroundColor: colors.surfaceMuted, borderBottomWidth: 0, borderRadius: radius.sm, minHeight: 42 },
  cell: { color: colors.text, fontSize: 14, lineHeight: 20, paddingHorizontal: spacing.sm },
  headerText: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  dateCell: { width: 150 },
  typeCell: { width: 130 },
  typeText: { fontWeight: '900' },
  detailCell: { flex: 1, minWidth: 280 },
  authorCell: { width: 145 },
  actionCell: { width: 145 },
  deleteLink: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.sm },
  deleteText: { color: colors.error, fontSize: 11, fontWeight: '900' },
  confirmActions: { alignItems: 'flex-start', gap: spacing.xs },
  confirmDelete: { backgroundColor: colors.error, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  confirmDeleteText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  cancelText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  unavailable: { color: colors.textMuted, fontSize: 14 },
  noRows: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.error, fontSize: 12 },
});
