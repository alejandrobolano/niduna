import { Milk } from 'lucide-react-native';
import { describe, expect, it, vi } from 'vitest';

import {
  createCareReportFileName,
  createCareReportHtml,
} from '../src/features/care/application/care-report';
import type { CareEvent } from '../src/features/care/domain/care-event';

vi.mock('lucide-react-native', () => ({
  Milk: 'Milk',
}));

const events: CareEvent[] = [
  {
    amountMilliliters: 80,
    babyId: 'baby-1',
    icon: Milk,
    id: 'feeding-1',
    method: 'formula',
    occurredAt: '2026-09-01T08:00:00.000Z',
    recordedById: 'user-1',
    recordedByName: 'Alejandro',
    sourceType: 'care_event',
    type: 'feeding',
  },
  {
    amountMilliliters: 70,
    babyId: 'baby-1',
    icon: Milk,
    id: 'feeding-2',
    method: 'formula',
    occurredAt: '2026-09-01T11:00:00.000Z',
    recordedById: 'user-2',
    recordedByName: 'Stephanie',
    sourceType: 'care_event',
    type: 'feeding',
  },
];

describe('createCareReportHtml', () => {
  it('creates an A4 report with selected columns and escaped family data', () => {
    const html = createCareReportHtml({
      babyName: 'Steffi <3',
      columns: ['date', 'detail'],
      contacts: [],
      events,
      familyName: 'Familia & compañía',
      filterLabel: 'Alimentación',
      generatedAt: new Date('2026-09-02T10:00:00.000Z'),
    });

    expect(html).toContain('@page { size: A4 portrait;');
    expect(html).toContain('Steffi &lt;3');
    expect(html).toContain('Familia &amp; compañía');
    expect(html).toContain('150 ml registrados');
    expect(html).toContain('2 tomas');
    expect(html).toContain('<th class="date">Fecha</th>');
    expect(html).not.toContain('<th class="author">Registrado por</th>');
  });
});

describe('createCareReportFileName', () => {
  it('creates a stable safe PDF file name', () => {
    expect(createCareReportFileName('María José', new Date(2026, 8, 2))).toBe(
      'niduna-informe-maria-jose-2026-09-02.pdf',
    );
  });
});
