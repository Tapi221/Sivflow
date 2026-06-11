import { RUNTIME_KINDS, type RuntimeKind } from "@platform/runtime/runtime.constants";
import { hasDesktopRuntime } from "./detectDesktopBridge";



export const getRuntimeKind = (): RuntimeKind => { if (hasDesktopRuntime()) { return RUNTIME_KINDS.desktop;
  }

  return RUNTIME_KINDS.web;
};
export const isDesktopLikeRuntime = (): boolean => getRuntimeKind() === RUNTIME_KINDS.desktop;
export const isHandheldNativeRuntime = (): boolean => { const runtimeKind = getRuntimeKind();
  return (
    runtimeKind === RUNTIME_KINDS.ios || runtimeKind === RUNTIME_KINDS.android
  );
};
