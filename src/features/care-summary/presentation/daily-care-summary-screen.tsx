import {
  BabyIcon,
  Milk,
  Moon,
  NotebookPen,
  RefreshCw,
  Scale,
  Star,
  TrendingUp,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CareSummaryRepository } from '@/features/care-summary/application/care-summary-repository';
import {
  createCareSummaryRange,
  formatWeightGrams,
  formatSummaryDuration,
  getCareSummaryPeriodLabel,
  type CareSummaryPeriod,
  type CareSummaryReport,
  type DailyCareSummary,
} from '@/features/care-summary/domain/daily-care-summary';
import { CareTrendChart } from '@/features/care-summary/presentation/care-trend-chart';
import { CareRecordViewTabs } from '@/features/care-summary/presentation/care-record-view-tabs';
import { MeasurementEvolutionChart } from '@/features/care-summary/presentation/measurement-evolution-chart';
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
  const accentColor = colors[accent];

  return (
    <View style={[styles.card, { borderTopColor: accentColor }]}>
      <View style={styles.cardHeading}>
        <View
          style={[styles.cardIcon, { backgroundColor: `${accentColor}22` }]}
        >
          <Icon color={accentColor} size={16} />
        </View>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardDetail}>{detail}</Text>
    </View>
  );
}

function formatLength(millimeters: number): string {
  return `${new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 1,
  }).format(millimeters / 10)} cm`;
}

function getMeasurementValue(summary: DailyCareSummary): string {
  const measurement = summary.latestMeasurement;

  if (!measurement) return 'Sin medidas';
  if (measurement.weightGrams !== undefined) return formatWeightGrams(measurement.weightGrams);
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
  const [period, setPeriod] = useState<CareSummaryPeriod>('24h');
  const [report, setReport] = useState<CareSummaryReport>();
  const [isLoading, setIsLoading] = useState(Boolean(babyId));
  const [error, setError] = useState<string>();
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let active = true;

    if (!babyId) return () => { active = false; };

    void repository
      .loadReport({ babyId, ...createCareSummaryRange(period) })
      .then((result) => {
        if (!active) return;
        setReport(result);
        setError(undefined);
      })
      .catch(() => {
        if (active) setError('No pudimos preparar el resumen y sus tendencias.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [babyId, loadVersion, period, repository]);

  useEffect(() => {
    if (!babyId) return;
    return repository.subscribe(babyId, () => setLoadVersion((value) => value + 1));
  }, [babyId, repository]);

  const summary = report?.summary;
  const periodLabel = getCareSummaryPeriodLabel(period);
  const feedingDetail = summary?.feeding.count
    ? summary.feeding.knownAmountCount > 0
      ? `${summary.feeding.totalAmountMilliliters} ml registrados en ${summary.feeding.knownAmountCount} tomas.`
      : 'Las tomas no incluyen una cantidad en mililitros.'
    : `Todavía no hay tomas registradas en ${periodLabel}.`;
  const feedingInterval = summary?.feeding.averageIntervalMinutes
    ? ` Intervalo medio: ${formatSummaryDuration(summary.feeding.averageIntervalMinutes)}.`
    : '';
  const diaperDetail = summary?.diaper.total
    ? `${summary.diaper.wet} pipí · ${summary.diaper.dirty} caca · ${summary.diaper.both} mixtos.`
    : `Todavía no hay cambios registrados en ${periodLabel}.`;

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
              <Text style={styles.eyebrow}>Resumen y tendencias</Text>
              <Text style={[styles.title, compact && styles.titleCompact]}>
                Así va el día de {babyName ?? 'tu bebé'}
              </Text>
              <Text style={styles.subtitle}>
                Consulta las últimas 24 horas, los últimos días y el crecimiento desde el nacimiento.
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
              <View accessibilityRole="tablist" style={styles.periodSelector}>
                {([
                  { label: '24 h', value: '24h' },
                  { label: '7 días', value: '7d' },
                  { label: '30 días', value: '30d' },
                ] satisfies { label: string; value: CareSummaryPeriod }[]).map((option) => {
                  const selected = option.value === period;
                  return (
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      key={option.value}
                      onPress={() => {
                        setIsLoading(true);
                        setReport(undefined);
                        setPeriod(option.value);
                      }}
                      style={({ pressed }) => [
                        styles.periodButton,
                        selected && styles.periodButtonSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.periodLabel, selected && styles.periodLabelSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.sectionHeading}>
                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionTitle}>Cuidados registrados</Text>
                  <Text style={styles.sectionSubtitle}>
                    Datos de {periodLabel}
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
              {isLoading && !report ? (
                <Text style={styles.loading}>Preparando el resumen…</Text>
              ) : report && summary ? (
                <>
                  <View style={styles.cards}>
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
                      detail={summary.sleepMinutes ? 'Tiempo acumulado en los periodos registrados.' : `Todavía no hay sueño registrado en ${periodLabel}.`}
                      icon={Moon}
                      label="Sueño"
                      value={formatSummaryDuration(summary.sleepMinutes)}
                    />
                    <SummaryCard
                      accent="aqua"
                      detail={summary.noteCount ? `Notas compartidas por la familia en ${periodLabel}.` : `Todavía no hay notas registradas en ${periodLabel}.`}
                      icon={NotebookPen}
                      label="Notas"
                      value={`${summary.noteCount} ${summary.noteCount === 1 ? 'nota' : 'notas'}`}
                    />
                  </View>

                  {isLoading ? (
                    <Text accessibilityLiveRegion="polite" style={styles.loadingInline}>
                      Actualizando el periodo…
                    </Text>
                  ) : null}

                  <View style={styles.chartCard}>
                    <View style={styles.chartHeading}>
                      <View style={styles.trendIcon}>
                        <TrendingUp color={colors.primaryPressed} size={22} />
                      </View>
                      <View style={styles.chartCopy}>
                        <Text style={styles.chartTitle}>Ritmo de cuidados</Text>
                        <Text style={styles.chartSubtitle}>Compara los registros dentro del periodo seleccionado.</Text>
                      </View>
                    </View>
                    <CareTrendChart
                      period={period}
                      points={report.trend}
                      summary={summary}
                    />
                  </View>

                  <View style={styles.chartCard}>
                    <View style={styles.chartHeading}>
                      <View style={styles.measurementIcon}>
                        <Scale color={colors.primaryPressed} size={22} />
                      </View>
                      <View style={styles.chartCopy}>
                        <Text style={styles.chartTitle}>Evolución desde el nacimiento</Text>
                        <Text style={styles.chartSubtitle}>Peso, longitud y perímetro según las medidas registradas.</Text>
                      </View>
                    </View>
                    <MeasurementEvolutionChart points={report.measurements} />
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderTopWidth: 5,
    flex: 1,
    gap: spacing.sm,
    minWidth: 220,
    padding: spacing.lg,
  },
  cardDetail: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  cardHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  cardIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  cardLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  cardValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  chartCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.lg },
  chartCopy: { flex: 1, gap: spacing.xs },
  chartHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  chartSubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  chartTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  content: { gap: spacing.xl, maxWidth: 920, width: '100%' },
  disclaimer: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.xxl },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  error: { color: colors.error, fontSize: 12 },
  eyebrow: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  hero: { alignItems: 'center', backgroundColor: colors.sky, borderRadius: radius.lg, flexDirection: 'row', minHeight: 160, overflow: 'hidden', padding: spacing.xl },
  heroCompact: { minHeight: 140, padding: spacing.lg },
  heroCopy: { flex: 1, gap: spacing.sm },
  loading: { color: colors.textMuted, fontSize: 13, paddingVertical: spacing.xl, textAlign: 'center' },
  loadingInline: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  measurementCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.lg, padding: spacing.lg },
  measurementCopy: { flex: 1, gap: spacing.xs },
  measurementIcon: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.md, height: 52, justifyContent: 'center', width: 52 },
  measurementValue: { color: colors.text, fontSize: 21, fontWeight: '900' },
  page: { alignItems: 'center', padding: spacing.lg, paddingBottom: 96 },
  periodButton: { alignItems: 'center', borderRadius: radius.pill, flex: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: spacing.sm },
  periodButtonSelected: { backgroundColor: colors.primary },
  periodLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '900' },
  periodLabelSelected: { color: colors.onAccent },
  periodSelector: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, flexDirection: 'row', padding: spacing.xs },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  refresh: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sectionCopy: { flex: 1, gap: 2 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  sectionSubtitle: { color: colors.textMuted, fontSize: 12 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, maxWidth: 600 },
  summarySection: { gap: spacing.lg },
  trendIcon: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  titleCompact: { fontSize: 24, lineHeight: 29 },
}));
