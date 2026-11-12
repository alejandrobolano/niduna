import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve('dist/index.html'), 'utf8');
const headers = await readFile(resolve('dist/_headers'), 'utf8');
const release = JSON.parse(
  await readFile(resolve('dist/app-version.json'), 'utf8'),
);

if (!html.includes('/_expo/static/js/')) {
  throw new Error('Web export does not reference a JavaScript bundle');
}

if (!html.includes('/_expo/static/css/')) {
  throw new Error('Web export does not reference a CSS bundle');
}

if (typeof release.releaseId !== 'string' || !release.releaseId) {
  throw new Error('Web export does not include a valid release identifier');
}

if (!headers.includes('/app-version.json\n  Cache-Control: no-store')) {
  throw new Error('Web release manifest is not protected from intermediary caches');
}

console.log('Validated web export assets');
