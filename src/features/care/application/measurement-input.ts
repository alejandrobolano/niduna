import { parseKilogramsToGrams } from '@/shared/domain/weight';

function parseDecimal(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');

  if (!normalized || !/^\d+(?:\.\d{1,3})?$/.test(normalized)) {
    return undefined;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseScaledValue(
  value: string,
  scale: number,
  minimum: number,
  maximum: number,
): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = parseDecimal(value);

  if (parsed === undefined || parsed < minimum || parsed > maximum) {
    return undefined;
  }

  return Math.round(parsed * scale);
}

export function parseWeightGrams(value: string): number | undefined {
  return parseKilogramsToGrams(value);
}

export function parseLengthMillimeters(value: string): number | undefined {
  return parseScaledValue(value, 10, 20, 150);
}

export function parseHeadCircumferenceMillimeters(
  value: string,
): number | undefined {
  return parseScaledValue(value, 10, 15, 80);
}
