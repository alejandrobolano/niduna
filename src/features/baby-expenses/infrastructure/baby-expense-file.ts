import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

interface BabyExpenseFile {
  content: string;
  fileName: string;
}

export async function exportBabyExpenseFile({
  content,
  fileName,
}: BabyExpenseFile): Promise<void> {
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
    throw new Error('baby_expense_sharing_unavailable');
  }

  const file = new File(Paths.cache, fileName);
  try {
    file.create({ overwrite: true });
    file.write(content);
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Exportar gastos de Niduna',
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
    });
  } finally {
    if (file.exists) file.delete();
  }
}
