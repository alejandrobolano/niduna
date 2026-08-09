import type { FamilyAuditEntry } from '@/features/family-activity/domain/family-audit-entry';
import type { CareHistoryPageSize } from '@/features/care/application/care-history';

export interface FamilyAuditPage {
  entries: FamilyAuditEntry[];
  page: number;
  pageSize: CareHistoryPageSize;
  total: number;
  totalPages: number;
}

export interface FamilyAuditRepository {
  loadPage(
    familyId: string,
    page: number,
    pageSize: CareHistoryPageSize,
  ): Promise<FamilyAuditPage>;
}
