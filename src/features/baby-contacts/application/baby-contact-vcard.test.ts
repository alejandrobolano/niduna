import { describe, expect, it } from 'vitest';

import type { BabyContact } from '@/features/baby-contacts/domain/baby-contact';

import { babyContactFileName, buildBabyContactVCard } from './baby-contact-vcard';

const contact: BabyContact = {
  address: 'Calle Sol, 4; Madrid',
  authorUserId: 'user-1',
  babyId: 'baby-1',
  category: 'health',
  contactPerson: 'Dra. Ana Pérez',
  createdAt: '2026-09-01T10:00:00Z',
  id: 'contact-1',
  isFeatured: true,
  name: 'Pediatría Ñuñoa',
  notes: 'Atiende lunes, martes\nSolo con cita',
  phone: '+34 600 000 000',
  updatedAt: '2026-09-01T10:00:00Z',
  websiteUrl: 'clinica.example',
};

describe('buildBabyContactVCard', () => {
  it('creates an importable vCard with escaped contact data', () => {
    expect(buildBabyContactVCard(contact)).toBe([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Dra. Ana Pérez',
      'N:;Dra. Ana Pérez;;;',
      'ORG:Pediatría Ñuñoa',
      'TEL;TYPE=CELL:+34 600 000 000',
      'ADR;TYPE=WORK:;;Calle Sol\\, 4\\; Madrid;;;;',
      'URL:https://clinica.example',
      'NOTE:Atiende lunes\\, martes\\nSolo con cita',
      'END:VCARD',
    ].join('\r\n'));
  });

  it('creates a safe filename without accents', () => {
    expect(babyContactFileName(contact)).toBe('pediatria-nunoa.vcf');
  });
});
