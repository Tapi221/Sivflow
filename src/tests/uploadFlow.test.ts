import { renderHook, act } from '@testing-library/react-hooks';
import { useReliableFileUpload } from '../hooks/useReliableFileUpload';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as firebaseStorage from 'firebase/storage';
import * as firestore from 'firebase/firestore';

// Mock Firebase
vi.mock('@/services/firebase', () => ({
  auth: { currentUser: { uid: 'test-user-id' } },
  storage: {},
  db: {}
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'test-user-id' } })
}));

describe('useReliableFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with idle status', () => {
    const { result } = renderHook(() => useReliableFileUpload());
    expect(result.current.uploadStatus).toBe('idle');
    expect(result.current.uploadProgress).toBe(0);
  });

  it('should validate file size', async () => {
    const { result } = renderHook(() => useReliableFileUpload());
    
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const pathGen = (name: string) => `path/${name}`;

    try {
      await result.current.uploadFile(largeFile, pathGen);
    } catch (e: any) {
      expect(e.message).toContain('ファイルサイズが大きすぎます');
    }

    expect(result.current.uploadStatus).toBe('failed');
  });

  it('should validate mime type', async () => {
    const { result } = renderHook(() => useReliableFileUpload());
    
    // Invalid type for card_image
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const pathGen = (name: string) => `path/${name}`;

    try {
      await result.current.uploadFile(textFile, pathGen, { type: 'card_image' });
    } catch (e: any) {
      expect(e.message).toContain('サポートされていないファイル形式です');
    }

    expect(result.current.uploadStatus).toBe('failed');
  });
});
