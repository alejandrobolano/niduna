import {
  FamilyOperationError,
  type FamilyOperationErrorReason,
  type FamilyRepository,
} from '@/features/family/application/family-repository';
import { formatInvitationCode } from '@/features/family/application/invitation-code';
import {
  mapFamilies,
  type FamilyInvitationRow,
} from '@/features/family/infrastructure/supabase-family-mapper';
import { supabase } from '@/shared/infrastructure/supabase/client';

function mapErrorReason(message: string): FamilyOperationErrorReason {
  if (message.includes('invalid_invitation_code')) {
    return 'invalid_code';
  }

  if (message.includes('invitation_unavailable')) {
    return 'unavailable';
  }

  if (message.includes('already_family_member')) {
    return 'already_member';
  }

  if (
    message.includes('family_member_removal_not_allowed') ||
    message.includes('family_ownership_transfer_not_allowed') ||
    message.includes('row-level security') ||
    message.includes('permission denied')
  ) {
    return 'not_allowed';
  }

  return 'unknown';
}

function throwOperationError(message: string): never {
  throw new FamilyOperationError(mapErrorReason(message));
}

export const supabaseFamilyRepository: FamilyRepository = {
  async load(userId) {
    const { data: currentMemberships, error: membershipError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (membershipError) {
      throwOperationError(membershipError.message);
    }

    const familyIds = currentMemberships.map(
      (membership) => membership.family_id,
    );

    if (familyIds.length === 0) {
      return [];
    }

    const [familiesResult, membersResult, invitationsResult] = await Promise.all([
      supabase
        .from('families')
        .select('id, name, created_at')
        .in('id', familyIds)
        .order('created_at', { ascending: true }),
      supabase
        .from('family_members')
        .select('id, family_id, user_id, role, relationship')
        .in('family_id', familyIds)
        .order('created_at', { ascending: true }),
      supabase
        .from('family_invitations')
        .select('id, family_id, role, expires_at, created_at')
        .in('family_id', familyIds)
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ]);

    const operationError =
      familiesResult.error ?? membersResult.error ?? invitationsResult.error;

    if (operationError) {
      throwOperationError(operationError.message);
    }

    const families = familiesResult.data ?? [];
    const members = membersResult.data ?? [];
    const invitations = invitationsResult.data ?? [];
    const userIds = [...new Set(members.map((member) => member.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);

    if (profilesError) {
      throwOperationError(profilesError.message);
    }

    return mapFamilies(
      families,
      members,
      profiles,
      invitations as FamilyInvitationRow[],
      userId,
    );
  },

  async createFamily(input) {
    const { data, error } = await supabase.rpc('create_family', {
      target_display_name: input.displayName,
      target_name: input.name,
      target_relationship: input.relationship,
    });

    if (error || !data) {
      throwOperationError(error?.message ?? 'family_creation_failed');
    }

    return data;
  },

  async createInvitation(familyId, role) {
    const { data, error } = await supabase.rpc('create_family_invitation', {
      target_family_id: familyId,
      target_role: role,
      validity_hours: 48,
    });
    const invitation = data?.[0];

    if (error || !invitation) {
      throwOperationError(error?.message ?? 'invitation_creation_failed');
    }

    return {
      code: formatInvitationCode(invitation.invitation_code),
      expiresAt: invitation.invitation_expires_at,
      id: invitation.invitation_id,
    };
  },

  async revokeInvitation(invitationId) {
    const { error } = await supabase.rpc('revoke_family_invitation', {
      target_invitation_id: invitationId,
    });

    if (error) {
      throwOperationError(error.message);
    }
  },

  async removeMember(memberId) {
    const { error } = await supabase.rpc('remove_family_member', {
      target_member_id: memberId,
    });

    if (error) {
      throwOperationError(error.message);
    }
  },

  async transferOwnership(memberId) {
    const { error } = await supabase.rpc('transfer_family_ownership', {
      target_member_id: memberId,
    });

    if (error) {
      throwOperationError(error.message);
    }
  },

  async acceptInvitation(input) {
    const { data, error } = await supabase.rpc('accept_family_invitation', {
      target_code: input.code,
      target_display_name: input.displayName,
      target_relationship: input.relationship,
    });

    if (error || !data) {
      throwOperationError(error?.message ?? 'invitation_acceptance_failed');
    }

    return data;
  },

  async updateIdentity(input) {
    const { error } = await supabase.rpc('update_my_family_identity', {
      target_display_name: input.displayName,
      target_family_id: input.familyId,
      target_relationship: input.relationship,
    });

    if (error) {
      throwOperationError(error.message);
    }
  },
};
