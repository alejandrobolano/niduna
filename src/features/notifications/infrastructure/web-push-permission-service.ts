import { getApps, initializeApp } from 'firebase/app';
import {
  getMessaging,
  isSupported,
  onMessage,
  onRegistered,
  register,
  type MessagePayload,
  type Messaging,
} from 'firebase/messaging';
import { Platform } from 'react-native';

import type {
  PushDeviceRegistration,
  PushPermissionResult,
  PushPermissionService,
} from '@/features/notifications/application/notification-repository';

const registrationTimeoutMilliseconds = 15_000;
let foregroundObserverConfigured = false;

interface FirebaseWebConfiguration {
  apiKey: string;
  appId: string;
  messagingSenderId: string;
  projectId: string;
  vapidKey: string;
}

function getConfiguration(): FirebaseWebConfiguration | undefined {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  const messagingSenderId =
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;

  if (!apiKey || !appId || !messagingSenderId || !projectId || !vapidKey) {
    return undefined;
  }

  return { apiKey, appId, messagingSenderId, projectId, vapidKey };
}

function mapForegroundNotification(payload: MessagePayload): {
  options: NotificationOptions;
  title: string;
} | undefined {
  const title = payload.notification?.title;

  if (!title) {
    return undefined;
  }

  return {
    options: {
      body: payload.notification?.body,
      data: { nidunaUrl: window.location.origin },
      icon: '/pwa/icon-192.png',
      tag: 'niduna-care-update',
    },
    title,
  };
}

function configureForegroundNotifications(
  messaging: Messaging,
  serviceWorkerRegistration: ServiceWorkerRegistration,
): void {
  if (foregroundObserverConfigured) {
    return;
  }

  onMessage(messaging, (payload) => {
    const notification = mapForegroundNotification(payload);

    if (notification) {
      void serviceWorkerRegistration.showNotification(
        notification.title,
        notification.options,
      );
    }
  });
  foregroundObserverConfigured = true;
}

async function getWebMessaging(): Promise<{
  messaging: Messaging;
  serviceWorkerRegistration: ServiceWorkerRegistration;
  vapidKey: string;
} | undefined> {
  if (
    Platform.OS !== 'web' ||
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !(await isSupported())
  ) {
    return undefined;
  }

  const configuration = getConfiguration();

  if (!configuration) {
    return undefined;
  }

  const existingApp = getApps().find((app) => app.name === 'niduna-web-push');
  const app = existingApp ?? initializeApp(configuration, 'niduna-web-push');
  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    { scope: '/', updateViaCache: 'none' },
  );
  const messaging = getMessaging(app);

  configureForegroundNotifications(messaging, serviceWorkerRegistration);

  return {
    messaging,
    serviceWorkerRegistration,
    vapidKey: configuration.vapidKey,
  };
}

async function getFirebaseInstallationId(
  messaging: Messaging,
  serviceWorkerRegistration: ServiceWorkerRegistration,
  vapidKey: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let unsubscribe: () => void = () => undefined;
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      reject(new Error('firebase_registration_timeout'));
    }, registrationTimeoutMilliseconds);

    unsubscribe = onRegistered(messaging, (installationId) => {
      window.clearTimeout(timeoutId);
      unsubscribe();
      resolve(installationId);
    });

    void register(messaging, { serviceWorkerRegistration, vapidKey }).catch(
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        unsubscribe();
        reject(error);
      },
    );
  });
}

async function getRegistration(): Promise<PushDeviceRegistration | undefined> {
  if (
    Platform.OS !== 'web' ||
    typeof Notification === 'undefined' ||
    Notification.permission !== 'granted'
  ) {
    return undefined;
  }

  const webMessaging = await getWebMessaging();

  if (!webMessaging) {
    return undefined;
  }

  const token = await getFirebaseInstallationId(
    webMessaging.messaging,
    webMessaging.serviceWorkerRegistration,
    webMessaging.vapidKey,
  );

  return { platform: 'web', token };
}

export const webPushPermissionService: PushPermissionService = {
  getExistingRegistration: getRegistration,

  async requestRegistration(): Promise<PushPermissionResult> {
    if (Platform.OS !== 'web' || typeof Notification === 'undefined') {
      return { status: 'unavailable' };
    }

    const permission = Notification.permission === 'granted'
      ? Notification.permission
      : await Notification.requestPermission();

    if (permission !== 'granted') {
      return { status: 'denied' };
    }

    const registration = await getRegistration();

    return registration
      ? { registration, status: 'granted' }
      : { status: 'unavailable' };
  },
};
