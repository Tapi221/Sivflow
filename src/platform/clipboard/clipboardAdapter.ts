export interface ClipboardAdapter {
  writeText(text: string): Promise<void>;
}
