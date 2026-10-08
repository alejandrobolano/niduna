import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve('dist');
const isDevelopment = process.env.NIDUNA_WEB_ENV === 'development';
const robots = isDevelopment
  ? 'User-agent: *\nDisallow: /\n'
  : 'User-agent: *\nAllow: /\n';
const headers = `https://dev.niduna.com/*
  X-Robots-Tag: noindex, nofollow, noarchive
`;

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, '_headers'), headers, 'utf8'),
  writeFile(resolve(outputDirectory, 'robots.txt'), robots, 'utf8'),
]);
