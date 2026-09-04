import { describe, expect, it } from 'vitest';

import {
  canExportFamily,
  createPortableCsv,
  getActiveDocumentFiles,
  parsePortableExportRequest,
} from '../supabase/functions/_shared/data-export-rules';

describe('portable data export requests', () => {
  it('accepts personal and family scopes', () => {
    expect(parsePortableExportRequest({ type: 'personal' })).toEqual({
      type: 'personal',
    });
    expect(
      parsePortableExportRequest({
        familyId: '9bb4c4de-5b22-40af-80b4-4e0000000000',
        type: 'family',
      }),
    ).toEqual({
      familyId: '9bb4c4de-5b22-40af-80b4-4e0000000000',
      type: 'family',
    });
  });

  it('rejects unknown fields and malformed identifiers', () => {
    expect(parsePortableExportRequest({ type: 'personal', userId: 'other' })).toBeUndefined();
    expect(parsePortableExportRequest({ familyId: 'other', type: 'family' })).toBeUndefined();
  });

  it('protects spreadsheet formulas', () => {
    expect(createPortableCsv([{ name: '=IMPORTXML("x")' }])).toContain(
      "'=IMPORTXML",
    );
  });

  it('allows only owners and administrators to export a family', () => {
    expect(canExportFamily('owner')).toBe(true);
    expect(canExportFamily('admin')).toBe(true);
    expect(canExportFamily('caregiver')).toBe(false);
    expect(canExportFamily('viewer')).toBe(false);
    expect(canExportFamily(undefined)).toBe(false);
  });

  it('includes only active published document files', () => {
    expect(
      getActiveDocumentFiles([
        {
          original_file_name: 'informe.pdf',
          retired_at: null,
          status: 'published',
          storage_path: 'family/baby/informe.pdf',
        },
        {
          original_file_name: 'retirado.pdf',
          retired_at: '2026-09-04T10:00:00.000Z',
          status: 'published',
          storage_path: 'family/baby/retirado.pdf',
        },
        {
          original_file_name: 'borrador.pdf',
          retired_at: null,
          status: 'draft',
          storage_path: 'family/baby/borrador.pdf',
        },
      ]),
    ).toEqual([
      {
        fileName: 'informe.pdf',
        path: 'family/baby/informe.pdf',
      },
    ]);
  });
});
