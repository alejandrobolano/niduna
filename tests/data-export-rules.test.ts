import { describe, expect, it } from 'vitest';

import {
  createPortableCsv,
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
});
