import { dbEventsV1, dbHandlersV1, nbstoreHandlers } from './nbstore';
import { previewHandlers } from './preview';
import { provideExposed } from './provide';
import { vaultHandlers } from './vault';

const workspaceHandlers = {
  delete: async () => {},
  moveToTrash: async () => {},
  getBackupWorkspaces: async () => ({ items: [] }),
  deleteBackupWorkspace: async () => {},
  recoverBackupWorkspace: async () => ({}),
  listLocalWorkspaceIds: async () => [],
};

const workspaceEvents = {};

export const handlers = {
  db: dbHandlersV1,
  nbstore: nbstoreHandlers,
  workspace: workspaceHandlers,
  dialog: {},
  preview: previewHandlers,
  vault: vaultHandlers,
};

export const events = {
  db: dbEventsV1,
  workspace: workspaceEvents,
};

const getExposedMeta = () => {
  const handlersMeta = Object.entries(handlers).map(
    ([namespace, namespaceHandlers]) => {
      return [namespace, Object.keys(namespaceHandlers)] as [string, string[]];
    }
  );

  const eventsMeta = Object.entries(events).map(
    ([namespace, namespaceHandlers]) => {
      return [namespace, Object.keys(namespaceHandlers)] as [string, string[]];
    }
  );

  return {
    handlers: handlersMeta,
    events: eventsMeta,
  };
};

provideExposed(getExposedMeta());
