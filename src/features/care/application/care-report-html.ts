export function escapeReportHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatReportDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

export function createReportSafeName(value: string): string {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '') || 'bebe';
}

export const nuniReportLogo = `<svg aria-hidden="true" viewBox="0 0 100 100">
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
