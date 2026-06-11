import * as React from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;
const useMounted = () => {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export { useMounted };
