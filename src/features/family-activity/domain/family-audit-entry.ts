import type { MemberAvatarVariant } from '@/features/avatars/domain/avatar';
import type { FamilyRelationship } from '@/features/family/domain/family';

export type FamilyAuditAction = 'created' | 'deleted' | 'updated';

export type FamilyAuditEntityType =
  | 'baby'
  | 'baby_contact'
  | 'baby_document'
  | 'baby_note'
  | 'care_event'
  | 'family_member'
  | 'measurement';

export interface FamilyAuditEntry {
  actorAvatarKey?: MemberAvatarVariant;
  actorAvatarUrl?: string;
  action: FamilyAuditAction;
  actorId?: string;
  actorName?: string;
  actorRelationship?: FamilyRelationship;
  createdAt: string;
  details: unknown;
  entityType: FamilyAuditEntityType;
  id: number;
}
