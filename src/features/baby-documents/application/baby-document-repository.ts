import type {
  BabyDocument,
  BabyDocumentCategory,
  BabyDocumentMimeType,
} from '@/features/baby-documents/domain/baby-document';

export type BabyDocumentErrorReason =
  | 'invalid_file'
  | 'not_allowed'
  | 'upload_failed'
  | 'unavailable'
  | 'unknown';

export class BabyDocumentError extends Error {
  constructor(public readonly reason: BabyDocumentErrorReason) {
    super(reason);
  }
}

export interface PreparedBabyDocumentFile {
  bytes: ArrayBuffer;
  mimeType: BabyDocumentMimeType;
  name: string;
  size: number;
}

export interface BabyDocumentMetadata {
  category: BabyDocumentCategory;
  description?: string;
  displayName: string;
  documentDate?: string;
}

export interface BabyDocumentRepository {
  create(
    babyId: string,
    metadata: BabyDocumentMetadata,
    file: PreparedBabyDocumentFile,
  ): Promise<void>;
  createAccessUrl(documentId: string): Promise<string>;
  load(babyId: string, includeRetired: boolean): Promise<BabyDocument[]>;
  replace(documentId: string, file: PreparedBabyDocumentFile): Promise<void>;
  setRetired(documentId: string, retired: boolean): Promise<void>;
  updateMetadata(
    documentId: string,
    metadata: BabyDocumentMetadata,
  ): Promise<void>;
}
