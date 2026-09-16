import type {
  CareSummaryComparison,
  CareSummaryMetricComparison,
} from '../domain/daily-care-summary';
import { formatSummaryDuration } from '../domain/daily-care-summary';

const maximumObservations = 4;

function describeCountChange(
  comparison: CareSummaryMetricComparison,
  singular: string,
  plural: string,
): string | undefined {
  if (comparison.delta === 0) return undefined;

  const difference = Math.abs(comparison.delta);
  const label = difference === 1 ? singular : plural;
  return `Se registraron ${difference} ${label} ${comparison.delta > 0 ? 'más' : 'menos'} que en el periodo anterior.`;
}

function describeSleepChange(
  comparison: CareSummaryMetricComparison,
): string | undefined {
  if (comparison.delta === 0) return undefined;

  return `Se registraron ${formatSummaryDuration(Math.abs(comparison.delta))} de sueño ${comparison.delta > 0 ? 'más' : 'menos'} que en el periodo anterior.`;
}

function joinNaturalLanguage(parts: string[]): string {
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`;
}

function describeDiaperTypeChange(
  comparison: CareSummaryMetricComparison,
  singular: string,
  plural: string,
): string | undefined {
  if (comparison.delta === 0) return undefined;

  const difference = Math.abs(comparison.delta);
  const label = difference === 1 ? singular : plural;
  return `${difference} ${label} ${comparison.delta > 0 ? 'más' : 'menos'}`;
}

function describeDiaperChange(
  comparison: CareSummaryComparison['diaper'],
): string | undefined {
  const breakdown = [
    describeDiaperTypeChange(comparison.wet, 'de pipí', 'de pipí'),
    describeDiaperTypeChange(comparison.dirty, 'de caca', 'de caca'),
    describeDiaperTypeChange(comparison.both, 'mixto', 'mixtos'),
  ].filter((part): part is string => Boolean(part));

  if (comparison.total.delta === 0) {
    return breakdown.length > 0
      ? `El total de cambios de pañal se mantiene, pero cambió el tipo registrado: ${joinNaturalLanguage(breakdown)}.`
      : undefined;
  }

  const totalDifference = Math.abs(comparison.total.delta);
  const totalLabel = totalDifference === 1 ? 'cambio de pañal' : 'cambios de pañal';
  const totalDescription = `Se registraron ${totalDifference} ${totalLabel} ${comparison.total.delta > 0 ? 'más' : 'menos'} que en el periodo anterior`;

  return breakdown.length > 0
    ? `${totalDescription}: ${joinNaturalLanguage(breakdown)}.`
    : `${totalDescription}.`;
}

function describeFeedingAmountChange(
  comparison: CareSummaryComparison['feedingAmountMilliliters'],
): string | undefined {
  if (
    comparison.delta === 0 ||
    comparison.currentKnownCount === 0 ||
    comparison.previousKnownCount === 0
  ) {
    return undefined;
  }

  return `En las tomas con cantidad indicada se registraron ${Math.abs(comparison.delta)} ml ${comparison.delta > 0 ? 'más' : 'menos'}.`;
}

function describeFeedingIntervalChange(
  comparison?: CareSummaryMetricComparison,
): string | undefined {
  if (!comparison || comparison.delta === 0) return undefined;

  return `El intervalo medio registrado entre tomas fue ${formatSummaryDuration(Math.abs(comparison.delta))} ${comparison.delta > 0 ? 'mayor' : 'menor'}.`;
}

function hasRecordedData(comparison: CareSummaryComparison): boolean {
  return [
    comparison.feedingCount,
    comparison.diaper.total,
    comparison.sleepMinutes,
    comparison.noteCount,
  ].some(({ current, previous }) => current > 0 || previous > 0);
}

export function createCareSummaryObservations(
  comparison: CareSummaryComparison,
): string[] {
  if (!hasRecordedData(comparison)) {
    return ['Aún no hay suficientes registros en ambos periodos para compararlos.'];
  }

  const observations = [
    describeCountChange(comparison.feedingCount, 'toma', 'tomas'),
    describeDiaperChange(comparison.diaper),
    describeSleepChange(comparison.sleepMinutes),
    describeFeedingAmountChange(comparison.feedingAmountMilliliters),
    describeFeedingIntervalChange(comparison.feedingIntervalMinutes),
    describeCountChange(comparison.noteCount, 'nota', 'notas'),
  ].filter((observation): observation is string => Boolean(observation));

  if (observations.length === 0) {
    return ['Los totales registrados se mantienen iguales al periodo anterior.'];
  }

  return observations.slice(0, maximumObservations);
}
