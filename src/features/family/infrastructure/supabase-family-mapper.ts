import type {
  Family,
  FamilyInvitation,
  FamilyMember,
  FamilyRelationship,
  FamilyRole,
  InvitableFamilyRole,
} from '@/features/family/domain/family';

export interface FamilyRow {
  created_at: string;
  id: string;
  name: string;
}

export interface FamilyMemberRow {
  family_id: string;
  id: string;
  relationship: FamilyRelationship;
  role: FamilyRole;
  user_id: string;
}

export interface ProfileRow {
  display_name: string | null;
  id: string;
}

export interface FamilyInvitationRow {
  created_at: string;
  expires_at: string;
  family_id: string;
  id: string;
  role: InvitableFamilyRole;
}

export function mapFamilies(
  families: FamilyRow[],
  members: FamilyMemberRow[],
  profiles: ProfileRow[],
  invitations: FamilyInvitationRow[],
  currentUserId: string,
): Family[] {
  const displayNameByUserId = new Map(
    profiles.map((profile) => [profile.id, profile.display_name ?? undefined]),
  );

  return families.flatMap((family) => {
    const familyMembers: FamilyMember[] = members
      .filter((member) => member.family_id === family.id)
      .map((member) => ({
        displayName: displayNameByUserId.get(member.user_id),
        id: member.id,
        isCurrentUser: member.user_id === currentUserId,
        relationship: member.relationship,
        role: member.role,
        userId: member.user_id,
      }));
    const currentMembership = familyMembers.find(
      (member) => member.isCurrentUser,
    );

    if (!currentMembership) {
      return [];
    }

    const familyInvitations: FamilyInvitation[] = invitations
      .filter((invitation) => invitation.family_id === family.id)
      .map((invitation) => ({
        createdAt: invitation.created_at,
        expiresAt: invitation.expires_at,
        id: invitation.id,
        role: invitation.role,
      }));

    return [
      {
        currentUserRelationship: currentMembership.relationship,
        currentUserRole: currentMembership.role,
        id: family.id,
        invitations: familyInvitations,
        members: familyMembers,
        name: family.name,
      },
    ];
  });
}
