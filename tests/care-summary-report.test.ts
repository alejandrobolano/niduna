import { describe, expect, it } from 'vitest';

import {
  createCareSummaryReportFileName,
  createCareSummaryReportHtml,
  type CareSummaryPdfReportInput,
} from '../src/features/care-summary/application/care-summary-report';

const input: CareSummaryPdfReportInput = {
  babyName: 'Steffi <3',
  comparison: {
    diaper: {
      both: { current: 1, delta: 1, previous: 0 },
      dirty: { current: 2, delta: 0, previous: 2 },
      total: { current: 5, delta: 1, previous: 4 },
      wet: { current: 2, delta: 0, previous: 2 },
    },
    feeding: {
      breast: { current: 1, delta: 1, previous: 0 },
      expressedMilk: { current: 1, delta: 0, previous: 1 },
      formula: { current: 4, delta: 1, previous: 3 },
      mixed: { current: 0, delta: 0, previous: 0 },
      total: { current: 6, delta: 2, previous: 4 },
    },
    feedingAmountMilliliters: {
      current: 420,
      currentKnownCount: 5,
      delta: 100,
      previous: 320,
      previousKnownCount: 4,
    },
    feedingIntervalMinutes: { current: 180, delta: -20, previous: 200 },
    noteCount: { current: 1, delta: 1, previous: 0 },
    sleepMinutes: { current: 240, delta: 30, previous: 210 },
  },
  familyName: 'Familia & compañía',
  generatedAt: new Date('2026-09-18T10:00:00.000Z'),
  period: '24h',
  range: {
    bucketMinutes: 240,
    endAt: '2026-09-18T10:00:00.000Z',
    startAt: '2026-09-17T10:00:00.000Z',
  },
  report: {
    measurements: [
      {
        headCircumferenceMillimeters: 340,
        lengthMillimeters: 500,
        measuredAt: '2026-08-21T10:00:00.000Z',
        weightGrams: 3200,
      },
      {
        headCircumferenceMillimeters: 355,
        lengthMillimeters: 525,
        measuredAt: '2026-09-18T10:00:00.000Z',
        weightGrams: 3850,
      },
    ],
    summary: {
      diaper: { both: 1, dirty: 2, total: 5, wet: 2 },
      feeding: {
        averageIntervalMinutes: 180,
        breast: 1,
        count: 6,
        expressedMilk: 1,
        formula: 4,
        knownAmountCount: 5,
        mixed: 0,
        totalAmountMilliliters: 420,
      },
      latestMeasurement: {
        headCircumferenceMillimeters: 355,
        lengthMillimeters: 525,
        measuredAt: '2026-09-18T10:00:00.000Z',
        weightGrams: 3850,
      },
      noteCount: 1,
      sleepMinutes: 240,
    },
    trend: [
      {
        diaperCount: 2,
        feedingAmountMilliliters: 180,
        feedingCount: 2,
        noteCount: 0,
        sleepMinutes: 60,
        startedAt: '2026-09-17T10:00:00.000Z',
      },
      {
        diaperCount: 3,
        feedingAmountMilliliters: 240,
        feedingCount: 4,
        noteCount: 1,
        sleepMinutes: 180,
        startedAt: '2026-09-18T06:00:00.000Z',
      },
    ],
  },
};

describe('createCareSummaryReportHtml', () => {
  it('creates an escaped A4 summary with comparisons, trends and measurements', () => {
    const html = createCareSummaryReportHtml(input);

    expect(html).toContain('@page { size: A4 portrait;');
    expect(html).toContain('Steffi &lt;3');
    expect(html).toContain('Familia &amp; compañía');
    expect(html).toContain('6 tomas');
    expect(html).toContain('5 cambios');
    expect(html).toContain('Se registraron 2 tomas más');
    expect(html).toContain('Ritmo de cuidados');
    expect(html).toContain('Evolución desde el nacimiento');
    expect(html).toContain('3,850 kg');
    expect(html).toContain('No sustituye una historia clínica');
  });
});

describe('createCareSummaryReportFileName', () => {
  it('includes the baby, period and date in a safe file name', () => {
    expect(createCareSummaryReportFileName('María José', '7d', new Date(2026, 8, 18))).toBe(
      'niduna-resumen-maria-jose-7d-2026-09-18.pdf',
    );
  });
});
