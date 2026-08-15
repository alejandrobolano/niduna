export type PortableExportRequest =
  | { type: 'personal' }
  | { familyId: string; type: 'family' };

export function parsePortableExportRequest(
  value: unknown,
): PortableExportRequest | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  const request = value as Record<string, unknown>;
  if (request.type === 'personal' && Object.keys(request).length === 1) {
    return { type: 'personal' };
  }

  if (
    request.type === 'family' &&
    typeof request.familyId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      request.familyId,
    ) &&
    Object.keys(request).length === 2
  ) {
    return { familyId: request.familyId, type: 'family' };
  }

  return undefined;
}

function protectSpreadsheetCell(value: string): string {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

export function createPortableCsv(rows: Record<string, unknown>[]): string {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  const serialize = (value: unknown) => {
    const text = protectSpreadsheetCell(
      value === null || value === undefined
        ? ''
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value),
    );
    return `"${text.replaceAll('"', '""')}"`;
  };

  return `\uFEFF${[headers, ...rows.map((row) => headers.map((header) => row[header]))]
    .map((row) => row.map(serialize).join(';'))
    .join('\r\n')}`;
}
