import type { AppReleaseRepository } from '@/features/app-updates/application/app-release-repository';
import { supabase } from '@/shared/infrastructure/supabase/client';

export const supabaseAppReleaseRepository: AppReleaseRepository = {
  async loadLatestAndroidPreview() {
    const { data, error } = await supabase
      .from('app_releases')
      .select(
        'eas_build_id, platform, app_version, app_build_version, build_details_url, artifact_url, completed_at',
      )
      .eq('platform', 'android')
      .eq('build_profile', 'preview')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error('app_release_load_failed');
    }

    if (!data) {
      return undefined;
    }

    return {
      appBuildVersion: data.app_build_version,
      appVersion: data.app_version,
      artifactUrl: data.artifact_url,
      buildDetailsUrl: data.build_details_url,
      completedAt: data.completed_at,
      id: data.eas_build_id,
      platform: data.platform,
    };
  },
};
