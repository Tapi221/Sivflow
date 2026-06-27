import { Readable } from 'node:stream';

import { BlobQuotaExceeded, StorageQuotaExceeded } from '../error';
import { OneKB } from './unit';

export type CheckExceededResult =
  | {
      storageQuotaExceeded: boolean;
      blobQuotaExceeded: boolean;
    }
  | undefined;

function toQuotaError(result: CheckExceededResult) {
  if (result?.blobQuotaExceeded) {
    return new BlobQuotaExceeded();
  }

  if (result?.storageQuotaExceeded) {
    return new StorageQuotaExceeded();
  }

  return undefined;
}

export async function readBuffer(
  readable: Readable,
  checkExceeded: (recvSize: number) => CheckExceededResult
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    let settled = false;

    const fail = (error: Error, destroy = true) => {
      if (settled) {
        return;
      }

      settled = true;
      if (destroy) {
        readable.destroy(error);
      }
      reject(error);
    };

    readable.on('data', chunk => {
      if (settled) {
        return;
      }

      totalSize += chunk.length;

      // check size after receive each chunk to avoid unnecessary memory usage
      const error = toQuotaError(checkExceeded(totalSize));
      if (error) {
        fail(error);
        return;
      }

      chunks.push(chunk);
    });

    readable.on('error', error => fail(error, false));
    readable.on('end', () => {
      if (settled) {
        return;
      }

      const error = toQuotaError(checkExceeded(totalSize));
      if (error) {
        fail(error, false);
      } else {
        settled = true;
        resolve(Buffer.concat(chunks, totalSize));
      }
    });
  });
}

export async function readBufferWithLimit(
  readable: Readable,
  limit: number = 500 * OneKB
): Promise<Buffer> {
  return readBuffer(readable, size =>
    size > limit
      ? { blobQuotaExceeded: true, storageQuotaExceeded: false }
      : undefined
  );
}

export async function readableToBuffer(readable: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
