import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import {
  FamilyStoryError,
  type PreparedStoryMedia,
} from '@/features/family-stories/application/family-story-repository';

const maximumInputBytes = 15 * 1024 * 1024;
const maximumImageBytes = 5 * 1024 * 1024;
const maximumDimension = 1600;
const maximumVideoDurationMs = 15_000;
const supportedVideoMimeTypes = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (uri.startsWith('file:') || uri.startsWith('content:')) {
    return new File(uri).arrayBuffer();
  }

  const response = await fetch(uri, { cache: 'no-store' });

  if (!response.ok && !uri.startsWith('blob:') && !uri.startsWith('data:')) {
    throw new FamilyStoryError('invalid_media');
  }

  return response.arrayBuffer();
}

async function prepareVideo(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PreparedStoryMedia> {
  const mimeType = asset.mimeType?.toLowerCase();
  const durationMs = asset.duration ?? 0;

  if (
    !mimeType ||
    !supportedVideoMimeTypes.has(mimeType) ||
    durationMs < 1 ||
    durationMs > maximumVideoDurationMs
  ) {
    throw new FamilyStoryError('invalid_media');
  }

  const bytes = await readBytes(asset.uri);

  if (bytes.byteLength < 1 || bytes.byteLength > maximumInputBytes) {
    throw new FamilyStoryError('invalid_media');
  }

  return {
    bytes,
    durationMs,
    mediaType: 'video',
    mimeType: mimeType as PreparedStoryMedia['mimeType'],
    previewUri: asset.uri,
    size: bytes.byteLength,
  };
}

async function prepareImage(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PreparedStoryMedia> {
  const longestSide = Math.max(asset.width, asset.height);
  const scale = longestSide > maximumDimension
    ? maximumDimension / longestSide
    : 1;
  const context = ImageManipulator.manipulate(asset.uri);

  if (scale < 1) {
    context.resize({
      height: Math.round(asset.height * scale),
      width: Math.round(asset.width * scale),
    });
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: 0.82,
    format: SaveFormat.JPEG,
  });
  const bytes = await readBytes(saved.uri);

  if (bytes.byteLength < 1 || bytes.byteLength > maximumImageBytes) {
    throw new FamilyStoryError('invalid_media');
  }

  return {
    bytes,
    mediaType: 'image',
    mimeType: 'image/jpeg',
    previewUri: saved.uri,
    size: bytes.byteLength,
  };
}

export async function pickAndPrepareStoryMedia(): Promise<
  PreparedStoryMedia | undefined
> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      throw new FamilyStoryError('not_allowed');
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    exif: false,
    mediaTypes: ['images', 'videos'],
    quality: 1,
    videoMaxDuration: maximumVideoDurationMs / 1000,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
  });

  if (result.canceled) {
    return undefined;
  }

  const asset = result.assets[0];

  if (!asset || asset.type === 'livePhoto') {
    throw new FamilyStoryError('invalid_media');
  }

  if (asset.fileSize && asset.fileSize > maximumInputBytes) {
    throw new FamilyStoryError('invalid_media');
  }

  return asset.type === 'video' ? prepareVideo(asset) : prepareImage(asset);
}
