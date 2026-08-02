import type {
  CreatedFamilyInvitation,
  Family,
  FamilyRelationship,
  InvitableFamilyRole,
} from '@/features/family/domain/family';

export type FamilyOperationErrorReason =
  | 'already_member'
  | 'invalid_code'
  | 'not_allowed'
  | 'unavailable'
  | 'unknown';

export class FamilyOperationError extends Error {
  constructor(readonly reason: FamilyOperationErrorReason) {
    super(`family_operation_${reason}`);
    this.name = 'FamilyOperationError';
  }
}

export interface AcceptFamilyInvitationInput {
  code: string;
  displayName: string;
  relationship: FamilyRelationship;
}

export interface CreateFamilyInput {
  displayName: string;
  name: string;
  relationship: FamilyRelationship;
}

export interface UpdateFamilyIdentityInput {
  displayName: string;
  familyId: string;
  relationship: FamilyRelationship;
}

export interface FamilyRepository {
  acceptInvitation(input: AcceptFamilyInvitationInput): Promise<string>;
  createFamily(input: CreateFamilyInput): Promise<string>;
  createInvitation(
    familyId: string,
    role: InvitableFamilyRole,
  ): Promise<CreatedFamilyInvitation>;
  load(userId: string): Promise<Family[]>;
  removeMember(memberId: string): Promise<void>;
  revokeInvitation(invitationId: string): Promise<void>;
  updateIdentity(input: UpdateFamilyIdentityInput): Promise<void>;
}
