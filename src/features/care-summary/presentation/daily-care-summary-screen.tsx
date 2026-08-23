import {
  BabyIcon,
  Milk,
  Moon,
  NotebookPen,
  RefreshCw,
  Scale,
  Star,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CareSummaryRepository } from '@/features/care-summary/application/care-summary-repository';
import {
  createLocalDayRange,
  formatSummaryDuration,
  type DailyCareSummary,
} from '@/features/care-summary/domain/daily-care-summary';
import { CareRecordViewTabs } from '@/features/care-summary/presentation/care-record-view-tabs';
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface DailyCareSummaryScreenProps {
  babyId?: string;
  babyName?: string;
  onOpenHistory: () => void;
  repository: CareSummaryRepository;
  topContent?: ReactNode;
}

interface SummaryCardProps {
  accent: 'aqua' | 'butter' | 'coral' | 'lavender';
  detail: string;
  icon: typeof Milk;
  label: string;
  value: string;
}

function SummaryCard({ accent, detail, icon: Icon, label, value }: SummaryCardProps) {
  return (
    <View style={[styles.card, styles[`${accent}Card`]]}>
      <View style={[styles.cardIcon, styles[`${accent}Icon`]]}>
        <Icon color={colors.text} size={20} />
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardDetail}>{detail}</Text>
    </View>
  );
}

function formatWeight(grams: number): string {
  return `${new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3,
  }).format(grams / 1000)} kg`;
}

function formatLength(millimeters: number): string {
  return `${new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 1,
  }).format(millimeters / 10)} cm`;
}

function getMeasurementValue(summary: DailyCareSummary): string {
  const measurement = summary.latestMeasurement;

  if (!measurement) return 'Sin medidas';
  if (measurement.weightGrams !== undefined) return formatWeight(measurement.weightGrams);
  if (measurement.lengthMillimeters !== undefined) return formatLength(measurement.lengthMillimeters);
  if (measurement.headCircumferenceMillimeters !== undefined) {
    return `PC ${formatLength(measurement.headCircumferenceMillimeters)}`;
  }

  return 'Medida registrada';
}

function getMeasurementDetail(summary: DailyCareSummary): string {
  if (!summary.latestMeasurement) return 'Añádela desde Relevo cuando corresponda.';

  return `Última actualización: ${new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
  }).format(new Date(summary.latestMeasurement.measuredAt))}`;
}

export function DailyCareSummaryScreen({
  babyId,
  babyName,
  onOpenHistory,
  repository,
  topContent,
}: DailyCareSummaryScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [summary, setSummary] = useState<DailyCareSummary>();
  const [isLoading, setIsLoading] = useState(Boolean(babyId));
  const [error, setError] = useState<string>();
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let active = true;

    if (!babyId) return () => { active = false; };

    void repository
      .loadDaily({ babyId, ...createLocalDayRange() })
      .then((result) => {
        if (!active) return;
        setSummary(result);
        setError(undefined);
      })
      .catch(() => {
        if (active) setError('No pudimos preparar el resumen de hoy.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [babyId, loadVersion, repository]);

  useEffect(() => {
    if (!babyId) return;
    return repository.subscribe(babyId, () => setLoadVersion((value) => value + 1));
  }, [babyId, repository]);

  const feedingDetail = summary?.feeding.count
    ? summary.feeding.knownAmountCount > 0
      ? `${summary.feeding.totalAmountMilliliters} ml registrados en ${summary.feeding.knownAmountCount} tomas.`
      : 'Las tomas no incluyen una cantidad en mililitros.'
    : 'Todavía no hay tomas registradas hoy.';
  const feedingInterval = summary?.feeding.averageIntervalMinutes
    ? ` Intervalo medio: ${formatSummaryDuration(summary.feeding.averageIntervalMinutes)}.`
    : '';
  const diaperDetail = summary?.diaper.total
    ? `${summary.diaper.wet} pipí · ${summary.diaper.dirty} caca · ${summary.diaper.both} mixtos.`
    : 'Todavía no hay cambios registrados hoy.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          {topContent}
          <CareRecordViewTabs
            onChange={(view) => {
              if (view === 'history') onOpenHistory();
            }}
            value="summary"
          />
          <View style={[styles.hero, compact && styles.heroCompact]}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>Resumen de hoy</Text>
              <Text style={[styles.title, compact && styles.titleCompact]}>
                Así va el día de {babyName ?? 'tu bebé'}
              </Text>
              <Text style={styles.subtitle}>
                Una lectura rápida de lo registrado por la familia desde las 00:00.
              </Text>
            </View>
            <NuniMascot size={compact ? 82 : 116} />
          </View>

          {!babyId ? (
            <View style={styles.empty}>
              <Star color={colors.butter} size={34} />
              <Text style={styles.emptyTitle}>Selecciona un bebé</Text>
              <Text style={styles.emptyText}>El resumen pertenece al bebé activo.</Text>
            </View>
          ) : (
            <View style={styles.summarySection}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionTitle}>Cuidados registrados</Text>
                  <Text style={styles.sectionSubtitle}>
                    {new Intl.DateTimeFormat('es-ES', { dateStyle: 'full' }).format(new Date())}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Actualizar resumen"
                  accessibilityRole="button"
                  disabled={isLoading}
                  onPress={() => {
                    setIsLoading(true);
                    setLoadVersion((value) => value + 1);
                  }}
                  style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
                >
                  <RefreshCw color={colors.primaryPressed} size={19} />
                </Pressable>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {isLoading && !summary ? (
                <Text style={styles.loading}>Preparando el resumen…</Text>
              ) : summary ? (
                <>
                  <View style={[styles.cards, compact && styles.cardsCompact]}>
                    <SummaryCard
                      accent="coral"
                      detail={`${feedingDetail}${feedingInterval}`}
                      icon={Milk}
                      label="Alimentación"
                      value={`${summary.feeding.count} ${summary.feeding.count === 1 ? 'toma' : 'tomas'}`}
                    />
                    <SummaryCard
                      accent="butter"
                      detail={diaperDetail}
                      icon={BabyIcon}
                      label="Pañales"
                      value={`${summary.diaper.total} ${summary.diaper.total === 1 ? 'cambio' : 'cambios'}`}
                    />
                    <SummaryCard
                      accent="lavender"
                      detail={summary.sleepMinutes ? 'Tiempo acumulado en los periodos registrados.' : 'Todavía no hay sueño registrado hoy.'}
                      icon={Moon}
                      label="Sueño"
                      value={formatSummaryDuration(summary.sleepMinutes)}
                    />
                    <SummaryCard
                      accent="aqua"
                      detail={summary.noteCount ? 'Notas compartidas por la familia durante el día.' : 'Todavía no hay notas registradas hoy.'}
                      icon={NotebookPen}
                      label="Notas"
                      value={`${summary.noteCount} ${summary.noteCount === 1 ? 'nota' : 'notas'}`}
                    />
                  </View>

                  <View style={styles.measurementCard}>
                    <View style={styles.measurementIcon}>
                      <Scale color={colors.primaryPressed} size={23} />
                    </View>
                    <View style={styles.measurementCopy}>
                      <Text style={styles.cardLabel}>Última medida</Text>
                      <Text style={styles.measurementValue}>{getMeasurementValue(summary)}</Text>
                      <Text style={styles.cardDetail}>{getMeasurementDetail(summary)}</Text>
                    </View>
                  </View>

                  <Text style={styles.disclaimer}>
                    Este resumen refleja únicamente los registros introducidos en Niduna; no evalúa la salud del bebé.
                  </Text>
                </>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  aquaCard: { borderTopColor: colors.aqua },
  aquaIcon: { backgroundColor: colors.aquaSoft },
  butterCard: { borderTopColor: colors.butter },
  butterIcon: { backgroundColor: colors.butterSoft },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderTopWidth: 4,
    flex: 1,
    gap: spacing.sm,
    minHeight: 190,
    minWidth: 190,
    padding: spacing.lg,
  },
  cardDetail: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  cardIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  cardValue: { color: colors.text, fontSize: 24, fontWeight: '900', lineHeight: 29 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cardsCompact: { flexDirection: 'column' },
  content: { gap: spacing.xl, maxWidth: 920, width: '100%' },
  coralCard: { borderTopColor: colors.coral },
  coralIcon: { backgroundColor: colors.peach },
  disclaimer: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.xxl },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  error: { color: colors.error, fontSize: 12 },
  eyebrow: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  hero: { alignItems: 'center', backgroundColor: colors.sky, borderRadius: radius.lg, flexDirection: 'row', minHeight: 160, overflow: 'hidden', padding: spacing.xl },
  heroCompact: { minHeight: 140, padding: spacing.lg },
  heroCopy: { flex: 1, gap: spacing.sm },
  lavenderCard: { borderTopColor: colors.lavender },
  lavenderIcon: { backgroundColor: colors.lavenderSoft },
  loading: { color: colors.textMuted, fontSize: 13, paddingVertical: spacing.xl, textAlign: 'center' },
  measurementCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.lg, padding: spacing.lg },
  measurementCopy: { flex: 1, gap: spacing.xs },
  measurementIcon: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.md, height: 52, justifyContent: 'center', width: 52 },
  measurementValue: { color: colors.text, fontSize: 21, fontWeight: '900' },
  page: { alignItems: 'center', padding: spacing.lg, paddingBottom: 96 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  refresh: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sectionCopy: { flex: 1, gap: 2 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  sectionSubtitle: { color: colors.textMuted, fontSize: 12 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, maxWidth: 600 },
  summarySection: { gap: spacing.lg },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  titleCompact: { fontSize: 24, lineHeight: 29 },
}));
