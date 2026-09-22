export type FeedingVolumeUnit = 'ml' | 'us_oz';

const MILLILITERS_PER_US_FLUID_OUNCE = 29.5735295625;
const MAX_MILLILITERS = 2000;

export function formatFeedingVolume(
  milliliters: number,
  unit: FeedingVolumeUnit,
): string {
  if (unit === 'ml') {
    return `${new Intl.NumberFormat('es-ES').format(milliliters)} ml`;
  }

  const ounces = milliliters / MILLILITERS_PER_US_FLUID_OUNCE;
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(ounces)} oz`;
}

export function formatFeedingVolumeInput(
  milliliters: number | undefined,
  unit: FeedingVolumeUnit,
): string {
  if (milliliters === undefined) return '';
  const value = unit === 'ml' ? milliliters : milliliters / MILLILITERS_PER_US_FLUID_OUNCE;
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: unit === 'ml' ? 0 : 1,
    useGrouping: false,
  }).format(value);
}

export function parseFeedingVolumeInput(
  input: string,
  unit: FeedingVolumeUnit,
): number | undefined {
  const normalized = input.trim().replace(',', '.');
  if (!normalized) return undefined;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return undefined;

  const milliliters = Math.round(
    unit === 'ml' ? value : value * MILLILITERS_PER_US_FLUID_OUNCE,
  );
  return milliliters >= 1 && milliliters <= MAX_MILLILITERS
    ? milliliters
    : undefined;
}

export function getFeedingVolumeInputHint(unit: FeedingVolumeUnit): string {
  return unit === 'ml'
    ? 'Introduce una cantidad entre 1 y 2000 ml.'
    : 'Introduce una cantidad entre 0,1 y 67,6 oz.';
}

export function getFeedingVolumeUnitLabel(unit: FeedingVolumeUnit): string {
  return unit === 'ml' ? 'ml' : 'oz';
}
