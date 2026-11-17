import { describe, expect, it } from 'vitest';

import {
  activityNotificationCopy,
  getCareNotificationCopy,
  previewBuildNotificationCopy,
} from '../supabase/functions/_shared/notification-copy';

describe('notification copy', () => {
  it('keeps the same readable Spanish copy for native and web delivery', () => {
    expect(getCareNotificationCopy({ eventType: 'feeding' })).toEqual({
      body: 'Se ha registrado una nueva toma.',
      title: 'Nueva toma registrada',
    });
    expect(getCareNotificationCopy({ eventType: 'diaper' })).toEqual({
      body: 'Se ha registrado un cambio de pañal.',
      title: 'Cambio de pañal registrado',
    });
    expect(getCareNotificationCopy({ eventType: 'sleep' })).toEqual({
      body: 'Se ha registrado el inicio del sueño.',
      title: 'El bebé empezó a dormir',
    });
  });

  it('describes feeding details without including free-form notes', () => {
    expect(getCareNotificationCopy({
      amountMilliliters: 120,
      breastSide: 'left',
      eventType: 'feeding',
      feedingMethod: 'breast',
    })).toEqual({
      body: 'Toma: pecho · 120 ml · pecho izquierdo.',
      title: 'Nueva toma registrada',
    });
    expect(getCareNotificationCopy({
      eventType: 'feeding',
      feedingMethod: 'formula',
    })).toEqual({
      body: 'Toma: fórmula.',
      title: 'Nueva toma registrada',
    });
  });

  it.each([
    ['wet', 'Pañal: pipí.'],
    ['dirty', 'Pañal: caca.'],
    ['both', 'Pañal: pipí y caca.'],
  ] as const)('describes a %s diaper', (diaperCondition, body) => {
    expect(getCareNotificationCopy({
      diaperCondition,
      eventType: 'diaper',
    })).toEqual({ body, title: 'Cambio de pañal registrado' });
  });

  it('keeps a safe fallback for a completed sleep event', () => {
    expect(getCareNotificationCopy({
      endedAt: '2026-11-17T08:00:00.000Z',
      eventType: 'sleep',
    })).toEqual({
      body: 'Se ha actualizado el sueño del bebé.',
      title: 'Sueño actualizado',
    });
  });

  it('does not contain common mojibake sequences', () => {
    const notificationCopies = {
      activityNotificationCopy,
      careNotificationCopies: [
        getCareNotificationCopy({ eventType: 'feeding' }),
        getCareNotificationCopy({ eventType: 'diaper' }),
        getCareNotificationCopy({ eventType: 'sleep' }),
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
