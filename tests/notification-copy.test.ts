import { describe, expect, it } from 'vitest';

import {
  activityNotificationCopy,
  careNotificationCopy,
  previewBuildNotificationCopy,
} from '../supabase/functions/_shared/notification-copy';

describe('notification copy', () => {
  it('keeps the same readable Spanish copy for native and web delivery', () => {
    expect(careNotificationCopy).toEqual({
      body: 'Alguien de tu familia actualizó el relevo.',
      title: 'Nuevo cuidado registrado',
    });
  });

  it('does not contain common mojibake sequences', () => {
    const notificationCopies = {
      activityNotificationCopy,
      careNotificationCopy,
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
