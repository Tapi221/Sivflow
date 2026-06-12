import type { User as FirebaseUser } from "firebase/auth";
import { DEV_MODE, isLocalDevHost } from "./envGuards";



type DevPreviewUserJson = {
  displayName: string;
  email: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  phoneNumber: null;
  photoURL: null;
  providerId: string;
  uid: string;
};



const DEV_PREVIEW_DISABLE_PARAM = "real_auth";
const DEV_PREVIEW_USER_ID = "dev-ipad-user";
const DEV_PREVIEW_EMAIL = "dev-ipad-user@example.local";
const DEV_PREVIEW_DISPLAY_NAME = "Dev iPad User";
const DEV_PREVIEW_PROVIDER_ID = "dev-preview";
const DEV_PREVIEW_TOKEN = "dev-preview-token";
const DEV_PREVIEW_TIME = "Thu, 01 Jan 2099 00:00:00 GMT";



const getCurrentUrl = (): URL | null => {
  if (typeof window === "undefined") return null;

  try {
    return new URL(window.location.href);
  } catch {
    return null;
  }
};
const createDevPreviewUserJson = (): DevPreviewUserJson => ({
  displayName: DEV_PREVIEW_DISPLAY_NAME,
  email: DEV_PREVIEW_EMAIL,
  emailVerified: true,
  isAnonymous: false,
  phoneNumber: null,
  photoURL: null,
  providerId: DEV_PREVIEW_PROVIDER_ID,
  uid: DEV_PREVIEW_USER_ID,
});
const isDevPreviewSessionEnabled = (): boolean => {
  if (!DEV_MODE) return false;

  const url = getCurrentUrl();
  if (!url) return false;
  if (url.searchParams.get(DEV_PREVIEW_DISABLE_PARAM) === "true") return false;

  return isLocalDevHost(url.hostname);
};
const disableDevPreviewSession = (): void => {
  const url = getCurrentUrl();
  if (!url || typeof window === "undefined") return;

  url.searchParams.set(DEV_PREVIEW_DISABLE_PARAM, "true");
  window.history.replaceState(window.history.state, "", url.toString());
};
const createDevPreviewUser = (): FirebaseUser => ({ ...createDevPreviewUserJson(), metadata: { creationTime: DEV_PREVIEW_TIME, lastSignInTime: DEV_PREVIEW_TIME }, providerData: [], refreshToken: DEV_PREVIEW_TOKEN, tenantId: null, delete: async () => {}, getIdToken: async () => DEV_PREVIEW_TOKEN, getIdTokenResult: async () => ({ authTime: DEV_PREVIEW_TIME, claims: {}, expirationTime: DEV_PREVIEW_TIME, issuedAtTime: DEV_PREVIEW_TIME, signInProvider: DEV_PREVIEW_PROVIDER_ID, signInSecondFactor: null, token: DEV_PREVIEW_TOKEN }), reload: async () => {}, toJSON: createDevPreviewUserJson }) as unknown as FirebaseUser;



export { isDevPreviewSessionEnabled, disableDevPreviewSession, createDevPreviewUser };
