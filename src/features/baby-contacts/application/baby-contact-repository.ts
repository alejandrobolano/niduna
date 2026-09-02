import type { BabyContact, BabyContactCategory } from '@/features/baby-contacts/domain/baby-contact';

export type BabyContactPageSize = 20 | 50 | 100;

export interface BabyContactDraft {
  address?: string;
  category: BabyContactCategory;
  contactPerson?: string;
  isFeatured: boolean;
  name: string;
  notes?: string;
  phone?: string;
  websiteUrl?: string;
}

export interface BabyContactPage {
  contacts: BabyContact[];
  page: number;
  pageSize: BabyContactPageSize;
  totalCount: number;
  totalPages: number;
}

export interface BabyContactFilters {
  category?: BabyContactCategory;
  retired: boolean;
  search?: string;
}

export type BabyContactErrorReason = 'invalid' | 'not_allowed' | 'unavailable';

export class BabyContactError extends Error {
  constructor(public readonly reason: BabyContactErrorReason) {
    super(reason);
  }
}

export interface BabyContactRepository {
  loadPage(
    babyId: string,
    page: number,
    pageSize: BabyContactPageSize,
    filters: BabyContactFilters,
  ): Promise<BabyContactPage>;
  save(babyId: string, draft: BabyContactDraft, contactId?: string): Promise<string>;
  setRetired(contactId: string, retired: boolean): Promise<void>;
}
