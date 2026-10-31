import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('.github/product-announcements');
const files = (await readdir(directory)).filter((file) => file.endsWith('.json'));
const ids = new Set();
const platforms = new Set(['web', 'android', 'ios']);
const routes = new Set(['handoff', 'history', 'baby', 'family', 'medications', 'settings']);
const versionPattern = /^\d+\.\d+\.\d+$/;

for (const file of files) {
  const value = JSON.parse(await readFile(resolve(directory, file), 'utf8'));
  if (!value.id || !value.title || !value.description) throw new Error(`${file}: missing required copy`);
  if (ids.has(value.id)) throw new Error(`${file}: duplicated id ${value.id}`);
  if (!Array.isArray(value.platforms) || value.platforms.length === 0 || value.platforms.some((item) => !platforms.has(item))) throw new Error(`${file}: invalid platforms`);
  if (value.targetRoute && !routes.has(value.targetRoute)) throw new Error(`${file}: invalid target route`);
  if (value.minimumNativeVersion && !versionPattern.test(value.minimumNativeVersion)) throw new Error(`${file}: invalid minimum native version`);
  if (!['in_app', 'push_and_in_app'].includes(value.delivery)) throw new Error(`${file}: invalid delivery`);
  if (!['published', 'archived'].includes(value.status)) throw new Error(`${file}: invalid status`);
  if (Number.isNaN(Date.parse(value.expiresAt))) throw new Error(`${file}: invalid expiry`);
  ids.add(value.id);
}

console.log(`Validated ${files.length} product announcement manifest(s)`);
