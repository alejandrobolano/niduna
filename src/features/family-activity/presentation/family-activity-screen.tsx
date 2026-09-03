import { History, RefreshCw } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CareHistoryPageSize } from '@/features/care/application/care-history';
import { describeFamilyAuditAction } from '@/features/family-activity/application/describe-family-audit-entry';
import type {
  FamilyAuditPage,
  FamilyAuditRepository,
} from '@/features/family-activity/application/family-audit-repository';
import { DataPagination } from '@/shared/presentation/data-pagination';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';
import { resolveMemberAvatar } from '@/features/avatars/domain/avatar';
import { AnimalAvatar } from '@/features/avatars/presentation/animal-avatar';

interface FamilyActivityScreenProps {
  familyId: string;
  familyName: string;
  repository: FamilyAuditRepository;
  topContent?: ReactNode;
}

const entityLabels = {
  baby: 'Bebé',
  baby_contact: 'Contacto',
  baby_document: 'Documento',
  baby_note: 'Nota',
  care_event: 'Cuidado',
  family_member: 'Familia',
  measurement: 'Medidas',
} as const;

export function FamilyActivityScreen({
  familyId,
  familyName,
  repository,
  topContent,
}: FamilyActivityScreenProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 720;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<CareHistoryPageSize>(20);
  const [result, setResult] = useState<FamilyAuditPage>();
  const [loadVersion, setLoadVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    void repository
      .loadPage(familyId, page, pageSize)
      .then((nextResult) => {
        if (!active) return;
        if (page > nextResult.totalPages) {
          setPage(nextResult.totalPages);
          return;
        }
        setResult(nextResult);
      })
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
    };
  }, [familyId, loadVersion, page, pageSize, repository]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          {topContent}
          <View style={[styles.hero, isCompact && styles.heroCompact]}>
            <View style={[styles.heroIcon, isCompact && styles.heroIconCompact]}>
              <History color={colors.lavender} size={30} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>Solo administradores</Text>
              <Text style={[styles.title, isCompact && styles.titleCompact]}>
                Actividad de {familyName}
              </Text>
              <Text style={styles.subtitle}>
                Este registro de acciones se conserva durante 180 días. Su
                limpieza no elimina los cuidados, notas ni medidas reales.
              </Text>
            </View>
          </View>

          <View style={styles.tableCard}>
            <View style={styles.tableHeading}>
              <View>
                <Text style={styles.tableTitle}>Actividad familiar</Text>
                <Text style={styles.tableSubtitle}>
                  {isLoading ? 'Actualizando…' : `${result?.total ?? 0} movimientos`}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Actualizar actividad"
                onPress={() => {
                  setIsLoading(true);
                  setHasError(false);
                  setLoadVersion((value) => value + 1);
                }}
                style={styles.refresh}
              >
                <RefreshCw color={colors.primaryPressed} size={17} />
              </Pressable>
            </View>
            {hasError ? (
              <Text accessibilityRole="alert" style={styles.error}>No pudimos cargar la actividad.</Text>
            ) : null}
            {isCompact ? (
              <View style={styles.mobileList}>
                {(result?.entries ?? []).map((entry) => (
                  <View key={entry.id} style={styles.mobileEntry}>
                    <View style={styles.mobileEntryHeader}>
                      <View style={styles.actorIdentity}>
                        {entry.actorId ? <AnimalAvatar accessibilityLabel={`Avatar de ${entry.actorName ?? 'un familiar'}`} size={32} variant={resolveMemberAvatar(entry.actorId)} /> : null}
                        <Text style={styles.mobileActor}>{entry.actorName ?? 'Un familiar'}</Text>
                      </View>
                      <Text style={styles.mobileEntity}>{entityLabels[entry.entityType]}</Text>
                    </View>
                    <Text style={styles.mobileActivity}>{describeFamilyAuditAction(entry)}</Text>
                    <Text style={styles.mobileDate}>
                      {new Intl.DateTimeFormat('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(entry.createdAt))}
                    </Text>
                  </View>
                ))}
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
                    <Text style={[styles.cell, styles.dateCell, styles.headerText]}>Fecha</Text>
                    <Text style={[styles.cell, styles.actorCell, styles.headerText]}>Persona</Text>
                    <Text style={[styles.cell, styles.activityCell, styles.headerText]}>Actividad</Text>
                    <Text style={[styles.cell, styles.entityCell, styles.headerText]}>Área</Text>
                  </View>
                  {(result?.entries ?? []).map((entry) => (
                    <View key={entry.id} style={styles.row}>
                      <Text style={[styles.cell, styles.dateCell]}>
                        {new Intl.DateTimeFormat('es-ES', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(entry.createdAt))}
                      </Text>
                      <View style={[styles.cell, styles.actorCell, styles.actorIdentity]}>
                        {entry.actorId ? <AnimalAvatar accessibilityLabel={`Avatar de ${entry.actorName ?? 'un familiar'}`} size={32} variant={resolveMemberAvatar(entry.actorId)} /> : null}
                        <Text style={styles.actorText}>{entry.actorName ?? 'Un familiar'}</Text>
                      </View>
                      <Text style={[styles.cell, styles.activityCell]}>
                        {describeFamilyAuditAction(entry)}
                      </Text>
                      <Text style={[styles.cell, styles.entityCell]}>{entityLabels[entry.entityType]}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
            {!isLoading && (result?.entries.length ?? 0) === 0 ? (
              <Text style={styles.noRows}>Todavía no hay actividad registrada.</Text>
            ) : null}
            <DataPagination
              onChangePage={(value) => {
                setIsLoading(true);
                setHasError(false);
                setPage(value);
              }}
              onChangePageSize={(value) => {
                setIsLoading(true);
                setHasError(false);
                setPageSize(value);
                setPage(1);
              }}
              page={result?.page ?? page}
              pageSize={pageSize}
              total={result?.total ?? 0}
              totalPages={result?.totalPages ?? 1}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: { alignItems: 'center', padding: spacing.lg, paddingBottom: 72 },
  content: { gap: spacing.xl, maxWidth: 920, width: '100%' },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  heroCompact: { gap: spacing.md, padding: spacing.lg },
  heroIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, height: 64, justifyContent: 'center', width: 64 },
  heroIconCompact: { height: 48, width: 48 },
  heroCopy: { flex: 1, gap: spacing.sm },
  eyebrow: { color: colors.lavender, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  titleCompact: { fontSize: 24, lineHeight: 29 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, maxWidth: 650 },
  tableCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.lg },
  tableHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  tableTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  tableSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  refresh: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  tableScroll: { width: '100%' },
  tableScrollContent: { flexGrow: 1 },
  table: { flex: 1, minWidth: 820, width: '100%' },
  mobileList: { gap: spacing.md },
  mobileEntry: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  mobileEntryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  mobileActor: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '900' },
  actorIdentity: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.sm },
  mobileEntity: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.pill,
    color: colors.lavender,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  mobileActivity: { color: colors.text, fontSize: 14, lineHeight: 21 },
  mobileDate: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 62 },
  headerRow: { backgroundColor: colors.surfaceMuted, borderBottomWidth: 0, borderRadius: radius.sm, minHeight: 42 },
  cell: { color: colors.text, fontSize: 14, lineHeight: 20, paddingHorizontal: spacing.sm },
  headerText: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  dateCell: { width: 155 },
  actorCell: { width: 165 },
  actorText: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '900' },
  activityCell: { flex: 1, minWidth: 370 },
  entityCell: { width: 120 },
  noRows: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
  error: { color: colors.error, fontSize: 12 },
}));
