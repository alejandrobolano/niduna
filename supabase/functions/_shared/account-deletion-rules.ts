export interface DeleteAccountRequest {
  confirmation: 'ELIMINAR';
  deleteOwnedFamilies: boolean;
}

export function parseDeleteAccountRequest(value: unknown): DeleteAccountRequest | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  const keys = Object.keys(value);
  if (keys.some((key) => key !== 'confirmation' && key !== 'deleteOwnedFamilies')) {
    return undefined;
  }

  const request = value as Record<string, unknown>;
  if (request.confirmation !== 'ELIMINAR') {
    return undefined;
  }

  const deleteOwnedFamilies = request.deleteOwnedFamilies;
  if (deleteOwnedFamilies !== undefined && typeof deleteOwnedFamilies !== 'boolean') {
    return undefined;
  }

  return {
    confirmation: 'ELIMINAR',
    deleteOwnedFamilies: deleteOwnedFamilies === true,
  };
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
