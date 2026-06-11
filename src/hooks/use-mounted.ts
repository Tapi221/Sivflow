import * as React from 'react';













const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export const useMounted = () => { return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
