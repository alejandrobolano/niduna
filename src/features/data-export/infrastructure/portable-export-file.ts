import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { PortableDataExport } from '@/features/data-export/application/data-export-repository';
import { readBlobBytes } from '@/features/data-export/infrastructure/blob-bytes';

export async function savePortableDataExport(
  portableExport: PortableDataExport,
): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(portableExport.blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = portableExport.fileName;
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('data_export_sharing_unavailable');
  }

  const file = new File(Paths.cache, portableExport.fileName);

  try {
    file.create({ overwrite: true });
    file.write(await readBlobBytes(portableExport.blob));

    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Guardar copia de Niduna',
      mimeType: 'application/zip',
      UTI: 'public.zip-archive',
    });
  } finally {
    if (file.exists) {
      file.delete();
    }
  }
}
