import { getDurationMinutes } from './care-snapshot';
import type { CareEvent } from '../domain/care-event';
import { formatFeedingVolume, type FeedingVolumeUnit } from '../domain/feeding-volume';

export const careEventLabels: Record<CareEvent['type'], string> = {
  diaper: 'Pañal',
  feeding: 'Alimentación',
  measurement: 'Medidas',
  note: 'Nota',
  sleep: 'Sueño',
};

export function describeCareEvent(event: CareEvent, volumeUnit: FeedingVolumeUnit = 'ml'): string {
  if (event.type === 'feeding') {
    const method = event.method === 'breast'
      ? 'Pecho'
      : event.method === 'formula'
        ? 'Fórmula'
        : event.method === 'mixed'
          ? 'Pecho + fórmula'
          : 'Leche extraída';

    return [
      method,
      event.amountMilliliters ? formatFeedingVolume(event.amountMilliliters, volumeUnit) : undefined,
      event.notes,
    ].filter(Boolean).join(' · ');
  }

  if (event.type === 'diaper') {
    const condition = event.condition === 'wet'
      ? 'Pipí'
      : event.condition === 'dirty'
        ? 'Caca'
        : 'Pipí y caca';

    return [condition, event.notes].filter(Boolean).join(' · ');
  }

  if (event.type === 'sleep') {
    return event.endedAt
      ? `${getDurationMinutes(event.occurredAt, event.endedAt)} min`
      : 'Sueño en curso';
  }

  if (event.type === 'note') return event.content;

  return [
    event.weightGrams !== undefined
      ? `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3 }).format(event.weightGrams / 1000)} kg`
      : undefined,
    event.lengthMillimeters !== undefined
      ? `${event.lengthMillimeters / 10} cm`
      : undefined,
    event.headCircumferenceMillimeters !== undefined
      ? `PC ${event.headCircumferenceMillimeters / 10} cm`
      : undefined,
    event.notes,
  ].filter(Boolean).join(' · ');
}
