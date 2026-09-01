import { File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { BabyDocumentMimeType } from '@/features/baby-documents/domain/baby-document';

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'documento';
}

export async function openBabyDocument(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.location.assign(url);
    return;
  }

  await Linking.openURL(url);
}

export async function saveBabyDocument({
  fileName,
  mimeType,
  url,
}: {
  fileName: string;
  mimeType: BabyDocumentMimeType;
  url: string;
}): Promise<void> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('baby_document_download_failed');
  }

  if (Platform.OS === 'web') {
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = safeFileName(fileName);
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('baby_document_sharing_unavailable');
  }

  const file = new File(Paths.cache, safeFileName(fileName));

  try {
    file.create({ overwrite: true });
    file.write(new Uint8Array(await response.arrayBuffer()));
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Guardar o abrir documento de Niduna',
      mimeType,
    });
  } finally {
    if (file.exists) {
      file.delete();
    }
  }
}
