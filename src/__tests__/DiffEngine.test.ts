import { describe, it, expect } from 'vitest';
import { DiffEngine } from '../services/logic/DiffEngine';

describe('DiffEngine', () => {
  const diffEngine = new DiffEngine();

  describe('calculateDiff', () => {
    it('should return null when there are no differences', () => {
      const local = { id: '1', title: 'test', updatedAt: 100 };
      const remote = { id: '1', title: 'test', updatedAt: 200 };
      
      const diff = diffEngine.calculateDiff(local, remote);
      expect(diff).toBeNull();
    });

    it('should detect field changes', () => {
      const local = { id: '1', title: 'new title', updatedAt: 100 };
      const remote = { id: '1', title: 'old title', updatedAt: 200 };
      
      const diff = diffEngine.calculateDiff(local, remote);
      expect(diff).toEqual({ title: 'new title' });
    });

    it('should ignore metadata fields', () => {
      const local = { 
        id: '1', 
        title: 'test', 
        updatedAt: 100, 
        lastSyncedAt: 90, 
        localUpdatedAt: 110,
        _metadata: { version: 1 }
      };
      const remote = { 
        id: '1', 
        title: 'test', 
        updatedAt: 200,
        lastSyncedAt: 100,
        localUpdatedAt: 120,
        _metadata: { version: 2 }
      };
      
      // All differences are in ignored fields
      const diff = diffEngine.calculateDiff(local, remote);
      expect(diff).toBeNull();
    });

    it('should detect structural changes via JSON comparison', () => {
      const local = { id: '1', tags: ['a', 'b'] };
      const remote = { id: '1', tags: ['a'] };
      
      const diff = diffEngine.calculateDiff(local, remote);
      expect(diff).toEqual({ tags: ['a', 'b'] });
    });

    it('should return null if input is missing', () => {
      expect(diffEngine.calculateDiff(null, {})).toBeNull();
      expect(diffEngine.calculateDiff({}, null)).toBeNull();
    });
  });

  describe('merge', () => {
    const baseLocal = { 
      id: '1', 
      title: 'local', 
      updatedAt: 100, 
      localUpdatedAt: 100, 
      lastSyncedAt: 100 
    };

    it('should return remote data if local is null (initial sync)', () => {
      const remote = { id: '1', title: 'remote' };
      const result = diffEngine.merge(null, remote);
      expect(result.merged).toEqual(remote);
      expect(result.conflict).toBe(false);
    });

    it('should return local data if remote is null', () => {
      const result = diffEngine.merge(baseLocal, null);
      expect(result.merged).toEqual(baseLocal);
      expect(result.conflict).toBe(false);
    });

    it('should update local if server has newer data (no conflict)', () => {
      const remote = { 
        id: '1', 
        title: 'remote update', 
        updatedAt: 200 // newer than local.lastSyncedAt (100)
      };
      
      // Local hasn't changed since last sync (localUpdatedAt === lastSyncedAt)
      const result = diffEngine.merge(baseLocal, remote);
      
      expect(result.merged).toMatchObject({ title: 'remote update' });
      expect(result.conflict).toBe(false);
      expect(result.merged.updatedAt).toBe(200);
    });

    it('should keep local if only local has changed (no conflict)', () => {
      const local = { ...baseLocal, title: 'local update', localUpdatedAt: 150 };
      const remote = { 
        id: '1', 
        title: 'old remote', 
        updatedAt: 100 // same as lastSyncedAt
      };
      
      const result = diffEngine.merge(local, remote);
      
      expect(result.merged).toMatchObject({ title: 'local update' });
      expect(result.conflict).toBe(false);
    });

    it('should detect conflict when both sides have changed', () => {
      const local = { ...baseLocal, title: 'local changes', localUpdatedAt: 150 }; // Changed since 100
      const remote = { ...baseLocal, title: 'remote changes', updatedAt: 200 };    // Changed since 100
      
      const result = diffEngine.merge(local, remote, 'server_wins');
      
      expect(result.conflict).toBe(true);
      // server_wins strategy
      expect(result.merged).toMatchObject({ title: 'remote changes' });
    });

    it('should respect client_wins strategy on conflict', () => {
      const local = { ...baseLocal, title: 'local changes', localUpdatedAt: 150 };
      const remote = { ...baseLocal, title: 'remote changes', updatedAt: 200 };
      
      const result = diffEngine.merge(local, remote, 'client_wins');
      
      expect(result.conflict).toBe(true);
      expect(result.merged).toMatchObject({ title: 'local changes' });
      // Metadata should still be updated to reflect server state
      expect(result.merged.updatedAt).toBe(200);
    });
  });

  describe('validateConsistency', () => {
    it('should return true for matching IDs', () => {
      expect(diffEngine.validateConsistency({ id: '1' }, { id: '1' })).toBe(true);
    });

    it('should return false for mismatched IDs', () => {
      expect(diffEngine.validateConsistency({ id: '1' }, { id: '2' })).toBe(false);
    });

    it('should return false if any side is missing', () => {
      expect(diffEngine.validateConsistency(null, { id: '1' })).toBe(false);
      expect(diffEngine.validateConsistency({ id: '1' }, null)).toBe(false);
    });
  });
});
