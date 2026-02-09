import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalDb } from '../services/localDB';
import { QueueManager } from '../services/logic/QueueManager';
import { useAuth } from '../contexts/AuthContext';
import type { ProjectMap } from '../types';

export function useProjectMap(folderId?: string) {
  const { currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const rawMaps = useLiveQuery(
    async () => {
      try {
        if (!currentUser) return [];
        const db = await getLocalDb();
        // fetch all maps for user
        const maps = await db.projectMaps.where('userId').equals(currentUser.uid).toArray();
        return maps;
      } catch (err: any) {
        console.error(`[useProjectMap] Error: ${err.message}`);
        setError(err.message);
        return [];
      }
    },
    [currentUser]
  );

  const maps = useMemo(() => {
    if (!rawMaps) return [];
    if (folderId) {
        return rawMaps.filter(m => m.folderId === folderId && !m.isDeleted);
    }
    return rawMaps.filter(m => !m.isDeleted);
  }, [rawMaps, folderId]);

  const loading = rawMaps === undefined;

  const createMap = async (mapData: Partial<ProjectMap>) => {
    if (!currentUser) throw new Error('Authentication required');

    const db = await getLocalDb();
    const queueManager = new QueueManager(db);

    const now = new Date();
    const id = crypto.randomUUID();

    const newMap: ProjectMap = {
        id,
        userId: currentUser.uid,
        createdAt: now,
        updatedAt: now,
        deviceId: 'web',
        isDeleted: false,
        folderId: mapData.folderId || folderId || '',
        name: mapData.name || 'New Map',
        nodes: mapData.nodes || [],
        ...mapData
    } as ProjectMap;

    await db.projectMaps.put(newMap);

    await queueManager.enqueue({
        id: crypto.randomUUID(),
        type: 'upload',
        entity: 'projectMap',
        payload: newMap,
        priority: 'high',
        createdAt: Date.now()
    });

    return newMap;
  };

  const updateMap = async (id: string, updates: Partial<ProjectMap>) => {
    if (!currentUser) throw new Error('Authentication required');

    const db = await getLocalDb();
    const queueManager = new QueueManager(db);

    const updatedData = {
        ...updates,
        updatedAt: new Date()
    };

    await db.projectMaps.update(id, updatedData);

    const current = await db.projectMaps.get(id);
    if (current) {
        const payload = { ...current, ...updatedData };
        await queueManager.enqueue({
            id: crypto.randomUUID(),
            type: 'upload',
            entity: 'projectMap',
            payload,
            priority: 'medium',
            createdAt: Date.now()
        });
    }
  };

  const deleteMap = async (id: string) => {
    if (!currentUser) throw new Error('Authentication required');

    const db = await getLocalDb();
    const queueManager = new QueueManager(db);

    const now = new Date();
    await db.projectMaps.update(id, { isDeleted: true, updatedAt: now });

    await queueManager.enqueue({
        id: crypto.randomUUID(),
        type: 'upload',
        entity: 'projectMap',
        payload: { id, isDeleted: true, updatedAt: now },
        priority: 'high',
        createdAt: Date.now()
    });
  };

  return {
    maps,
    loading,
    error,
    createMap,
    updateMap,
    deleteMap
  };
}
