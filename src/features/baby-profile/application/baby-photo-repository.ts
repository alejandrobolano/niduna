export type BabyPhotoErrorCode =
  | 'invalid_image'
  | 'not_allowed'
  | 'upload_failed'
  | 'unknown';

export interface PreparedBabyPhoto {
  bytes: ArrayBuffer;
  mimeType: 'image/jpeg';
  previewUri: string;
  size: number;
}

export interface ReplaceBabyPhotoInput {
  babyId: string;
  familyId: string;
  image: PreparedBabyPhoto;
}

export interface BabyPhotoRepository {
  load(babyId: string): Promise<string | undefined>;
  remove(babyId: string): Promise<void>;
  replace(input: ReplaceBabyPhotoInput): Promise<string>;
}

export class BabyPhotoError extends Error {
  constructor(readonly code: BabyPhotoErrorCode) {
    super(`baby_photo_${code}`);
    this.name = 'BabyPhotoError';
  }
}
