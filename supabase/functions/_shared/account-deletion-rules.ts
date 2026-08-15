export interface AuthenticationMethodReference {
  method?: string;
  timestamp?: number;
}

export interface DeleteAccountRequest {
  deleteOwnedFamilies: boolean;
}

export function parseDeleteAccountRequest(value: unknown): DeleteAccountRequest | undefined {
  if (value === undefined || value === null) {
    return { deleteOwnedFamilies: false };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const keys = Object.keys(value);
  if (keys.some((key) => key !== 'deleteOwnedFamilies')) {
    return undefined;
  }

  const deleteOwnedFamilies = (value as Record<string, unknown>).deleteOwnedFamilies;
  if (deleteOwnedFamilies !== undefined && typeof deleteOwnedFamilies !== 'boolean') {
    return undefined;
  }

  return { deleteOwnedFamilies: deleteOwnedFamilies === true };
}

export function chunkValues<T>(values: T[], maximumChunkSize: number): T[][] {
  if (!Number.isInteger(maximumChunkSize) || maximumChunkSize < 1) {
    throw new Error('invalid_chunk_size');
  }

  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += maximumChunkSize) {
    chunks.push(values.slice(index, index + maximumChunkSize));
  }

  return chunks;
}

export function hasRecentOtpAuthentication(
  methods: AuthenticationMethodReference[] | undefined,
  nowSeconds: number,
  maximumAgeSeconds: number,
): boolean {
  const latestOtpTimestamp = Math.max(
    ...(methods ?? [])
      .filter((method) => method.method === 'otp')
      .map((method) => method.timestamp)
      .filter((timestamp): timestamp is number => typeof timestamp === 'number'),
    0,
  );

  if (latestOtpTimestamp === 0) {
    return false;
  }

  const ageSeconds = nowSeconds - latestOtpTimestamp;
  return ageSeconds >= -30 && ageSeconds <= maximumAgeSeconds;
}
