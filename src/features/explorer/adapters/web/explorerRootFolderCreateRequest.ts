type RootFolderCreateRequestListener = () => void;

const rootFolderCreateRequestListeners = new Set<RootFolderCreateRequestListener>();

export const requestRootFolderCreate = (): boolean => {
  if (rootFolderCreateRequestListeners.size === 0) {
    return false;
  }

  [...rootFolderCreateRequestListeners].forEach((listener) => {
    listener();
  });

  return true;
};

export const subscribeRootFolderCreateRequest = (
  listener: RootFolderCreateRequestListener,
) => {
  rootFolderCreateRequestListeners.add(listener);

  return () => {
    rootFolderCreateRequestListeners.delete(listener);
  };
};
