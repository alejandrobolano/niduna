import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import {
  BabyDocumentError,
  type PreparedBabyDocumentFile,
} from '@/features/baby-documents/application/baby-document-repository';
import type { BabyDocumentMimeType } from '@/features/baby-documents/domain/baby-document';

export const maximumBabyDocumentBytes = 10 * 1024 * 1024;

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] satisfies BabyDocumentMimeType[];

function resolveMimeType(name: string, mimeType?: string): BabyDocumentMimeType {
  if (allowedMimeTypes.includes(mimeType as BabyDocumentMimeType)) {
    return mimeType as BabyDocumentMimeType;
  }

  const extension = name.split('.').at(-1)?.toLowerCase();

  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';

  throw new BabyDocumentError('invalid_file');
}

function hasMatchingExtension(
  name: string,
  mimeType: BabyDocumentMimeType,
): boolean {
  const extension = name.split('.').at(-1)?.toLowerCase();

  return (
    (mimeType === 'application/pdf' && extension === 'pdf') ||
    (mimeType === 'image/png' && extension === 'png') ||
    (mimeType === 'image/jpeg' && (extension === 'jpg' || extension === 'jpeg'))
  );
}

async function readDocumentBytes(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<ArrayBuffer> {
  if (asset.file) {
    return asset.file.arrayBuffer();
  }

  if (asset.uri.startsWith('file:') || asset.uri.startsWith('content:')) {
    return new File(asset.uri).arrayBuffer();
  }

  const response = await fetch(asset.uri, { cache: 'no-store' });

  if (!response.ok) {
    throw new BabyDocumentError('invalid_file');
  }

  return response.arrayBuffer();
}

export async function pickBabyDocument(): Promise<
  PreparedBabyDocumentFile | undefined
> {
  const result = await DocumentPicker.getDocumentAsync({
    base64: false,
    copyToCacheDirectory: true,
    multiple: false,
    type: allowedMimeTypes,
  });

  if (result.canceled) {
    return undefined;
  }

  const asset = result.assets[0];

  if (!asset || !asset.name.trim()) {
    throw new BabyDocumentError('invalid_file');
  }

  const mimeType = resolveMimeType(asset.name, asset.mimeType);

  if (!hasMatchingExtension(asset.name, mimeType)) {
    throw new BabyDocumentError('invalid_file');
  }

  if (asset.size !== undefined && asset.size > maximumBabyDocumentBytes) {
    throw new BabyDocumentError('invalid_file');
  }

  const bytes = await readDocumentBytes(asset);

  if (bytes.byteLength < 1 || bytes.byteLength > maximumBabyDocumentBytes) {
    throw new BabyDocumentError('invalid_file');
  }

  return {
    bytes,
    mimeType,
    name: asset.name.trim(),
    size: bytes.byteLength,
  };
}
