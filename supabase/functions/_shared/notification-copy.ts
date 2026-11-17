export interface NotificationCopy {
  body: string;
  title: string;
}

export type CareNotificationType = 'diaper' | 'feeding' | 'sleep';

type BreastSide = 'both' | 'left' | 'right';
type DiaperCondition = 'both' | 'dirty' | 'wet';
type FeedingMethod = 'breast' | 'expressed_milk' | 'formula' | 'mixed';

export interface CareNotificationDetails {
  amountMilliliters?: number | null;
  breastSide?: BreastSide | null;
  diaperCondition?: DiaperCondition | null;
  endedAt?: string | null;
  eventType: CareNotificationType;
  feedingMethod?: FeedingMethod | null;
}

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
  details: CareNotificationDetails,
): NotificationCopy {
  if (details.eventType === 'feeding') {
    const method = details.feedingMethod
      ? {
          breast: 'pecho',
          expressed_milk: 'leche extra\u00edda',
          formula: 'f\u00f3rmula',
          mixed: 'pecho y f\u00f3rmula',
        }[details.feedingMethod]
      : undefined;
    const amount = typeof details.amountMilliliters === 'number' &&
        Number.isFinite(details.amountMilliliters) &&
        details.amountMilliliters > 0
      ? `${details.amountMilliliters} ml`
      : undefined;
    const side = details.breastSide
      ? {
          both: 'ambos pechos',
          left: 'pecho izquierdo',
          right: 'pecho derecho',
        }[details.breastSide]
      : undefined;
    const summary = [method, amount, side].filter(Boolean).join(' \u00b7 ');

    return {
      body: summary ? `Toma: ${summary}.` : careNotificationCopyByType.feeding.body,
      title: careNotificationCopyByType.feeding.title,
    };
  }

  if (details.eventType === 'diaper') {
    const condition = details.diaperCondition
      ? {
          both: 'pip\u00ed y caca',
          dirty: 'caca',
          wet: 'pip\u00ed',
        }[details.diaperCondition]
      : undefined;

    return {
      body: condition
        ? `Pa\u00f1al: ${condition}.`
        : careNotificationCopyByType.diaper.body,
      title: careNotificationCopyByType.diaper.title,
    };
  }

  if (!details.endedAt) {
    return {
      body: 'Se ha registrado el inicio del sue\u00f1o.',
      title: 'El beb\u00e9 empez\u00f3 a dormir',
    };
  }

  return careNotificationCopyByType.sleep;
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
