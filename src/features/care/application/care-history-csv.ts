import { toLocalDateKey } from './care-history';
import { getDurationMinutes } from './care-snapshot';
import type { CareEvent } from '../domain/care-event';

const feedingLabels = {
  breast: 'Pecho',
  expressed_milk: 'Leche extraída',
  formula: 'Fórmula',
  mixed: 'Mixta',
} as const;

const breastSideLabels = {
  both: 'Ambos',
  left: 'Izquierdo',
  right: 'Derecho',
} as const;

const diaperLabels = {
  both: 'Pipí y caca',
  dirty: 'Caca',
  wet: 'Pipí',
} as const;

function toLocalTime(value: string): string {
  const date = new Date(value);
  return [date.getHours(), date.getMinutes()]
    .map((part) => part.toString().padStart(2, '0'))
    .join(':');
}

function protectSpreadsheetCell(value: string): string {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function escapeCell(value: string | number | undefined): string {
  const protectedValue = protectSpreadsheetCell(
    value === undefined ? '' : String(value),
  );
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

function getEventColumns(event: CareEvent): (string | number | undefined)[] {
  if (event.type === 'feeding') {
    return [
      'Alimentación',
      feedingLabels[event.method],
      event.amountMilliliters,
      event.breastSide ? breastSideLabels[event.breastSide] : undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ];
  }

  if (event.type === 'diaper') {
    return [
      'Pañal',
      diaperLabels[event.condition],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ];
  }

  if (event.type === 'note') {
    return [
      'Nota',
      event.content,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ];
  }

  if (event.type === 'measurement') {
    return [
      'Medidas',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      event.weightGrams !== undefined ? event.weightGrams / 1000 : undefined,
      event.lengthMillimeters !== undefined
        ? event.lengthMillimeters / 10
        : undefined,
      event.headCircumferenceMillimeters !== undefined
        ? event.headCircumferenceMillimeters / 10
        : undefined,
      event.source,
    ];
  }

  return [
    'Sueño',
    event.endedAt ? 'Terminado' : 'En curso',
    undefined,
    undefined,
    toLocalTime(event.occurredAt),
    event.endedAt ? toLocalTime(event.endedAt) : undefined,
    event.endedAt
      ? getDurationMinutes(event.occurredAt, event.endedAt)
      : undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  ];
}

export function createCareHistoryCsv(events: CareEvent[]): string {
  const headers = [
    'Fecha',
    'Hora',
    'Tipo',
    'Detalle',
    'Cantidad (ml)',
    'Lado',
    'Inicio del sueño',
    'Fin del sueño',
    'Duración (min)',
    'Peso (kg)',
    'Longitud/altura (cm)',
    'Perímetro cefálico (cm)',
    'Origen de la medida',
    'Notas',
    'Registrado por',
  ];
  const rows = events.map((event) => [
    toLocalDateKey(event.occurredAt),
    toLocalTime(event.occurredAt),
    ...getEventColumns(event),
    event.notes,
    event.recordedByName,
  ]);

  return `\uFEFF${[headers, ...rows]
    .map((row) => row.map(escapeCell).join(';'))
    .join('\r\n')}`;
}

export function createCareHistoryFileName(
  babyName: string,
  date = new Date(),
): string {
  const safeName =
    babyName
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-|-$/g, '') || 'bebe';

  return `niduna-${safeName}-${toLocalDateKey(date)}.csv`;
}
