import type {
  DataExportRepository,
  DataExportScope,
} from '@/features/data-export/application/data-export-repository';
import { supabase } from '@/shared/infrastructure/supabase/client';

function getFileName(response: Response | undefined, scope: DataExportScope) {
  const disposition = response?.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="([^"]+)"/);

  return match?.[1] ??
    `niduna-${scope.type === 'personal' ? 'mis-datos' : 'familia'}.zip`;
}

export const supabaseDataExportRepository: DataExportRepository = {
  async create(scope) {
    const { data, error, response } = await supabase.functions.invoke(
      'export-portable-data',
      { body: scope },
    );

    if (error || !(data instanceof Blob)) {
      throw new Error('data_export_failed');
    }

    return { blob: data, fileName: getFileName(response, scope) };
  },
};
