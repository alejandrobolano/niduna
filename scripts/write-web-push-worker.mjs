import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

for (const path of ['.env.local', '.env']) {
  if (existsSync(path)) {
    loadEnvFile(path);
  }
}

const firebaseVersion = '12.16.0';
const outputDirectory = resolve('dist');
const outputPath = resolve(outputDirectory, 'firebase-messaging-sw.js');
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
};
const isConfigured = Object.values(config).every(Boolean);

const baseWorker = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (event) => {
  const nidunaUrl = event.notification.data?.nidunaUrl;

  if (!nidunaUrl) {
    return;
  }

  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.startsWith(nidunaUrl));
      return existingClient ? existingClient.focus() : self.clients.openWindow(nidunaUrl);
    }),
  );
});
`;
const firebaseWorker = isConfigured
  ? `
importScripts('https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(config)});
firebase.messaging();
`
  : '';

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${baseWorker}${firebaseWorker}`.trimStart(), 'utf8');
