import type {
  NotificationRepository,
  NotificationSettings,
} from '@/features/notifications/application/notification-repository';
import {
  defaultNotificationPreferences,
  type NotificationPreferences,
} from '@/features/notifications/domain/notification-preferences';
import { supabase } from '@/shared/infrastructure/supabase/client';

function mapPreferences(
  row:
    | {
        diaper_enabled: boolean;
        feeding_enabled: boolean;
        measurement_enabled: boolean;
        note_enabled: boolean;
        paused_until: string | null;
        sleep_enabled: boolean;
      }
    | null,
): NotificationPreferences {
  if (!row) {
    return defaultNotificationPreferences;
  }

  return {
    diaperEnabled: row.diaper_enabled,
    feedingEnabled: row.feeding_enabled,
    measurementEnabled: row.measurement_enabled,
    noteEnabled: row.note_enabled,
    pausedUntil: row.paused_until ?? undefined,
    sleepEnabled: row.sleep_enabled,
  };
}

export const supabaseNotificationRepository: NotificationRepository = {
  async loadSettings(
    familyId,
    userId,
    currentRegistration,
  ): Promise<NotificationSettings> {
    const deviceQuery = currentRegistration?.platform === 'web'
      ? supabase
          .from('web_push_devices')
          .select('id')
          .eq('user_id', userId)
          .eq('firebase_installation_id', currentRegistration.token)
          .eq('is_active', true)
          .limit(1)
      : supabase
          .from('push_devices')
          .select('id')
          .eq('user_id', userId)
          .eq('expo_push_token', currentRegistration?.token ?? '')
          .eq('is_active', true)
          .limit(1);
    const [deviceResult, preferencesResult] = await Promise.all([
      deviceQuery,
      supabase
        .from('notification_preferences')
        .select(
          'feeding_enabled, diaper_enabled, sleep_enabled, note_enabled, measurement_enabled, paused_until',
        )
        .eq('family_id', familyId)
        .eq('user_id', userId)
        .maybeSingle(),
    ]);
    const error = deviceResult.error ?? preferencesResult.error;

    if (error) {
      throw new Error('notification_settings_load_failed');
    }

    return {
      hasActiveDevice: (deviceResult.data?.length ?? 0) > 0,
      preferences: mapPreferences(preferencesResult.data),
    };
  },

  async registerDevice(registration) {
    const { error } = registration.platform === 'web'
      ? await supabase.rpc('register_web_push_device', {
          target_firebase_installation_id: registration.token,
        })
      : await supabase.rpc('register_push_device', {
          target_expo_push_token: registration.token,
          target_platform: registration.platform,
        });

    if (error) {
      throw new Error('push_device_registration_failed');
    }
  },

  async savePreferences(familyId, userId, preferences) {
    const { error } = await supabase.from('notification_preferences').upsert(
      {
        diaper_enabled: preferences.diaperEnabled,
        family_id: familyId,
        feeding_enabled: preferences.feedingEnabled,
        measurement_enabled: preferences.measurementEnabled,
        note_enabled: preferences.noteEnabled,
        paused_until: preferences.pausedUntil ?? null,
        sleep_enabled: preferences.sleepEnabled,
        user_id: userId,
      },
      { onConflict: 'family_id,user_id' },
    );

    if (error) {
      throw new Error('notification_preferences_save_failed');
    }
  },
};
