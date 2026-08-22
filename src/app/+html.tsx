import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { webViewportContent } from '@/shared/presentation/web-viewport';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
        <meta
          content={webViewportContent}
          name="viewport"
        />
        <meta content="#fff8e8" media="(prefers-color-scheme: light)" name="theme-color" />
        <meta content="#0f1428" media="(prefers-color-scheme: dark)" name="theme-color" />
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="Niduna" name="apple-mobile-web-app-title" />
        <meta content="black-translucent" name="apple-mobile-web-app-status-bar-style" />
        <link href="/manifest.webmanifest" rel="manifest" />
        <link href="/pwa/icon-192.png" rel="apple-touch-icon" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
