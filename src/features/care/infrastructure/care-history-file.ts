import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

interface CareHistoryFile {
  content: string;
  fileName: string;
}

function downloadOnWeb({ content, fileName }: CareHistoryFile): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function exportCareHistoryFile(
  careHistoryFile: CareHistoryFile,
): Promise<void> {
  if (Platform.OS === 'web') {
    downloadOnWeb(careHistoryFile);
    return;
  }

  const available = await Sharing.isAvailableAsync();

  if (!available) {
    throw new Error('care_history_sharing_unavailable');
  }

  const file = new File(Paths.cache, careHistoryFile.fileName);
  file.create({ overwrite: true });
  file.write(careHistoryFile.content);

  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Exportar historial de Niduna',
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
