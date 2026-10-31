import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

interface MedicationFile {
  content: string;
  fileName: string;
}

export async function exportMedicationFile({ content, fileName }: MedicationFile): Promise<void> {
  if (Platform.OS === 'web') {
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
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('medication_sharing_unavailable');
  }

  const file = new File(Paths.cache, fileName);
  try {
    file.create({ overwrite: true });
    file.write(content);
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Exportar administraciones de Niduna',
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
    });
  } finally {
    if (file.exists) file.delete();
  }
}
