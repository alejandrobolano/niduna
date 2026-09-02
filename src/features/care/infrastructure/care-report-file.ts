import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

interface CareReportFile {
  fileName: string;
  html: string;
}

function printReportOnWeb({ fileName, html }: CareReportFile): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.height = '0';
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.width = '0';
  frame.style.border = '0';
  frame.srcdoc = html.replace(
    '</head>',
    `<script>document.title = ${JSON.stringify(fileName.replace(/\.pdf$/i, ''))};</script></head>`,
  );

  frame.addEventListener('load', () => {
    const printWindow = frame.contentWindow;
    if (!printWindow) {
      frame.remove();
      return;
    }

    printWindow.focus();
    printWindow.print();
    window.setTimeout(() => frame.remove(), 60_000);
  }, { once: true });

  document.body.append(frame);
}

export async function exportCareReportFile(
  report: CareReportFile,
): Promise<void> {
  if (Platform.OS === 'web') {
    printReportOnWeb(report);
    return;
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('care_report_sharing_unavailable');

  const { uri } = await Print.printToFileAsync({
    height: 842,
    html: report.html,
    width: 595,
  });

  await Sharing.shareAsync(uri, {
    dialogTitle: 'Compartir informe de Niduna',
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}
