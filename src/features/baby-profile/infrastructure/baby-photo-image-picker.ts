import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import {
  BabyPhotoError,
  type PreparedBabyPhoto,
} from '@/features/baby-profile/application/baby-photo-repository';

const maximumInputBytes = 10 * 1024 * 1024;
const maximumOutputBytes = 2 * 1024 * 1024;
const maximumDimension = 800;

async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (uri.startsWith('file:') || uri.startsWith('content:')) {
    return new File(uri).arrayBuffer();
  }

  const response = await fetch(uri, { cache: 'no-store' });

  if (!response.ok && !uri.startsWith('blob:') && !uri.startsWith('data:')) {
    throw new BabyPhotoError('invalid_image');
  }

  return response.arrayBuffer();
}

export async function pickAndPrepareBabyPhoto(): Promise<
  PreparedBabyPhoto | undefined
> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      throw new BabyPhotoError('not_allowed');
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    exif: false,
    mediaTypes: ['images'],
    quality: 1,
  });

  if (result.canceled) {
    return undefined;
  }

  const asset = result.assets[0];

  if (
    !asset ||
    asset.type === 'video' ||
    asset.type === 'livePhoto' ||
    asset.width < 1 ||
    asset.height < 1 ||
    (asset.fileSize !== undefined && asset.fileSize > maximumInputBytes)
  ) {
    throw new BabyPhotoError('invalid_image');
  }

  const squareSize = Math.min(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);

  context.crop({
    height: squareSize,
    originX: Math.round((asset.width - squareSize) / 2),
    originY: Math.round((asset.height - squareSize) / 2),
    width: squareSize,
  });

  if (squareSize > maximumDimension) {
    context.resize({ height: maximumDimension, width: maximumDimension });
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: 0.82,
    format: SaveFormat.JPEG,
  });
  const bytes = await readBytes(saved.uri);

  if (bytes.byteLength < 1 || bytes.byteLength > maximumOutputBytes) {
    throw new BabyPhotoError('invalid_image');
  }

  return {
    bytes,
    mimeType: 'image/jpeg',
    previewUri: saved.uri,
    size: bytes.byteLength,
  };
}
