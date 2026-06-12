interface ClipboardAdapter {
  writeText(text: string): Promise<void>;
}

export type { ClipboardAdapter };
