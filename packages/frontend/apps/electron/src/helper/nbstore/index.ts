export { nbstoreHandlers } from './handlers';
export { getDocStoragePool } from './handlers';
export { universalId } from '@affine/nbstore';

export const dbHandlersV1 = {
  getDocAsUpdates: async (...args: any[]) => {
    const { dbHandlers } = await import('./v1');
    return dbHandlers.getDocAsUpdates(...(args as [any, string, string]));
  },
  getDocTimestamps: async (...args: any[]) => {
    const { dbHandlers } = await import('./v1');
    return dbHandlers.getDocTimestamps(...(args as [any, string]));
  },
  getBlob: async (...args: any[]) => {
    const { dbHandlers } = await import('./v1');
    return dbHandlers.getBlob(...(args as [any, string, string]));
  },
  getBlobKeys: async (...args: any[]) => {
    const { dbHandlers } = await import('./v1');
    return dbHandlers.getBlobKeys(...(args as [any, string]));
  },
};

export const dbEventsV1 = {};
