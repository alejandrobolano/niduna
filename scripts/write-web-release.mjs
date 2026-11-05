import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
const releaseId =
  process.env.EXPO_PUBLIC_WEB_RELEASE_ID ?? packageJson.version;
const outputDirectory = resolve('dist');

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  resolve(outputDirectory, 'app-version.json'),
  `${JSON.stringify({ releaseId })}\n`,
  'utf8',
);
