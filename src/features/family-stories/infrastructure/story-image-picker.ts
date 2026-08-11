import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import {
  FamilyStoryError,
  type PreparedStoryImage,
} from '@/features/family-stories/application/family-story-repository';

const maximumInputBytes = 15 * 1024 * 1024;
const maximumOutputBytes = 5 * 1024 * 1024;
const maximumDimension = 1600;

async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (uri.startsWith('file:') || uri.startsWith('content:')) {
    return new File(uri).arrayBuffer();
  }

  const response = await fetch(uri, { cache: 'no-store' });

  if (!response.ok && !uri.startsWith('blob:') && !uri.startsWith('data:')) {
    throw new FamilyStoryError('invalid_image');
  }

  return response.arrayBuffer();
}

export async function pickAndPrepareStoryImage(): Promise<
  PreparedStoryImage | undefined
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
    mediaTypes: ['images'],
    quality: 1,
  });

  if (result.canceled) {
    return undefined;
  }

  const asset = result.assets[0];

  if (!asset || asset.type === 'video' || asset.type === 'livePhoto') {
    throw new FamilyStoryError('invalid_image');
  }

  if (asset.fileSize && asset.fileSize > maximumInputBytes) {
    throw new FamilyStoryError('invalid_image');
  }

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

  if (bytes.byteLength < 1 || bytes.byteLength > maximumOutputBytes) {
    throw new FamilyStoryError('invalid_image');
  }

  return {
    bytes,
    mimeType: 'image/jpeg',
    previewUri: saved.uri,
    size: bytes.byteLength,
  };
}
