import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import type {
  CareSummaryPeriod,
  CareTrendPoint,
  DailyCareSummary,
} from '@/features/care-summary/domain/daily-care-summary';
import {
  formatSummaryDuration,
  summarizeCareTrend,
} from '@/features/care-summary/domain/daily-care-summary';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

type CareMetric = 'feeding' | 'diaper' | 'sleep';

interface CareTrendChartProps {
  period: CareSummaryPeriod;
  points: CareTrendPoint[];
  summary: DailyCareSummary;
}

const metrics = [
  { label: 'Tomas', value: 'feeding' },
  { label: 'Pañales', value: 'diaper' },
  { label: 'Sueño', value: 'sleep' },
] satisfies { label: string; value: CareMetric }[];

function getValue(point: CareTrendPoint, metric: CareMetric): number {
  if (metric === 'feeding') return point.feedingCount;
  if (metric === 'diaper') return point.diaperCount;
  return point.sleepMinutes;
}

function getSummaryValue(
  summary: DailyCareSummary,
  metric: CareMetric,
): number {
  if (metric === 'feeding') return summary.feeding.count;
  if (metric === 'diaper') return summary.diaper.total;
  return summary.sleepMinutes;
}

function getMetricDescription(metric: CareMetric, total: number): string {
  if (metric === 'feeding') return `${total} ${total === 1 ? 'toma registrada' : 'tomas registradas'}`;
  if (metric === 'diaper') return `${total} ${total === 1 ? 'cambio registrado' : 'cambios registrados'}`;
  return `${formatSummaryDuration(total)} de sueño registrado`;
}

function getBucketDescription(
  metric: CareMetric,
  period: CareSummaryPeriod,
): string {
  const unit = period === '24h' ? 'cada bloque de 4 horas' : 'cada día';

  if (metric === 'feeding') return `Cada barra muestra las tomas de ${unit}.`;
  if (metric === 'diaper') return `Cada barra muestra los cambios de ${unit}.`;
  return `Cada barra muestra el tiempo dormido en ${unit}.`;
}

function formatBucketLabel(date: Date, period: CareSummaryPeriod): string {
  if (period === '24h') {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatAxisValue(value: number, metric: CareMetric): string {
  if (metric === 'sleep') {
    if (value >= 60) return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value / 60)} h`;
    return `${Math.round(value)} min`;
  }

  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value);
}

function formatBarValue(value: number, metric: CareMetric): string {
  if (metric !== 'sleep') return String(value);
  if (value >= 60) return `${new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 1,
  }).format(value / 60)}h`;
  return `${Math.round(value)}m`;
}

export function CareTrendChart({ period, points, summary }: CareTrendChartProps) {
  const { width } = useWindowDimensions();
  const [metric, setMetric] = useState<CareMetric>('feeding');
  const [selectedPointStart, setSelectedPointStart] = useState<string>();
  const chartWidth = Math.min(Math.max(width - 80, 280), 820);
  const chartHeight = width < 480 ? 190 : 220;
  const values = points.map((point) => getValue(point, metric));
  const maximum = Math.max(...values, 0);
  const scaleMaximum = Math.max(maximum, 1);
  const plotLeft = 48;
  const plotRight = chartWidth - 12;
  const plotTop = 12;
  const plotBottom = chartHeight - 34;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const slotWidth = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.max(3, Math.min(slotWidth * 0.62, 34));
  const metricDescription = getMetricDescription(
    metric,
    getSummaryValue(summary, metric),
  );
  const bucketDescription = getBucketDescription(metric, period);
  const accessibilitySummary = `${metricDescription}. ${bucketDescription} ${summarizeCareTrend(summary, period)}`;
  const selectedPoint = points.find(
    (point) => point.startedAt === selectedPointStart,
  );
  const labelIndexes = new Set(
    points.length <= 7
      ? points.map((_, index) => index)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1],
  );

  return (
    <View style={styles.container}>
      <View accessibilityRole="tablist" style={styles.metricSelector}>
        {metrics.map((option) => {
          const selected = option.value === metric;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => setMetric(option.value)}
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

      <View style={styles.metricOverview}>
        <Text style={styles.metricOverviewLabel}>Total del periodo</Text>
        <Text style={styles.metricOverviewValue}>{metricDescription}</Text>
      </View>

      <View
        accessibilityLabel={accessibilitySummary}
        accessibilityRole="image"
        accessible
        style={styles.chart}
      >
        <Svg height={chartHeight} width={chartWidth}>
          {(maximum === 0 ? [0] : [maximum, maximum / 2, 0]).map((value, index, axisValues) => {
            const y = plotTop + (index / Math.max(axisValues.length - 1, 1)) * plotHeight;
            return (
              <G key={`axis-${value}`}>
                <Line
                  stroke={colors.border}
                  strokeDasharray={index === axisValues.length - 1 ? undefined : '4 5'}
                  strokeWidth={1}
                  x1={plotLeft}
                  x2={plotRight}
                  y1={y}
                  y2={y}
                />
                <SvgText
                  fill={colors.textMuted}
                  fontSize={9}
                  textAnchor="end"
                  x={plotLeft - 7}
                  y={y + 3}
                >
                  {formatAxisValue(value, metric)}
                </SvgText>
              </G>
            );
          })}
          <Line
            stroke={colors.border}
            strokeWidth={1}
            x1={plotLeft}
            x2={plotLeft}
            y1={plotTop}
            y2={plotBottom}
          />
          <Line
            stroke={colors.border}
            strokeWidth={1}
            x1={plotLeft}
            x2={plotRight}
            y1={plotBottom}
            y2={plotBottom}
          />
          {points.map((point, index) => {
            const value = values[index] ?? 0;
            const height = value === 0 ? 0 : Math.max(5, (value / scaleMaximum) * plotHeight);
            const x = plotLeft + index * slotWidth + (slotWidth - barWidth) / 2;
            const y = plotBottom - height;

            return (
              <G key={point.startedAt}>
                <Rect
                  fill={metric === 'feeding' ? colors.coral : metric === 'diaper' ? colors.butter : colors.lavender}
                  height={height}
                  onPress={() => setSelectedPointStart(point.startedAt)}
                  opacity={selectedPointStart === point.startedAt ? 1 : 0.9}
                  rx={Math.min(5, barWidth / 2)}
                  width={barWidth}
                  x={x}
                  y={y}
                />
                {value > 0 ? (
                  <SvgText
                    fill={colors.text}
                    fontSize={9}
                    fontWeight="800"
                    textAnchor="middle"
                    x={x + barWidth / 2}
                    y={Math.max(plotTop + 10, y - 6)}
                  >
                    {formatBarValue(value, metric)}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
          {points.map((point, index) => {
            if (!labelIndexes.has(index)) return null;
            const x = plotLeft + index * slotWidth + slotWidth / 2;
            return (
              <SvgText
                fill={colors.textMuted}
                fontSize={10}
                key={`label-${point.startedAt}`}
                textAnchor="middle"
                x={x}
                y={chartHeight - 10}
              >
                {formatBucketLabel(new Date(point.startedAt), period)}
              </SvgText>
            );
          })}
        </Svg>
      </View>
      {selectedPoint ? (
        <View accessibilityLiveRegion="polite" style={styles.selection}>
          <Text style={styles.selectionLabel}>
            {formatBucketLabel(new Date(selectedPoint.startedAt), period)}
          </Text>
          <Text style={styles.selectionValue}>
            {getMetricDescription(metric, getValue(selectedPoint, metric))}
          </Text>
        </View>
      ) : null}
      <Text style={styles.accessibleSummary}>
        {metricDescription}. {bucketDescription}
      </Text>
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  accessibleSummary: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  chart: { alignItems: 'center', overflow: 'hidden', width: '100%' },
  container: { gap: spacing.md },
  metricButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  metricButtonSelected: { backgroundColor: colors.surface },
  metricLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  metricLabelSelected: { color: colors.text },
  metricOverview: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  metricOverviewLabel: { color: colors.textMuted, fontSize: 12 },
  metricOverviewValue: { color: colors.text, fontSize: 14, fontWeight: '900' },
  metricSelector: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  selection: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  selectionValue: { color: colors.text, fontSize: 12, fontWeight: '900' },
}));
