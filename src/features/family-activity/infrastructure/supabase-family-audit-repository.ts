import type { FamilyAuditRepository } from '@/features/family-activity/application/family-audit-repository';
import { supabase } from '@/shared/infrastructure/supabase/client';
import { createProfilePhotoUrls } from '@/features/avatars/infrastructure/profile-photo-urls';
import type { MemberAvatarVariant } from '@/features/avatars/domain/avatar';
import type { FamilyRelationship } from '@/features/family/domain/family';

export const supabaseFamilyAuditRepository: FamilyAuditRepository = {
  async loadPage(familyId, page, pageSize) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { count, data: rows, error } = await supabase
      .from('family_audit_logs')
      .select('id, actor_user_id, action, entity_type, details, created_at', {
        count: 'exact',
      })
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .range(from, to);

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
    const actorProfiles = new Map<string, { avatarKey?: MemberAvatarVariant; avatarUrl?: string }>();
    const actorRelationships = new Map<string, FamilyRelationship>();

    for (const actorId of actorIds) {
      actorNames.set(actorId, 'Usuario eliminado');
    }

    if (actorIds.length > 0) {
      const [profilesResult, membershipsResult] = await Promise.all([
        supabase.from('profiles').select('id, display_name, avatar_key, avatar_path').in('id', actorIds),
        supabase.from('family_members').select('user_id, relationship').eq('family_id', familyId).in('user_id', actorIds),
      ]);
      const profiles = profilesResult.data;
      const profilesError = profilesResult.error ?? membershipsResult.error;

      if (profilesError) {
        throw new Error('family_audit_actor_load_failed');
      }

      for (const profile of profiles ?? []) {
        actorNames.set(
          profile.id,
          profile.display_name || 'Un miembro de la familia',
        );
      }
      const photoUrls = await createProfilePhotoUrls((profiles ?? []).map((profile) => profile.avatar_path));
      for (const profile of profiles ?? []) {
        actorProfiles.set(profile.id, {
          avatarKey: profile.avatar_key ?? undefined,
          avatarUrl: profile.avatar_path ? photoUrls.get(profile.avatar_path) : undefined,
        });
      }
      for (const membership of membershipsResult.data ?? []) {
        actorRelationships.set(membership.user_id, membership.relationship);
      }
    }

    const total = count ?? 0;

    return {
      entries: (rows ?? []).map((row) => ({
        action: row.action,
        actorAvatarKey: row.actor_user_id ? actorProfiles.get(row.actor_user_id)?.avatarKey : undefined,
        actorAvatarUrl: row.actor_user_id ? actorProfiles.get(row.actor_user_id)?.avatarUrl : undefined,
        actorId: row.actor_user_id ?? undefined,
        actorName: row.actor_user_id
          ? actorNames.get(row.actor_user_id)
          : undefined,
        actorRelationship: row.actor_user_id ? actorRelationships.get(row.actor_user_id) : undefined,
        createdAt: row.created_at,
        details: row.details,
        entityType: row.entity_type,
        id: row.id,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
};
