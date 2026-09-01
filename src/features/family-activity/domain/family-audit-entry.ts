export type FamilyAuditAction = 'created' | 'deleted' | 'updated';

export type FamilyAuditEntityType =
  | 'baby'
  | 'baby_document'
  | 'baby_note'
  | 'care_event'
  | 'family_member'
  | 'measurement';

export interface FamilyAuditEntry {
  action: FamilyAuditAction;
  actorName?: string;
  createdAt: string;
  details: unknown;
  entityType: FamilyAuditEntityType;
  id: number;
}
