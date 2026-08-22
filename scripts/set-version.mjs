import { readFile, writeFile } from 'node:fs/promises';

const version = process.argv[2];

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '')) {
  throw new Error('Usage: pnpm version:set <major.minor.patch>');
}

const projectRoot = new URL('../', import.meta.url);
const packageUrl = new URL('package.json', projectRoot);
const appUrl = new URL('app.json', projectRoot);
const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'));
const appJson = JSON.parse(await readFile(appUrl, 'utf8'));

packageJson.version = version;
appJson.expo.version = version;

await Promise.all([
  writeFile(packageUrl, `${JSON.stringify(packageJson, null, 2)}\n`),
  writeFile(appUrl, `${JSON.stringify(appJson, null, 2)}\n`),
]);

console.log(
  `Niduna is now ${version}. Add its CHANGELOG.md entry before committing.`,
);
