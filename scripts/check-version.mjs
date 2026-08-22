import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);
const packageJson = JSON.parse(
  await readFile(new URL('package.json', projectRoot), 'utf8'),
);
const appJson = JSON.parse(
  await readFile(new URL('app.json', projectRoot), 'utf8'),
);
const changelog = await readFile(
  new URL('CHANGELOG.md', projectRoot),
  'utf8',
);
const version = packageJson.version;

if (appJson.expo.version !== version) {
  throw new Error(
    `Version mismatch: package.json=${version}, app.json=${appJson.expo.version}`,
  );
}

if (!changelog.includes(`## [${version}]`)) {
  throw new Error(`CHANGELOG.md has no entry for version ${version}`);
}

console.log(`Niduna version ${version} is synchronized.`);
