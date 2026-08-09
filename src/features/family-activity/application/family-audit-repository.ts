import type { FamilyAuditEntry } from '@/features/family-activity/domain/family-audit-entry';

export interface FamilyAuditRepository {
  loadRecent(familyId: string): Promise<FamilyAuditEntry[]>;
}
