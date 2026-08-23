import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

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

function getMetricDescription(metric: CareMetric, total: number): string {
  if (metric === 'feeding') return `${total} ${total === 1 ? 'toma registrada' : 'tomas registradas'}`;
  if (metric === 'diaper') return `${total} ${total === 1 ? 'cambio registrado' : 'cambios registrados'}`;
  return `${formatSummaryDuration(total)} de sueño registrado`;
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

export function CareTrendChart({ period, points, summary }: CareTrendChartProps) {
  const { width } = useWindowDimensions();
  const [metric, setMetric] = useState<CareMetric>('feeding');
  const chartWidth = Math.min(Math.max(width - 80, 280), 820);
  const chartHeight = width < 480 ? 190 : 220;
  const values = points.map((point) => getValue(point, metric));
  const maximum = Math.max(...values, 1);
  const plotLeft = 22;
  const plotRight = chartWidth - 12;
  const plotTop = 12;
  const plotBottom = chartHeight - 34;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const slotWidth = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.max(3, Math.min(slotWidth * 0.62, 34));
  const total = values.reduce((sum, value) => sum + value, 0);
  const metricDescription = getMetricDescription(metric, total);
  const accessibilitySummary = `${metricDescription}. ${summarizeCareTrend(summary, period)}`;
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

      <View
        accessibilityLabel={accessibilitySummary}
        accessibilityRole="image"
        accessible
        style={styles.chart}
      >
        <Svg height={chartHeight} width={chartWidth}>
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
            const height = value === 0 ? 2 : Math.max(5, (value / maximum) * plotHeight);
            const x = plotLeft + index * slotWidth + (slotWidth - barWidth) / 2;
            const y = plotBottom - height;

            return (
              <Rect
                fill={metric === 'feeding' ? colors.coral : metric === 'diaper' ? colors.butter : colors.lavender}
                height={height}
                key={point.startedAt}
                opacity={value === 0 ? 0.24 : 0.9}
                rx={Math.min(5, barWidth / 2)}
                width={barWidth}
                x={x}
                y={y}
              />
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
      <Text style={styles.accessibleSummary}>{accessibilitySummary}</Text>
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
  metricSelector: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
}));
