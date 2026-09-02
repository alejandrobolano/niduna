import type { BabyContact } from '@/features/baby-contacts/domain/baby-contact';

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function normalizeWebsiteUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function buildBabyContactVCard(contact: BabyContact): string {
  const displayName = contact.contactPerson || contact.name;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCardValue(displayName)}`,
    `N:;${escapeVCardValue(displayName)};;;`,
  ];

  if (contact.contactPerson) {
    lines.push(`ORG:${escapeVCardValue(contact.name)}`);
  }
  if (contact.phone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCardValue(contact.phone)}`);
  }
  if (contact.address) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(contact.address)};;;;`);
  }
  if (contact.websiteUrl) {
    lines.push(`URL:${escapeVCardValue(normalizeWebsiteUrl(contact.websiteUrl))}`);
  }
  if (contact.notes) {
    lines.push(`NOTE:${escapeVCardValue(contact.notes)}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export function babyContactFileName(contact: BabyContact): string {
  const normalized = contact.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${normalized || 'contacto-niduna'}.vcf`;
}
