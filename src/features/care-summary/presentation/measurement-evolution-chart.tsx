import { useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import {
  formatWeightGrams,
  summarizeMeasurementEvolution,
  type MeasurementTrendPoint,
} from '@/features/care-summary/domain/daily-care-summary';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

type MeasurementMetric = 'weight' | 'length' | 'head';

interface MeasurementEvolutionChartProps {
  points: MeasurementTrendPoint[];
}

const metrics = [
  { label: 'Peso', value: 'weight' },
  { label: 'Longitud', value: 'length' },
  { label: 'Perímetro', value: 'head' },
] satisfies { label: string; value: MeasurementMetric }[];

function getValue(point: MeasurementTrendPoint, metric: MeasurementMetric): number | undefined {
  if (metric === 'weight') return point.weightGrams;
  if (metric === 'length') return point.lengthMillimeters;
  return point.headCircumferenceMillimeters;
}

function formatValue(value: number, metric: MeasurementMetric): string {
  if (metric === 'weight') return formatWeightGrams(value);
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value / 10)} cm`;
}

function getMetricSummary(
  metric: MeasurementMetric,
  points: MeasurementTrendPoint[],
): string {
  const values = points
    .map((point) => getValue(point, metric))
    .filter((value): value is number => value !== undefined);
  const metricLabel = metrics.find((option) => option.value === metric)?.label.toLocaleLowerCase('es-ES');

  if (values.length === 0) return `Todavía no hay registros de ${metricLabel}.`;
  if (values.length === 1) return `Solo hay un registro de ${metricLabel}: ${formatValue(values[0], metric)}.`;

  return `${metrics.find((option) => option.value === metric)?.label}: de ${formatValue(values[0], metric)} a ${formatValue(values.at(-1)!, metric)} entre la primera y la última medida.`;
}

export function MeasurementEvolutionChart({ points }: MeasurementEvolutionChartProps) {
  const { width } = useWindowDimensions();
  const availableMetrics = useMemo(
    () => metrics.filter((metric) => points.some((point) => getValue(point, metric.value) !== undefined)),
    [points],
  );
  const [selectedMetric, setSelectedMetric] = useState<MeasurementMetric>('weight');
  const metric = availableMetrics.some((option) => option.value === selectedMetric)
    ? selectedMetric
    : availableMetrics[0]?.value ?? 'weight';
  const values = points
    .map((point) => ({ point, value: getValue(point, metric) }))
    .filter((item): item is { point: MeasurementTrendPoint; value: number } => item.value !== undefined);
  const chartWidth = Math.min(Math.max(width - 80, 280), 820);
  const chartHeight = width < 480 ? 190 : 220;
  const plotLeft = 34;
  const plotRight = chartWidth - 18;
  const plotTop = 18;
  const plotBottom = chartHeight - 34;
  const rawMinimum = values.length > 0
    ? Math.min(...values.map((item) => item.value))
    : 0;
  const rawMaximum = values.length > 0
    ? Math.max(...values.map((item) => item.value))
    : 1;
  const padding = values.length > 0
    ? Math.max((rawMaximum - rawMinimum) * 0.12, rawMaximum * 0.02, 1)
    : 0;
  const minimum = values.length > 0
    ? Math.min(...values.map((item) => item.value)) - padding
    : 0;
  const maximum = values.length > 0
    ? Math.max(...values.map((item) => item.value)) + padding
    : 1;
  const valueRange = Math.max(maximum - minimum, 1);
  const firstTimestamp = values[0]
    ? new Date(values[0].point.measuredAt).getTime()
    : 0;
  const lastTimestamp = values.at(-1)
    ? new Date(values.at(-1)!.point.measuredAt).getTime()
    : firstTimestamp;
  const timeRange = Math.max(lastTimestamp - firstTimestamp, 1);
  const coordinates = values.map((item) => ({
    item,
    x: plotLeft + (
      values.length === 1
        ? 0.5
        : (new Date(item.point.measuredAt).getTime() - firstTimestamp) / timeRange
    ) * (plotRight - plotLeft),
    y: plotBottom - ((item.value - minimum) / valueRange) * (plotBottom - plotTop),
  }));
  const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');
  const metricSummary = getMetricSummary(metric, points);
  const accessibilitySummary = `${metricSummary} ${summarizeMeasurementEvolution(points)}`;

  return (
    <View style={styles.container}>
      {availableMetrics.length > 0 ? (
        <View accessibilityRole="tablist" style={styles.metricSelector}>
          {availableMetrics.map((option) => {
            const selected = option.value === metric;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={option.value}
                onPress={() => setSelectedMetric(option.value)}
                style={({ pressed }) => [
                  styles.metricButton,
                  selected && styles.metricButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.metricLabel, selected && styles.metricLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View
        accessibilityLabel={accessibilitySummary}
        accessibilityRole="image"
        accessible
        style={styles.chart}
      >
        {coordinates.length > 0 ? (
          <Svg height={chartHeight} width={chartWidth}>
            <Line stroke={colors.border} strokeWidth={1} x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} />
            {coordinates.length > 1 ? (
              <Polyline
                fill="none"
                points={linePoints}
                stroke={colors.aqua}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={4}
              />
            ) : null}
            {coordinates.map(({ item, x, y }, index) => (
              <Circle
                cx={x}
                cy={y}
                fill={colors.surface}
                key={`${item.point.measuredAt}-${index}`}
                r={5}
                stroke={colors.aqua}
                strokeWidth={3}
              />
            ))}
            {coordinates.length > 0 ? (
              <>
                <SvgText fill={colors.textMuted} fontSize={10} textAnchor="start" x={plotLeft} y={chartHeight - 10}>
                  Primera
                </SvgText>
                <SvgText fill={colors.textMuted} fontSize={10} textAnchor="end" x={plotRight} y={chartHeight - 10}>
                  Última
                </SvgText>
              </>
            ) : null}
          </Svg>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>Registra una medida para empezar a ver la evolución.</Text>
          </View>
        )}
      </View>
      <Text style={styles.accessibleSummary}>{accessibilitySummary}</Text>
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  accessibleSummary: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  chart: { alignItems: 'center', overflow: 'hidden', width: '100%' },
  container: { gap: spacing.md },
  emptyChart: { alignItems: 'center', height: 150, justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  metricButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.xs,
  },
  metricButtonSelected: { backgroundColor: colors.surface },
  metricLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  metricLabelSelected: { color: colors.text },
  metricSelector: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
}));
