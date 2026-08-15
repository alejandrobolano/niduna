export type DataExportScope =
  | { type: 'personal' }
  | { familyId: string; type: 'family' };

export interface PortableDataExport {
  blob: Blob;
  fileName: string;
}

export interface DataExportRepository {
  create(scope: DataExportScope): Promise<PortableDataExport>;
}
