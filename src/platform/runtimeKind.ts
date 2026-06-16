import type { RuntimeKind } from "@platform/runtime/runtime.constants";
import { RUNTIME_KINDS } from "@platform/runtime/runtime.constants";
import { hasDesktopRuntime } from "./detectDesktopBridge";



const getRuntimeKind = (): RuntimeKind => {
  if (hasDesktopRuntime()) {
    return RUNTIME_KINDS.desktop;
  }

  return RUNTIME_KINDS.web;
};
const isDesktopLikeRuntime = (): boolean => getRuntimeKind() === RUNTIME_KINDS.desktop;
const isHandheldNativeRuntime = (): boolean => {
  const runtimeKind = getRuntimeKind();
  return (
    runtimeKind === RUNTIME_KINDS.ios || runtimeKind === RUNTIME_KINDS.android
  );
};



export { getRuntimeKind, isDesktopLikeRuntime, isHandheldNativeRuntime };
