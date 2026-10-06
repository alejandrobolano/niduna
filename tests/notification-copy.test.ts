import { describe, expect, it } from 'vitest';

import {
  activityNotificationCopy,
  getCareNotificationCopy,
  previewBuildNotificationCopy,
} from '../supabase/functions/_shared/notification-copy';

describe('notification copy', () => {
  it('keeps the same readable Spanish copy for native and web delivery', () => {
    expect(getCareNotificationCopy('feeding')).toEqual({
      body: 'Se ha registrado una nueva toma.',
      title: 'Nueva toma registrada',
    });
    expect(getCareNotificationCopy('diaper')).toEqual({
      body: 'Se ha registrado un cambio de pañal.',
      title: 'Cambio de pañal registrado',
    });
    expect(getCareNotificationCopy('sleep')).toEqual({
      body: 'Se ha actualizado el sueño del bebé.',
      title: 'Sueño actualizado',
    });
  });

  it('does not contain common mojibake sequences', () => {
    const notificationCopies = {
      activityNotificationCopy,
      careNotificationCopies: [
        getCareNotificationCopy('feeding'),
        getCareNotificationCopy('diaper'),
        getCareNotificationCopy('sleep'),
      ],
      previewBuildNotificationCopy,
    };

    expect(JSON.stringify(notificationCopies)).not.toMatch(/[ÃÂâ�]/);
  });

  it('preserves Spanish accents, eñe and punctuation as UTF-8', () => {
    const spanishText = '¿Qué pasó? ¡Añadió 1,25 kg al bebé!';

    expect(new TextDecoder().decode(new TextEncoder().encode(spanishText))).toBe(
      spanishText,
    );
    expect(activityNotificationCopy.note.body).toContain('añadió');
    expect(activityNotificationCopy.measurement.body).toContain('bebé');
    expect(previewBuildNotificationCopy.title).toContain('versión');
  });
});
