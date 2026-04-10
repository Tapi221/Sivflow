export interface JsonFileExportPort {
  exportJson: (params: { filename: string; payload: unknown }) => Promise<void>;
}
