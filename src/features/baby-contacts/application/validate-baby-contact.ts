import type { BabyContactDraft } from '@/features/baby-contacts/application/baby-contact-repository';

export type BabyContactField = 'address' | 'name' | 'notes' | 'phone' | 'websiteUrl';

export interface BabyContactValidationError {
  field: BabyContactField;
  message: string;
}

export function validateBabyContact(draft: BabyContactDraft): BabyContactValidationError[] {
  const errors: BabyContactValidationError[] = [];

  if (!draft.name.trim()) {
    errors.push({ field: 'name', message: 'Indica un nombre.' });
  }

  if (!draft.phone?.trim() && !draft.address?.trim() && !draft.websiteUrl?.trim() && !draft.notes?.trim()) {
    errors.push({
      field: 'phone',
      message: 'Añade al menos teléfono, dirección, web o una nota útil.',
    });
  }

  if (draft.websiteUrl?.trim()) {
    try {
      const value = /^https?:\/\//i.test(draft.websiteUrl.trim())
        ? draft.websiteUrl.trim()
        : `https://${draft.websiteUrl.trim()}`;
      const url = new URL(value);
      if (!url.hostname.includes('.')) throw new Error('invalid');
    } catch {
      errors.push({ field: 'websiteUrl', message: 'Escribe una dirección web válida.' });
    }
  }

  return errors;
}

export function normalizeWebsiteUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
