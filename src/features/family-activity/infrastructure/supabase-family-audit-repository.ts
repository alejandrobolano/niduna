import type { FamilyAuditRepository } from '@/features/family-activity/application/family-audit-repository';
import { supabase } from '@/shared/infrastructure/supabase/client';

export const supabaseFamilyAuditRepository: FamilyAuditRepository = {
  async loadRecent(familyId) {
    const { data: rows, error } = await supabase
      .from('family_audit_logs')
      .select('id, actor_user_id, action, entity_type, details, created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error('family_audit_load_failed');
    }

    const actorIds = [
      ...new Set(
        (rows ?? [])
          .map((row) => row.actor_user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const actorNames = new Map<string, string>();

    if (actorIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', actorIds);

      if (profilesError) {
        throw new Error('family_audit_actor_load_failed');
      }

      for (const profile of profiles ?? []) {
        if (profile.display_name) {
          actorNames.set(profile.id, profile.display_name);
        }
      }
    }

    return (rows ?? []).map((row) => ({
      action: row.action,
      actorName: row.actor_user_id
        ? actorNames.get(row.actor_user_id)
        : undefined,
      createdAt: row.created_at,
      details: row.details,
      entityType: row.entity_type,
      id: row.id,
    }));
  },
};
