import {
  createReportSafeName,
  escapeReportHtml,
  formatReportDateTime,
  nuniReportLogo,
} from '../../care/application/care-report-html';
import { createCareSummaryObservations } from './care-summary-observations';
import {
  formatSummaryDuration,
  formatWeightGrams,
  getCareSummaryPeriodLabel,
  summarizeCareTrend,
  summarizeMeasurementEvolution,
  type CareSummaryComparison,
  type CareSummaryPeriod,
  type CareSummaryReport,
  type CareTrendPoint,
  type DailyCareSummaryRange,
  type MeasurementTrendPoint,
} from '../domain/daily-care-summary';

export interface CareSummaryPdfReportInput {
  babyName: string;
  comparison: CareSummaryComparison;
  familyName: string;
  generatedAt?: Date;
  period: CareSummaryPeriod;
  range: DailyCareSummaryRange;
  report: CareSummaryReport;
}

type TrendMetric = 'diaper' | 'feeding' | 'sleep';
type MeasurementMetric = 'head' | 'length' | 'weight';

function formatReportDate(value: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

function formatRange(range: DailyCareSummaryRange): string {
  return `${formatReportDate(range.startAt)} - ${formatReportDate(range.endAt)}`;
}

function formatLength(millimeters: number): string {
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(millimeters / 10)} cm`;
}

function formatTrendValue(value: number, metric: TrendMetric): string {
  return metric === 'sleep' ? formatSummaryDuration(value) : String(value);
}

function getTrendValue(point: CareTrendPoint, metric: TrendMetric): number {
  if (metric === 'feeding') return point.feedingCount;
  if (metric === 'diaper') return point.diaperCount;
  return point.sleepMinutes;
}

function formatTrendBucket(value: string, period: CareSummaryPeriod): string {
  return new Intl.DateTimeFormat('es-ES', period === '24h'
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short' }).format(new Date(value));
}

function renderTrendChart(
  points: CareTrendPoint[],
  metric: TrendMetric,
  label: string,
  accent: string,
  period: CareSummaryPeriod,
): string {
  const values = points.map((point) => getTrendValue(point, metric));
  const maximum = Math.max(...values, 0);
  const scaleMaximum = Math.max(maximum, 1);
  const bars = points.map((point, index) => {
    const value = values[index] ?? 0;
    const height = value === 0 ? 1 : Math.max(6, Math.round((value / scaleMaximum) * 58));
    return `<span class="trend-bar-wrap" title="${escapeReportHtml(formatTrendValue(value, metric))}">
      <span class="trend-value">${value > 0 ? escapeReportHtml(formatTrendValue(value, metric)) : ''}</span>
      <span class="trend-bar" style="height:${height}px;background:${accent};opacity:${value > 0 ? 1 : 0.22}"></span>
    </span>`;
  }).join('');
  const firstLabel = points[0] ? formatTrendBucket(points[0].startedAt, period) : '';
  const lastLabel = points.at(-1) ? formatTrendBucket(points.at(-1)!.startedAt, period) : '';

  return `<article class="trend-card">
    <div class="trend-heading"><strong>${label}</strong><span>Máximo: ${escapeReportHtml(formatTrendValue(maximum, metric))}</span></div>
    <div class="trend-bars" style="grid-template-columns:repeat(${Math.max(points.length, 1)},minmax(2px,1fr))">${bars}</div>
    <div class="trend-axis"><span>${escapeReportHtml(firstLabel)}</span><span>${escapeReportHtml(lastLabel)}</span></div>
  </article>`;
}

function getMeasurementValue(point: MeasurementTrendPoint, metric: MeasurementMetric): number | undefined {
  if (metric === 'weight') return point.weightGrams;
  if (metric === 'length') return point.lengthMillimeters;
  return point.headCircumferenceMillimeters;
}

function formatMeasurementValue(value: number, metric: MeasurementMetric): string {
  return metric === 'weight' ? formatWeightGrams(value) : formatLength(value);
}

function renderMeasurementChart(
  points: MeasurementTrendPoint[],
  metric: MeasurementMetric,
  label: string,
  accent: string,
): string {
  const values = points
    .map((point) => ({ point, value: getMeasurementValue(point, metric) }))
    .filter((item): item is { point: MeasurementTrendPoint; value: number } => item.value !== undefined);

  if (values.length === 0) {
    return `<article class="measurement-chart empty"><strong>${label}</strong><p>Sin registros</p></article>`;
  }

  const rawMinimum = Math.min(...values.map(({ value }) => value));
  const rawMaximum = Math.max(...values.map(({ value }) => value));
  const padding = Math.max((rawMaximum - rawMinimum) * 0.12, rawMaximum * 0.02, 1);
  const minimum = rawMinimum - padding;
  const maximum = rawMaximum + padding;
  const valueRange = Math.max(maximum - minimum, 1);
  const firstTime = Date.parse(values[0].point.measuredAt);
  const lastTime = Date.parse(values.at(-1)!.point.measuredAt);
  const timeRange = Math.max(lastTime - firstTime, 1);
  const coordinates = values.map(({ point, value }, index) => ({
    point,
    value,
    x: values.length === 1 ? 90 : 12 + ((Date.parse(point.measuredAt) - firstTime) / timeRange) * 156,
    y: 68 - ((value - minimum) / valueRange) * 48,
    index,
  }));
  const polyline = coordinates.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const circles = coordinates.map(({ index, x, y }) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="#FFFFFF" stroke="${accent}" stroke-width="2" aria-label="Medida ${index + 1}"/>`,
  ).join('');
  const first = values[0];
  const latest = values.at(-1)!;

  return `<article class="measurement-chart">
    <div class="measurement-heading"><strong>${label}</strong><span>${values.length} ${values.length === 1 ? 'medida' : 'medidas'}</span></div>
    <svg viewBox="0 0 180 82" role="img" aria-label="Evolución de ${label.toLocaleLowerCase('es-ES')}">
      <line x1="12" x2="168" y1="68" y2="68" stroke="#D8DDEB" stroke-width="1"/>
      ${values.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="${accent}" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/>` : ''}
      ${circles}
    </svg>
    <div class="measurement-range">
      <span>${escapeReportHtml(formatMeasurementValue(first.value, metric))}<small>${escapeReportHtml(formatReportDate(first.point.measuredAt))}</small></span>
      <span class="latest">${escapeReportHtml(formatMeasurementValue(latest.value, metric))}<small>${escapeReportHtml(formatReportDate(latest.point.measuredAt))}</small></span>
    </div>
  </article>`;
}

function renderSummaryCards(report: CareSummaryReport): string {
  const { summary } = report;
  const feedingDetail = summary.feeding.knownAmountCount > 0
    ? `${summary.feeding.totalAmountMilliliters} ml en ${summary.feeding.knownAmountCount} tomas con cantidad`
    : 'Sin cantidades en mililitros';
  const interval = summary.feeding.averageIntervalMinutes
    ? ` · intervalo medio ${formatSummaryDuration(summary.feeding.averageIntervalMinutes)}`
    : '';

  return `<section class="summary-grid">
    <article class="summary-card coral"><span>ALIMENTACIÓN</span><strong>${summary.feeding.count} ${summary.feeding.count === 1 ? 'toma' : 'tomas'}</strong><p>${feedingDetail}${interval}</p></article>
    <article class="summary-card butter"><span>PAÑALES</span><strong>${summary.diaper.total} ${summary.diaper.total === 1 ? 'cambio' : 'cambios'}</strong><p>${summary.diaper.wet} pipí · ${summary.diaper.dirty} caca · ${summary.diaper.both} mixtos</p></article>
    <article class="summary-card lavender"><span>SUEÑO</span><strong>${formatSummaryDuration(summary.sleepMinutes)}</strong><p>Tiempo acumulado en registros finalizados</p></article>
    <article class="summary-card aqua"><span>NOTAS</span><strong>${summary.noteCount} ${summary.noteCount === 1 ? 'nota' : 'notas'}</strong><p>Notas compartidas por la familia</p></article>
  </section>`;
}

export function createCareSummaryReportHtml({
  babyName,
  comparison,
  familyName,
  generatedAt = new Date(),
  period,
  range,
  report,
}: CareSummaryPdfReportInput): string {
  const safeBabyName = escapeReportHtml(babyName);
  const safeFamilyName = escapeReportHtml(familyName);
  const generatedLabel = formatReportDateTime(generatedAt);
  const observations = createCareSummaryObservations(comparison);
  const periodLabel = getCareSummaryPeriodLabel(period);

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Resumen de ${safeBabyName} · Niduna</title>
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
        h2 { font-size: 14px; margin: 0 0 8px; }
        .lead { color: #66708F; font-size: 10.5px; margin: 7px 0 12px; }
        .scope { border: 1px solid #D4E8E8; border-radius: 10px; display: grid; grid-template-columns: repeat(3, 1fr); margin-bottom: 13px; overflow: hidden; }
        .scope div { border-right: 1px solid #D4E8E8; padding: 7px 9px; }
        .scope div:last-child { border-right: 0; }
        .scope span { color: #66708F; display: block; font-size: 8px; font-weight: 800; letter-spacing: .5px; margin-bottom: 3px; }
        .scope strong { font-size: 9.5px; line-height: 1.3; }
        .summary-grid { display: grid; gap: 7px; grid-template-columns: repeat(4, 1fr); margin-bottom: 13px; }
        .summary-card { background: #fff; border: 1px solid #E7DFCC; border-radius: 10px; border-top-width: 4px; min-height: 74px; padding: 8px 9px; }
        .summary-card.coral { border-top-color: #FF8F86; }
        .summary-card.butter { border-top-color: #F1CF61; }
        .summary-card.lavender { border-top-color: #B79AE4; }
        .summary-card.aqua { border-top-color: #82D4D1; }
        .summary-card span { color: #66708F; display: block; font-size: 7.5px; font-weight: 800; letter-spacing: .4px; }
        .summary-card strong { display: block; font-size: 14px; margin: 5px 0 3px; }
        .summary-card p { color: #66708F; font-size: 8px; line-height: 1.3; margin: 0; }
        .comparison { background: #F7F3FF; border-radius: 11px; break-inside: avoid; margin-bottom: 15px; padding: 11px 13px; page-break-inside: avoid; }
        .comparison h2 { margin-bottom: 3px; }
        .comparison .subtitle { color: #66708F; font-size: 8.5px; margin: 0 0 8px; }
        .comparison ul { display: grid; gap: 4px; margin: 0; padding-left: 17px; }
        .comparison li { font-size: 9px; line-height: 1.35; }
        .section { break-inside: avoid; margin-top: 14px; page-break-inside: avoid; }
        .section-copy { color: #66708F; font-size: 9px; margin: -3px 0 8px; }
        .trend-grid { display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); }
        .trend-card { border: 1px solid #E7DFCC; border-radius: 10px; padding: 8px; }
        .trend-heading, .measurement-heading { align-items: center; display: flex; justify-content: space-between; }
        .trend-heading strong, .measurement-heading strong { font-size: 10px; }
        .trend-heading span, .measurement-heading span { color: #66708F; font-size: 7.5px; }
        .trend-bars { align-items: end; border-bottom: 1px solid #D8DDEB; display: grid; gap: 2px; height: 82px; margin-top: 5px; }
        .trend-bar-wrap { align-items: center; display: flex; flex-direction: column; height: 78px; justify-content: flex-end; min-width: 0; }
        .trend-bar { border-radius: 3px 3px 0 0; display: block; max-width: 18px; width: 72%; }
        .trend-value { color: #66708F; font-size: 5.5px; line-height: 8px; min-height: 8px; overflow: hidden; }
        .trend-axis { color: #66708F; display: flex; font-size: 7px; justify-content: space-between; margin-top: 4px; }
        .measurement-summary { background: #EAF8F7; border-radius: 8px; color: #42506F; font-size: 8.5px; line-height: 1.35; margin-bottom: 8px; padding: 7px 9px; }
        .measurement-grid { display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); }
        .measurement-chart { border: 1px solid #E7DFCC; border-radius: 10px; min-height: 134px; padding: 8px; }
        .measurement-chart.empty { align-items: center; display: flex; flex-direction: column; justify-content: center; }
        .measurement-chart.empty p { color: #66708F; font-size: 8px; }
        .measurement-chart svg { display: block; height: 74px; margin-top: 3px; width: 100%; }
        .measurement-range { color: #42506F; display: flex; font-size: 8px; justify-content: space-between; }
        .measurement-range span { display: flex; flex-direction: column; }
        .measurement-range .latest { align-items: flex-end; font-weight: 700; }
        .measurement-range small { color: #66708F; font-size: 6.5px; font-weight: 400; margin-top: 2px; }
        .report-end { break-inside: avoid; margin-top: 18px; page-break-inside: avoid; }
        .notice { background: #F3ECFF; border-radius: 8px; color: #66708F; font-size: 8px; line-height: 1.35; margin: 0; padding: 8px 10px; }
        footer { color: #66708F; font-size: 7.5px; margin-top: 14px; }
        footer .footer-line { border-top: 1px solid #E7DFCC; display: flex; justify-content: space-between; padding-top: 5px; }
      </style>
    </head>
    <body>
      <header>
        <div class="brand">${nuniReportLogo}<div><strong>Niduna</strong><span>Coordinación familiar del cuidado</span></div></div>
        <div class="context"><strong>${safeFamilyName}</strong><span>Bebé: ${safeBabyName}</span></div>
      </header>
      <main>
        <p class="eyebrow">RESUMEN DE CUIDADOS</p>
        <h1>Así ha estado ${safeBabyName}</h1>
        <p class="lead">Una visión conjunta del relevo familiar, su comparativa y la evolución registrada.</p>
        <section class="scope">
          <div><span>PERÍODO</span><strong>${escapeReportHtml(periodLabel)}</strong></div>
          <div><span>FECHAS</span><strong>${escapeReportHtml(formatRange(range))}</strong></div>
          <div><span>GENERADO</span><strong>${escapeReportHtml(generatedLabel)}</strong></div>
        </section>
        ${renderSummaryCards(report)}
        <section class="comparison">
          <h2>¿Qué ha cambiado?</h2>
          <p class="subtitle">Comparación con el periodo inmediatamente anterior de la misma duración.</p>
          <ul>${observations.map((observation) => `<li>${escapeReportHtml(observation)}</li>`).join('')}</ul>
        </section>
        <section class="section">
          <h2>Ritmo de cuidados</h2>
          <p class="section-copy">${escapeReportHtml(summarizeCareTrend(report.summary, period))}</p>
          <div class="trend-grid">
            ${renderTrendChart(report.trend, 'feeding', 'Tomas', '#FF8F86', period)}
            ${renderTrendChart(report.trend, 'diaper', 'Pañales', '#F1CF61', period)}
            ${renderTrendChart(report.trend, 'sleep', 'Sueño', '#B79AE4', period)}
          </div>
        </section>
        <section class="section">
          <h2>Evolución desde el nacimiento</h2>
          <p class="measurement-summary">${escapeReportHtml(summarizeMeasurementEvolution(report.measurements))}</p>
          <div class="measurement-grid">
            ${renderMeasurementChart(report.measurements, 'weight', 'Peso', '#48C9C4')}
            ${renderMeasurementChart(report.measurements, 'length', 'Longitud', '#FF8F86')}
            ${renderMeasurementChart(report.measurements, 'head', 'Perímetro', '#B79AE4')}
          </div>
        </section>
      </main>
      <section class="report-end">
        <p class="notice"><strong>Importante:</strong> este resumen refleja únicamente los datos registrados en Niduna y ayuda a coordinar el cuidado familiar. No sustituye una historia clínica, una valoración médica ni los servicios de emergencia.</p>
        <footer><div class="footer-line"><span>niduna.com · Generado el ${escapeReportHtml(generatedLabel)}</span><span>Resumen de ${safeBabyName}</span></div></footer>
      </section>
    </body>
  </html>`;
}

export function createCareSummaryReportFileName(
  babyName: string,
  period: CareSummaryPeriod,
  date = new Date(),
): string {
  const dateKey = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0'))
    .join('-');

  return `niduna-resumen-${createReportSafeName(babyName)}-${period}-${dateKey}.pdf`;
}
