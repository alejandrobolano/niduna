function parseDecimal(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');

  if (!normalized || !/^\d+(?:\.\d{1,3})?$/.test(normalized)) {
    return undefined;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseKilogramsToGrams(
  value: string,
  minimumKilograms = 0.3,
  maximumKilograms = 50,
): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = parseDecimal(value);

  if (
    parsed === undefined ||
    parsed < minimumKilograms ||
    parsed > maximumKilograms
  ) {
    return undefined;
  }

  return Math.round(parsed * 1000);
}

export function formatGramsAsKilogramsInput(
  weightGrams: number | undefined,
): string {
  return weightGrams === undefined
    ? ''
    : String(weightGrams / 1000).replace('.', ',');
}
