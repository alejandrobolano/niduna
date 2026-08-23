export interface DailyCareSummary {
  diaper: {
    both: number;
    dirty: number;
    total: number;
    wet: number;
  };
  feeding: {
    averageIntervalMinutes?: number;
    count: number;
    knownAmountCount: number;
    totalAmountMilliliters: number;
  };
  latestMeasurement?: {
    headCircumferenceMillimeters?: number;
    lengthMillimeters?: number;
    measuredAt: string;
    source?: string;
    weightGrams?: number;
  };
  noteCount: number;
  sleepMinutes: number;
}

export interface DailyCareSummaryRange {
  bucketMinutes: 240 | 1440;
  endAt: string;
  startAt: string;
}

export type CareSummaryPeriod = '24h' | '7d' | '30d';

export interface CareTrendPoint {
  diaperCount: number;
  feedingAmountMilliliters: number;
  feedingCount: number;
  noteCount: number;
  sleepMinutes: number;
  startedAt: string;
}

export interface MeasurementTrendPoint {
  headCircumferenceMillimeters?: number;
  lengthMillimeters?: number;
  measuredAt: string;
  source?: string;
  weightGrams?: number;
}

export interface CareSummaryReport {
  measurements: MeasurementTrendPoint[];
  summary: DailyCareSummary;
  trend: CareTrendPoint[];
}

export function createCareSummaryRange(
  period: CareSummaryPeriod,
  now = new Date(),
): DailyCareSummaryRange {
  const end = new Date(now);

  if (period === '24h') {
    return {
      bucketMinutes: 240,
      endAt: end.toISOString(),
      startAt: new Date(end.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const days = period === '7d' ? 7 : 30;
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - days + 1,
  );

  return {
    bucketMinutes: 1440,
    endAt: end.toISOString(),
    startAt: start.toISOString(),
  };
}

export function getCareSummaryPeriodLabel(period: CareSummaryPeriod): string {
  if (period === '24h') return 'las últimas 24 horas';
  if (period === '7d') return 'los últimos 7 días';
  return 'los últimos 30 días';
}

export function summarizeCareTrend(
  summary: DailyCareSummary,
  period: CareSummaryPeriod,
): string {
  const periodLabel = getCareSummaryPeriodLabel(period);
  const parts = [
    `${summary.feeding.count} ${summary.feeding.count === 1 ? 'toma' : 'tomas'}`,
    `${summary.diaper.total} ${summary.diaper.total === 1 ? 'cambio de pañal' : 'cambios de pañal'}`,
    `${formatSummaryDuration(summary.sleepMinutes)} de sueño registrado`,
    `${summary.noteCount} ${summary.noteCount === 1 ? 'nota' : 'notas'}`,
  ];

  return `En ${periodLabel} se registraron ${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}.`;
}

export function summarizeMeasurementEvolution(
  points: MeasurementTrendPoint[],
): string {
  if (points.length === 0) {
    return 'Todavía no hay medidas registradas desde el nacimiento.';
  }

  const firstWeight = points.find((point) => point.weightGrams !== undefined);
  const latestWeight = [...points]
    .reverse()
    .find((point) => point.weightGrams !== undefined);

  if (!firstWeight || !latestWeight) {
    return `Hay ${points.length} ${points.length === 1 ? 'medición registrada' : 'mediciones registradas'} desde el nacimiento.`;
  }

  const difference = latestWeight.weightGrams! - firstWeight.weightGrams!;
  const direction = difference === 0
    ? 'sin diferencia respecto a la primera medida'
    : `${Math.abs(difference)} g ${difference > 0 ? 'por encima' : 'por debajo'} de la primera medida`;

  return `El último peso registrado es ${formatWeightGrams(latestWeight.weightGrams!)}: ${direction}.`;
}

export function formatWeightGrams(grams: number): string {
  return `${new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3,
  }).format(grams / 1000)} kg`;
}

export function formatSummaryDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}
