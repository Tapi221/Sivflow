import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";
import {
  DEVICE_LABELS,
  DEVICE_STANDALONE_MEDIA_QUERY,
  DEVICE_USER_AGENT_PATTERNS,
} from "@constants/web/device";

const resolveDeviceOsLabel = (userAgent: string) => {
  if (DEVICE_USER_AGENT_PATTERNS.android.test(userAgent)) {
    return DEVICE_LABELS.android;
  }

  if (DEVICE_USER_AGENT_PATTERNS.ios.test(userAgent)) {
    return DEVICE_LABELS.ios;
  }

  if (DEVICE_USER_AGENT_PATTERNS.windows.test(userAgent)) {
    return DEVICE_LABELS.windowsPc;
  }

  if (DEVICE_USER_AGENT_PATTERNS.mac.test(userAgent)) {
    return DEVICE_LABELS.mac;
  }

  if (DEVICE_USER_AGENT_PATTERNS.linux.test(userAgent)) {
    return DEVICE_LABELS.linuxPc;
  }

  return DEVICE_LABELS.webBrowser;
};

const resolveDeviceClientLabel = (userAgent: string, isStandalone: boolean) => {
  if (isStandalone) {
    return DEVICE_LABELS.app;
  }

  if (DEVICE_USER_AGENT_PATTERNS.edge.test(userAgent)) {
    return DEVICE_LABELS.edge;
  }

  if (DEVICE_USER_AGENT_PATTERNS.chrome.test(userAgent)) {
    return DEVICE_LABELS.chrome;
  }

  if (DEVICE_USER_AGENT_PATTERNS.safari.test(userAgent)) {
    return DEVICE_LABELS.safari;
  }

  if (DEVICE_USER_AGENT_PATTERNS.firefox.test(userAgent)) {
    return DEVICE_LABELS.firefox;
  }

  return DEVICE_LABELS.browser;
};

export const getOrCreateDeviceId = () => {
  if (typeof window === "undefined") return "server";

  let deviceId = localStorage.getItem(SHARED_STORAGE_KEYS.deviceId);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(SHARED_STORAGE_KEYS.deviceId, deviceId);
  }

  return deviceId;
};

export const getDeviceName = () => {
  if (typeof window === "undefined") return DEVICE_LABELS.server;

  const userAgent = navigator.userAgent;
  const nav = navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia(DEVICE_STANDALONE_MEDIA_QUERY).matches || nav.standalone;

  const client = resolveDeviceClientLabel(userAgent, Boolean(isStandalone));
  const os = resolveDeviceOsLabel(userAgent);

  return `${client} (${os})`;
};
