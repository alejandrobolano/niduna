export type BabyDocumentCategory =
  | 'report'
  | 'authorization'
  | 'card'
  | 'other';

export type BabyDocumentMimeType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png';

export interface BabyDocument {
  authorName: string;
  authorUserId?: string;
  babyId: string;
  category: BabyDocumentCategory;
  createdAt: string;
  description?: string;
  displayName: string;
  documentDate?: string;
  fileSizeBytes: number;
  id: string;
  mimeType: BabyDocumentMimeType;
  originalFileName: string;
  retiredAt?: string;
  updatedAt: string;
}
