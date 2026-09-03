import type { MemberAvatarVariant } from '@/features/avatars/domain/avatar';

export type FamilyRole = 'owner' | 'admin' | 'caregiver' | 'viewer';

export type InvitableFamilyRole = Exclude<FamilyRole, 'owner'>;

export type FamilyRelationship =
  | 'mother'
  | 'father'
  | 'parent'
  | 'guardian'
  | 'grandparent'
  | 'relative'
  | 'professional_caregiver'
  | 'other';

export interface FamilyMember {
  avatarKey?: MemberAvatarVariant;
  avatarUrl?: string;
  displayName?: string;
  id: string;
  isCurrentUser: boolean;
  relationship: FamilyRelationship;
  role: FamilyRole;
  userId: string;
}

export interface FamilyInvitation {
  createdAt: string;
  expiresAt: string;
  id: string;
  role: InvitableFamilyRole;
}

export interface Family {
  currentUserRelationship: FamilyRelationship;
  currentUserRole: FamilyRole;
  id: string;
  invitations: FamilyInvitation[];
  members: FamilyMember[];
  name: string;
}

export interface CreatedFamilyInvitation {
  code: string;
  expiresAt: string;
  id: string;
}
