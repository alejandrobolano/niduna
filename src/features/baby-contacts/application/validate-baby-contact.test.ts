import { describe, expect, it } from 'vitest';

import type { BabyContactDraft } from './baby-contact-repository';
import { normalizeWebsiteUrl, validateBabyContact } from './validate-baby-contact';

const validDraft: BabyContactDraft = {
  category: 'health',
  isFeatured: false,
  name: 'Pediatra',
  phone: '+34 600 000 000',
};

describe('validateBabyContact', () => {
  it('requires a name and one useful detail', () => {
    const errors = validateBabyContact({ category: 'other', isFeatured: false, name: ' ' });
    expect(errors.map((error) => error.field)).toEqual(['name', 'phone']);
  });

  it('accepts any supported useful detail', () => {
    expect(validateBabyContact(validDraft)).toEqual([]);
    expect(validateBabyContact({ ...validDraft, phone: undefined, notes: 'Solo con cita' })).toEqual([]);
  });

  it('validates and normalizes websites', () => {
    expect(validateBabyContact({ ...validDraft, phone: undefined, websiteUrl: 'farmacia.local' })).toEqual([]);
    expect(normalizeWebsiteUrl('farmacia.local')).toBe('https://farmacia.local');
    expect(validateBabyContact({ ...validDraft, phone: undefined, websiteUrl: 'sin-dominio' })[0]?.field).toBe('websiteUrl');
  });
});
