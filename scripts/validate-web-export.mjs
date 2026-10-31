import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile(resolve('dist/index.html'), 'utf8');

if (!html.includes('/_expo/static/js/')) {
  throw new Error('Web export does not reference a JavaScript bundle');
}

if (!html.includes('/_expo/static/css/')) {
  throw new Error('Web export does not reference a CSS bundle');
}

console.log('Validated web export assets');
