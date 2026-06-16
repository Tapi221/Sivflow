type PlatformRuntimeKind = | "web" | "desktop" | "ios-native" | "android-native" | "unknown";
interface PlatformCapabilities {
  runtimeKind: PlatformRuntimeKind;
  canOpenExternalUrl: boolean;
  canControlWindow: boolean;
  canUseNativeShare: boolean;
  canUseSecureStorage: boolean;
  canImportFromFileSystem: boolean;
  canUseSystemClipboard: boolean;
}



const WEB_PLATFORM_CAPABILITIES: PlatformCapabilities = { runtimeKind: "web", canOpenExternalUrl: true, canControlWindow: false, canUseNativeShare: false, canUseSecureStorage: false, canImportFromFileSystem: true, canUseSystemClipboard: true };
const DESKTOP_PLATFORM_CAPABILITIES: PlatformCapabilities = { runtimeKind: "desktop", canOpenExternalUrl: true, canControlWindow: true, canUseNativeShare: false, canUseSecureStorage: true, canImportFromFileSystem: true, canUseSystemClipboard: true };
const IOS_NATIVE_PLATFORM_CAPABILITIES: PlatformCapabilities = { runtimeKind: "ios-native", canOpenExternalUrl: true, canControlWindow: false, canUseNativeShare: true, canUseSecureStorage: true, canImportFromFileSystem: true, canUseSystemClipboard: true };
const ANDROID_NATIVE_PLATFORM_CAPABILITIES: PlatformCapabilities = { runtimeKind: "android-native", canOpenExternalUrl: true, canControlWindow: false, canUseNativeShare: true, canUseSecureStorage: true, canImportFromFileSystem: true, canUseSystemClipboard: true };



export { WEB_PLATFORM_CAPABILITIES, DESKTOP_PLATFORM_CAPABILITIES, IOS_NATIVE_PLATFORM_CAPABILITIES, ANDROID_NATIVE_PLATFORM_CAPABILITIES };


export type { PlatformRuntimeKind, PlatformCapabilities };
