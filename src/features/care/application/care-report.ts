import type { BabyContact } from '@/features/baby-contacts/domain/baby-contact';
import {
  careEventLabels,
  describeCareEvent,
} from './care-event-description';
import { getDurationMinutes } from './care-snapshot';
import type { CareEvent } from '../domain/care-event';

export type CareReportColumn = 'date' | 'type' | 'detail' | 'author';

export const careReportColumns = [
  { label: 'Fecha', value: 'date' },
  { label: 'Tipo', value: 'type' },
  { label: 'Detalle', value: 'detail' },
  { label: 'Registrado por', value: 'author' },
] satisfies { label: string; value: CareReportColumn }[];

export interface CareReportInput {
  babyName: string;
  columns: CareReportColumn[];
  contacts: BabyContact[];
  events: CareEvent[];
  familyName: string;
  filterLabel: string;
  generatedAt?: Date;
}

interface CareReportSummary {
  diaper: { both: number; dirty: number; total: number; wet: number };
  feeding: { averageIntervalMinutes?: number; count: number; totalAmountMilliliters: number };
  noteCount: number;
  sleepMinutes: number;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function summarizeEvents(events: CareEvent[]): CareReportSummary {
  const feedings = events
    .filter((event) => event.type === 'feeding')
    .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt));
  const feedingIntervals = feedings.slice(1).map((event, index) =>
    Math.max(
      0,
      Math.round(
        (Date.parse(event.occurredAt) - Date.parse(feedings[index].occurredAt)) / 60_000,
      ),
    ),
  );
  const diapers = events.filter((event) => event.type === 'diaper');

  return {
    diaper: {
      both: diapers.filter((event) => event.condition === 'both').length,
      dirty: diapers.filter((event) => event.condition === 'dirty').length,
      total: diapers.length,
      wet: diapers.filter((event) => event.condition === 'wet').length,
    },
    feeding: {
      averageIntervalMinutes: feedingIntervals.length > 0
        ? Math.round(
            feedingIntervals.reduce((total, interval) => total + interval, 0) /
              feedingIntervals.length,
          )
        : undefined,
      count: feedings.length,
      totalAmountMilliliters: feedings.reduce(
        (total, event) => total + (event.amountMilliliters ?? 0),
        0,
      ),
    },
    noteCount: events.filter((event) => event.type === 'note').length,
    sleepMinutes: events.reduce(
      (total, event) =>
        event.type === 'sleep' && event.endedAt
          ? total + getDurationMinutes(event.occurredAt, event.endedAt)
          : total,
      0,
    ),
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours} h ${remainder} min` : `${hours} h`;
}

function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

function formatPeriod(events: CareEvent[]): string {
  if (events.length === 0) return 'Sin registros';
  const times = events.map((event) => Date.parse(event.occurredAt));
  const format = (value: number) => new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
  }).format(new Date(value));
  const start = format(Math.min(...times));
  const end = format(Math.max(...times));
  return start === end ? start : `${start} - ${end}`;
}

function renderSummaryCards(events: CareEvent[]): string {
  const summary = summarizeEvents(events);
  const eventTypes = new Set(events.map((event) => event.type));
  const cards = [
    eventTypes.has('feeding')
      ? `<article class="summary-card coral">
          <span>ALIMENTACIÓN</span>
          <strong>${summary.feeding.count} ${summary.feeding.count === 1 ? 'toma' : 'tomas'}</strong>
          <p>${summary.feeding.totalAmountMilliliters} ml registrados${summary.feeding.averageIntervalMinutes ? ` · intervalo medio ${formatDuration(summary.feeding.averageIntervalMinutes)}` : ''}</p>
        </article>`
      : '',
    eventTypes.has('diaper')
      ? `<article class="summary-card butter">
          <span>PAÑALES</span>
          <strong>${summary.diaper.total} ${summary.diaper.total === 1 ? 'cambio' : 'cambios'}</strong>
          <p>${summary.diaper.wet} pipí · ${summary.diaper.dirty} caca · ${summary.diaper.both} mixtos</p>
        </article>`
      : '',
    eventTypes.has('sleep')
      ? `<article class="summary-card lavender">
          <span>SUEÑO</span>
          <strong>${formatDuration(summary.sleepMinutes)}</strong>
          <p>Tiempo de sueño finalizado en el período</p>
        </article>`
      : '',
    eventTypes.has('note')
      ? `<article class="summary-card aqua">
          <span>NOTAS</span>
          <strong>${summary.noteCount} ${summary.noteCount === 1 ? 'nota' : 'notas'}</strong>
          <p>Información compartida por la familia</p>
        </article>`
      : '',
  ].filter(Boolean);

  return cards.length > 0
    ? `<section class="summary-grid">${cards.join('')}</section>`
    : '';
}

function renderContacts(contacts: BabyContact[]): string {
  if (contacts.length === 0) return '';

  return `<section class="contacts">
    <h2>Contactos incluidos</h2>
    <div class="contact-grid">
      ${contacts.map((contact) => `
        <article class="contact">
          <strong>${escapeHtml(contact.name)}</strong>
          ${contact.contactPerson ? `<span>${escapeHtml(contact.contactPerson)}</span>` : ''}
          ${contact.phone ? `<span>${escapeHtml(contact.phone)}</span>` : ''}
          ${contact.address ? `<span>${escapeHtml(contact.address)}</span>` : ''}
        </article>`).join('')}
    </div>
  </section>`;
}

function renderTable(events: CareEvent[], columns: CareReportColumn[]): string {
  const headers: Record<CareReportColumn, string> = {
    author: 'Registrado por',
    date: 'Fecha',
    detail: 'Detalle',
    type: 'Tipo',
  };

  return `<table>
    <thead><tr>${columns.map((column) => `<th class="${column}">${headers[column]}</th>`).join('')}</tr></thead>
    <tbody>
      ${events.map((event) => {
        const values: Record<CareReportColumn, string> = {
          author: event.recordedByName ?? 'Un familiar',
          date: formatDateTime(event.occurredAt),
          detail: describeCareEvent(event),
          type: careEventLabels[event.type],
        };
        return `<tr>${columns.map((column) => `<td class="${column}">${escapeHtml(values[column])}</td>`).join('')}</tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

const nuniLogo = `<svg aria-hidden="true" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="24" fill="#DFF5F6"/>
  <rect x="6" y="48" width="26" height="40" rx="13" fill="#FFD86B" transform="rotate(24 19 68)"/>
  <rect x="68" y="48" width="26" height="40" rx="13" fill="#FFD86B" transform="rotate(-24 81 68)"/>
  <rect x="18" y="18" width="64" height="72" rx="40" fill="#48C9C4"/>
  <ellipse cx="50" cy="72" rx="16" ry="18" fill="#DDF7F3" opacity=".74"/>
  <rect x="47" y="2" width="10" height="22" rx="5.5" fill="#FF756B" transform="rotate(-24 45.5 24)"/>
  <rect x="49" y="3" width="10" height="20" rx="5" fill="#FF756B" transform="rotate(28 55 23)"/>
  <rect x="33" y="40" width="10" height="13" rx="5" fill="#18234B"/>
  <rect x="57" y="40" width="10" height="13" rx="5" fill="#18234B"/>
  <rect x="44" y="56" width="11" height="8" rx="4" fill="#FF756B" transform="rotate(45 49.5 60)"/>
</svg>`;

export function createCareReportHtml({
  babyName,
  columns,
  contacts,
  events,
  familyName,
  filterLabel,
  generatedAt = new Date(),
}: CareReportInput): string {
  const safeBabyName = escapeHtml(babyName);
  const safeFamilyName = escapeHtml(familyName);
  const generatedLabel = formatDateTime(generatedAt);

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Informe de ${safeBabyName} · Niduna</title>
      <style>
        @page { size: A4 portrait; margin: 14mm 13mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; color: #18234B; font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        header { align-items: center; border-bottom: 1px solid #E7DFCC; display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 10px; }
        .brand { align-items: center; display: flex; gap: 9px; }
        .brand svg { height: 36px; width: 36px; }
        .brand strong { display: block; font-size: 18px; }
        .brand span, .context span { color: #66708F; display: block; font-size: 9px; margin-top: 2px; }
        .context { text-align: right; }
        .context strong { font-size: 11px; }
        .eyebrow { color: #FF756B; font-size: 9px; font-weight: 800; letter-spacing: 1.2px; margin: 0 0 5px; }
        h1 { font-size: 25px; line-height: 1.05; margin: 0; }
        .lead { color: #66708F; font-size: 10.5px; margin: 7px 0 12px; }
        .scope { border: 1px solid #D4E8E8; border-radius: 10px; display: grid; grid-template-columns: repeat(4, 1fr); margin-bottom: 13px; overflow: hidden; }
        .scope div { border-right: 1px solid #D4E8E8; padding: 7px 9px; }
        .scope div:last-child { border-right: 0; }
        .scope span { color: #66708F; display: block; font-size: 8px; font-weight: 800; letter-spacing: .5px; margin-bottom: 3px; }
        .scope strong { font-size: 9.5px; line-height: 1.3; }
        .summary-grid { display: grid; gap: 7px; grid-template-columns: repeat(4, 1fr); margin-bottom: 13px; }
        .summary-card { background: #fff; border: 1px solid #E7DFCC; border-radius: 10px; border-top-width: 4px; min-height: 64px; padding: 8px 9px; }
        .summary-card.coral { border-top-color: #FF8F86; }
        .summary-card.butter { border-top-color: #F1CF61; }
        .summary-card.lavender { border-top-color: #B79AE4; }
        .summary-card.aqua { border-top-color: #82D4D1; }
        .summary-card span { color: #66708F; display: block; font-size: 7.5px; font-weight: 800; letter-spacing: .4px; }
        .summary-card strong { display: block; font-size: 14px; margin: 5px 0 3px; }
        .summary-card p { color: #66708F; font-size: 8px; line-height: 1.25; margin: 0; }
        h2 { font-size: 13px; margin: 0 0 7px; }
        .contacts { margin-bottom: 13px; }
        .contact-grid { display: grid; gap: 7px; grid-template-columns: repeat(2, 1fr); }
        .contact { border: 1px solid #E7DFCC; border-radius: 8px; padding: 7px 9px; }
        .contact strong, .contact span { display: block; }
        .contact span { color: #66708F; font-size: 8.5px; margin-top: 2px; }
        table { border-collapse: collapse; table-layout: fixed; width: 100%; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        th { background: #DFF5F6; color: #18234B; font-size: 8px; letter-spacing: .3px; padding: 7px; text-align: left; text-transform: uppercase; }
        td { border-bottom: 1px solid #E7DFCC; font-size: 8.7px; line-height: 1.35; padding: 7px; vertical-align: top; word-break: break-word; }
        tbody tr:nth-child(even) td { background: #FAFAF8; }
        .date { width: 22%; }
        .type { width: 17%; }
        .detail { width: 41%; }
        .author { width: 20%; }
        .report-end { break-inside: avoid; margin-top: 18px; page-break-inside: avoid; }
        .notice { background: #F3ECFF; border-radius: 8px; color: #66708F; font-size: 8px; line-height: 1.35; margin: 0; padding: 8px 10px; }
        footer { color: #66708F; font-size: 7.5px; margin-top: 14px; }
        footer .footer-line { border-top: 1px solid #E7DFCC; display: flex; justify-content: space-between; padding-top: 5px; }
      </style>
    </head>
    <body>
      <header>
        <div class="brand">${nuniLogo}<div><strong>Niduna</strong><span>Coordinación familiar del cuidado</span></div></div>
        <div class="context"><strong>${safeFamilyName}</strong><span>Bebé: ${safeBabyName}</span></div>
      </header>
      <main>
        <p class="eyebrow">INFORME PERSONALIZADO</p>
        <h1>Cuidados de ${safeBabyName}</h1>
        <p class="lead">Resumen del relevo compartido por la familia durante el período seleccionado.</p>
        <section class="scope">
          <div><span>PERÍODO</span><strong>${escapeHtml(formatPeriod(events))}</strong></div>
          <div><span>FILTRO</span><strong>${escapeHtml(filterLabel)}</strong></div>
          <div><span>REGISTROS</span><strong>${events.length} resultados</strong></div>
          <div><span>COLUMNAS</span><strong>${columns.map((column) => careReportColumns.find((item) => item.value === column)?.label).filter(Boolean).join(', ')}</strong></div>
        </section>
        ${renderSummaryCards(events)}
        ${renderContacts(contacts)}
        <h2>Detalle de registros</h2>
        ${renderTable(events, columns)}
      </main>
      <section class="report-end">
        <p class="notice"><strong>Importante:</strong> este informe ayuda a coordinar el cuidado familiar. No sustituye una historia clínica, una valoración médica ni los servicios de emergencia.</p>
        <footer><div class="footer-line"><span>niduna.com · Generado el ${escapeHtml(generatedLabel)}</span><span>Informe de ${safeBabyName}</span></div></footer>
      </section>
    </body>
  </html>`;
}

export function createCareReportFileName(
  babyName: string,
  date = new Date(),
): string {
  const safeName = babyName
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '') || 'bebe';
  const dateKey = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0'))
    .join('-');

  return `niduna-informe-${safeName}-${dateKey}.pdf`;
}
