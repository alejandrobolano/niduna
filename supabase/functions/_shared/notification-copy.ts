export interface NotificationCopy {
  body: string;
  title: string;
}

export type CareNotificationType = 'diaper' | 'feeding' | 'sleep';

const careNotificationCopyByType = {
  diaper: {
    body: 'Se ha registrado un cambio de pa\u00f1al.',
    title: 'Cambio de pa\u00f1al registrado',
  },
  feeding: {
    body: 'Se ha registrado una nueva toma.',
    title: 'Nueva toma registrada',
  },
  sleep: {
    body: 'Se ha actualizado el sue\u00f1o del beb\u00e9.',
    title: 'Sue\u00f1o actualizado',
  },
} satisfies Record<CareNotificationType, NotificationCopy>;

export function getCareNotificationCopy(
  eventType: CareNotificationType,
): NotificationCopy {
  return careNotificationCopyByType[eventType];
}

export const activityNotificationCopy = {
  measurement: {
    body: 'Alguien de tu familia actualiz\u00f3 las medidas del beb\u00e9.',
    title: 'Nuevas medidas registradas',
  },
  note: {
    body: 'Alguien de tu familia a\u00f1adi\u00f3 una nota al relevo.',
    title: 'Nueva nota familiar',
  },
  story: {
    body: 'Alguien de tu familia comparti\u00f3 un nuevo momento.',
    title: 'Nueva historia familiar',
  },
} satisfies Record<'measurement' | 'note' | 'story', NotificationCopy>;

export const previewBuildNotificationCopy: NotificationCopy = {
  body: 'Ya puedes descargar la nueva APK de prueba desde Niduna.',
  title: 'Nueva versi\u00f3n de Niduna',
};
