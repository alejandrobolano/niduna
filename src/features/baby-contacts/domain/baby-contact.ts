export type BabyContactCategory =
  | 'health'
  | 'nutrition'
  | 'education'
  | 'activity'
  | 'emergency'
  | 'other';

export interface BabyContact {
  address?: string;
  authorUserId?: string;
  babyId: string;
  category: BabyContactCategory;
  contactPerson?: string;
  createdAt: string;
  id: string;
  isFeatured: boolean;
  name: string;
  notes?: string;
  phone?: string;
  retiredAt?: string;
  updatedAt: string;
  websiteUrl?: string;
}
