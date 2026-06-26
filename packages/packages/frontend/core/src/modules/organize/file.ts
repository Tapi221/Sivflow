import { getAttachmentFileIconRC } from '@blocksuite/affine/components/icons';

import type { FileNodeMetadata } from './types';

export const ORGANIZE_MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

export const parseFileNodeMetadata = (
  data: string
): FileNodeMetadata | null => {
  try {
    const metadata = JSON.parse(data) as Partial<FileNodeMetadata>;
    if (
      typeof metadata.sourceId !== 'string' ||
      typeof metadata.name !== 'string'
    ) {
      return null;
    }

    return {
      sourceId: metadata.sourceId,
      name: metadata.name,
      size: typeof metadata.size === 'number' ? metadata.size : 0,
      type:
        typeof metadata.type === 'string'
          ? metadata.type
          : 'application/octet-stream',
    };
  } catch {
    return null;
  }
};

export const getFileNodeIcon = (fileType: string) => {
  return getAttachmentFileIconRC(fileType);
};
