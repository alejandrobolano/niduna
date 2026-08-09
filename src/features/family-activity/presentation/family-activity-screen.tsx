import { History, RefreshCw } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CareHistoryPageSize } from '@/features/care/application/care-history';
import { describeFamilyAuditAction } from '@/features/family-activity/application/describe-family-audit-entry';
import type {
  FamilyAuditPage,
  FamilyAuditRepository,
} from '@/features/family-activity/application/family-audit-repository';
import { DataPagination } from '@/shared/presentation/data-pagination';
import { colors, radius, spacing } from '@/shared/presentation/theme';

interface FamilyActivityScreenProps {
  familyId: string;
  familyName: string;
  repository: FamilyAuditRepository;
  topContent?: ReactNode;
}

const entityLabels = {
  baby: 'Bebé',
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
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <History color={colors.lavender} size={30} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>Solo administradores</Text>
              <Text style={styles.title}>Actividad de {familyName}</Text>
              <Text style={styles.subtitle}>
                Cambios importantes realizados por los miembros de la familia.
                Los datos se conservan durante 60 días.
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
            <ScrollView horizontal showsHorizontalScrollIndicator>
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
                    <Text style={[styles.cell, styles.actorCell, styles.actorText]}>
                      {entry.actorName ?? 'Un familiar'}
                    </Text>
                    <Text style={[styles.cell, styles.activityCell]}>
                      {describeFamilyAuditAction(entry)}
                    </Text>
                    <Text style={[styles.cell, styles.entityCell]}>{entityLabels[entry.entityType]}</Text>
                  </View>
                ))}
                {!isLoading && (result?.entries.length ?? 0) === 0 ? (
                  <Text style={styles.noRows}>Todavía no hay actividad registrada.</Text>
                ) : null}
              </View>
            </ScrollView>
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

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: { alignItems: 'center', padding: spacing.lg, paddingBottom: 72 },
  content: { gap: spacing.xl, maxWidth: 1080, width: '100%' },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  heroIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, height: 64, justifyContent: 'center', width: 64 },
  heroCopy: { flex: 1, gap: spacing.sm },
  eyebrow: { color: colors.lavender, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, maxWidth: 650 },
  tableCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.lg },
  tableHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  tableTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  tableSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  refresh: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, height: 38, justifyContent: 'center', width: 38 },
  table: { minWidth: 820 },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 62 },
  headerRow: { backgroundColor: colors.surfaceMuted, borderBottomWidth: 0, borderRadius: radius.sm, minHeight: 42 },
  cell: { color: colors.text, fontSize: 12, lineHeight: 17, paddingHorizontal: spacing.sm },
  headerText: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  dateCell: { width: 155 },
  actorCell: { width: 165 },
  actorText: { fontWeight: '900' },
  activityCell: { flex: 1, minWidth: 370 },
  entityCell: { width: 120 },
  noRows: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
  error: { color: colors.error, fontSize: 12 },
});
