import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";

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
  if (typeof window === "undefined") return "Server";
  const ua = navigator.userAgent;

  let os = "Web Browser";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows PC";
  else if (/Macintosh/i.test(ua)) os = "Mac";
  else if (/Linux/i.test(ua)) os = "Linux PC";

  let client = "";
  const nav = navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || nav.standalone;

  if (isStandalone) {
    client = "App";
  } else {
    if (/Edg\//i.test(ua)) client = "Edge";
    else if (/Chrome/i.test(ua)) client = "Chrome";
    else if (/Safari/i.test(ua)) client = "Safari";
    else if (/Firefox/i.test(ua)) client = "Firefox";
    if (!client) client = "Browser";
  }

  return `${client} (${os})`;
};
