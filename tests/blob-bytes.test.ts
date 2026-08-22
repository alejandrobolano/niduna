import { afterEach, describe, expect, it, vi } from 'vitest';

import { readBlobBytes } from '../src/features/data-export/infrastructure/blob-bytes';

describe('portable export blob conversion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses arrayBuffer when the platform blob supports it', async () => {
    const blob = {
      arrayBuffer: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
    } as unknown as Blob;

    await expect(readBlobBytes(blob)).resolves.toEqual(new Uint8Array([1, 2, 3]));
  });

  it('uses FileReader for React Native blobs without arrayBuffer', async () => {
    class NativeFileReader {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      result: ArrayBuffer | null = null;

      readAsArrayBuffer() {
        this.result = new Uint8Array([4, 5, 6]).buffer;
        this.onload?.();
      }
    }

    vi.stubGlobal('FileReader', NativeFileReader);

    await expect(readBlobBytes({} as Blob)).resolves.toEqual(
      new Uint8Array([4, 5, 6]),
    );
  });
});
