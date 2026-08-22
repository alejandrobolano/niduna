export interface NotificationCopy {
  body: string;
  title: string;
}

export const careNotificationCopy: NotificationCopy = {
  body: 'Alguien de tu familia actualiz\u00f3 el relevo.',
  title: 'Nuevo cuidado registrado',
};

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
