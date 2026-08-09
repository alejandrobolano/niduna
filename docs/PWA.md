# Progressive web app

Niduna's web export is installable on supported desktop and mobile browsers.
It uses the same Expo Router application and does not maintain a second web UI.

## Scope

- `public/manifest.webmanifest` defines the installed application.
- `public/pwa` contains Nuni icons for standard and maskable launchers.
- `src/app/+html.tsx` links the manifest and iOS home-screen metadata.
- `PwaInstallPanel` exposes the browser install action from account settings.
- `firebase-messaging-sw.js` is generated after each web export solely for web
  push delivery.

There is deliberately no offline asset cache. The care data requires a live
Supabase connection, and an aggressive service-worker cache could keep an old
Niduna release active after deployment. This keeps updates equivalent to the
current website and makes the PWA layer safe to remove.

## Build

`pnpm web:export` first runs the Expo static export and then writes the Firebase
worker into `dist`. With no Firebase web configuration, it writes a minimal
worker and the PWA remains installable, but web push stays unavailable.

The web build reads these public variables:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_VAPID_KEY`

## Browser behavior

- Chromium browsers can show the in-app installation prompt.
- iOS users install from **Compartir > Añadir a pantalla de inicio**.
- Push permission is requested only when the user selects
  **Activar en este dispositivo**.
- On iOS, web push requires Niduna to be installed on the home screen.
- Unsupported browsers keep the complete web application without installation
  or push capabilities.

## Removal

Removing PWA support does not require changing native notifications. Remove the
manifest, PWA icons, `+html.tsx`, `PwaInstallPanel`, and the worker generation
script. Web push can be removed independently through its permission service,
Supabase migration objects, and `dispatch-web-care-notification` function.
