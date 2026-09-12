import {
  getCareSnapshot,
  getDurationMinutes,
} from '../../care/application/care-snapshot';
import type {
  CareDashboard,
  DiaperEvent,
  FeedingEvent,
} from '../../care/domain/care-event';

export interface CareWidgetItem {
  detail: string;
  title: string;
  value: string;
}

export interface CareWidgetSnapshot {
  babyName: string;
  diaper: CareWidgetItem;
  feeding: CareWidgetItem;
  sleep: CareWidgetItem;
  updatedAt: string;
}

const feedingLabels: Record<FeedingEvent['method'], string> = {
  breast: 'Pecho',
  expressed_milk: 'Leche extraída',
  formula: 'Fórmula',
  mixed: 'Mixta',
};

const diaperLabels: Record<DiaperEvent['condition'], string> = {
  both: 'Pipí y caca',
  dirty: 'Caca',
  wet: 'Pipí',
};

function formatClock(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function emptyItem(title: string): CareWidgetItem {
  return { detail: 'Sin registros', title, value: '—' };
}

export function createEmptyCareWidgetSnapshot(
  now = new Date(),
): CareWidgetSnapshot {
  return {
    babyName: 'Abre Niduna',
    diaper: emptyItem('Pañal'),
    feeding: emptyItem('Alimentación'),
    sleep: emptyItem('Sueño'),
    updatedAt: now.toISOString(),
  };
}

export function createCareWidgetSnapshot(
  dashboard: CareDashboard,
  now = new Date(),
): CareWidgetSnapshot {
  const snapshot = getCareSnapshot(dashboard.events);
  const feeding = snapshot.latestFeeding;
  const diaper = snapshot.latestDiaper;
  const openSleep = snapshot.openSleep;
  const finishedSleep = snapshot.latestFinishedSleep;

  return {
    babyName: dashboard.baby.name,
    feeding: feeding
      ? {
          detail: [
            feedingLabels[feeding.method],
            feeding.amountMilliliters
              ? `${feeding.amountMilliliters} ml`
              : undefined,
          ]
            .filter(Boolean)
            .join(' · '),
          title: 'Alimentación',
          value: formatClock(feeding.occurredAt),
        }
      : emptyItem('Alimentación'),
    diaper: diaper
      ? {
          detail: diaperLabels[diaper.condition],
          title: 'Pañal',
          value: formatClock(diaper.occurredAt),
        }
      : emptyItem('Pañal'),
    sleep: openSleep
      ? {
          detail: `Desde ${formatClock(openSleep.occurredAt)}`,
          title: 'Sueño',
          value: 'Durmiendo',
        }
      : finishedSleep?.endedAt
        ? {
            detail: `Duró ${formatDuration(
              getDurationMinutes(
                finishedSleep.occurredAt,
                finishedSleep.endedAt,
              ),
            )}`,
            title: 'Sueño',
            value: formatClock(finishedSleep.endedAt),
          }
        : emptyItem('Sueño'),
    updatedAt: now.toISOString(),
  };
}

export function parseCareWidgetSnapshot(
  value: string | null,
): CareWidgetSnapshot | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('babyName' in parsed) ||
      typeof parsed.babyName !== 'string' ||
      !('updatedAt' in parsed) ||
      typeof parsed.updatedAt !== 'string'
    ) {
      return undefined;
    }

    const feeding = 'feeding' in parsed ? parsed.feeding : undefined;
    const diaper = 'diaper' in parsed ? parsed.diaper : undefined;
    const sleep = 'sleep' in parsed ? parsed.sleep : undefined;

    if (
      !isCareWidgetItem(feeding) ||
      !isCareWidgetItem(diaper) ||
      !isCareWidgetItem(sleep)
    ) {
      return undefined;
    }

    return {
      babyName: parsed.babyName,
      diaper,
      feeding,
      sleep,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return undefined;
  }
}

function isCareWidgetItem(value: unknown): value is CareWidgetItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'detail' in value &&
    typeof value.detail === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'value' in value &&
    typeof value.value === 'string'
  );
}
