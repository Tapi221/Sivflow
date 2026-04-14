export type PlatformRuntimeKind =
  | "web"
  | "electron"
  | "ios-native"
  | "android-native"
  | "unknown";

export interface PlatformCapabilities {
  runtimeKind: PlatformRuntimeKind;
  canOpenExternalUrl: boolean;
  canControlWindow: boolean;
  canUseNativeShare: boolean;
  canUseSecureStorage: boolean;
  canImportFromFileSystem: boolean;
  canUseSystemClipboard: boolean;
}

export const WEB_PLATFORM_CAPABILITIES: PlatformCapabilities = {
  runtimeKind: "web",
  canOpenExternalUrl: true,
  canControlWindow: false,
  canUseNativeShare: false,
  canUseSecureStorage: false,
  canImportFromFileSystem: true,
  canUseSystemClipboard: true,
};

export const ELECTRON_PLATFORM_CAPABILITIES: PlatformCapabilities = {
  runtimeKind: "electron",
  canOpenExternalUrl: true,
  canControlWindow: true,
  canUseNativeShare: false,
  canUseSecureStorage: true,
  canImportFromFileSystem: true,
  canUseSystemClipboard: true,
};

export const IOS_NATIVE_PLATFORM_CAPABILITIES: PlatformCapabilities = {
  runtimeKind: "ios-native",
  canOpenExternalUrl: true,
  canControlWindow: false,
  canUseNativeShare: true,
  canUseSecureStorage: true,
  canImportFromFileSystem: true,
  canUseSystemClipboard: true,
};

export const ANDROID_NATIVE_PLATFORM_CAPABILITIES: PlatformCapabilities = {
  runtimeKind: "android-native",
  canOpenExternalUrl: true,
  canControlWindow: false,
  canUseNativeShare: true,
  canUseSecureStorage: true,
  canImportFromFileSystem: true,
  canUseSystemClipboard: true,
};
