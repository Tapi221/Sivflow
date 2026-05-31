import type { User as FirebaseUser } from "firebase/auth";
import { DEV_MODE, isLocalDevHost } from "@/utils/envGuards";

type DevAuthBypassUserJson = {
  displayName: string;
  email: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  phoneNumber: null;
  photoURL: null;
  providerId: string;
  uid: string;
};

const DEV_AUTH_BYPASS_PARAM = "test_bypass";
const DEV_AUTH_BYPASS_USER_ID = "dev-ipad-user";
const DEV_AUTH_BYPASS_EMAIL = "dev-ipad-user@example.local";
const DEV_AUTH_BYPASS_DISPLAY_NAME = "Dev iPad User";
const DEV_AUTH_BYPASS_PROVIDER_ID = "dev-bypass";
const DEV_AUTH_BYPASS_TOKEN = "dev-auth-bypass-token";
const DEV_AUTH_BYPASS_TIME = "Thu, 01 Jan 2099 00:00:00 GMT";

const getCurrentUrl = (): URL | null => {
  if (typeof window === "undefined") return null;

  try {
    return new URL(window.location.href);
  } catch {
    return null;
  }
};

const createDevAuthBypassUserJson = (): DevAuthBypassUserJson => ({
  displayName: DEV_AUTH_BYPASS_DISPLAY_NAME,
  email: DEV_AUTH_BYPASS_EMAIL,
  emailVerified: true,
  isAnonymous: false,
  phoneNumber: null,
  photoURL: null,
  providerId: DEV_AUTH_BYPASS_PROVIDER_ID,
  uid: DEV_AUTH_BYPASS_USER_ID,
});

export const isDevAuthBypassEnabled = (): boolean => {
  if (!DEV_MODE) return false;

  const url = getCurrentUrl();
  if (!url) return false;

  return url.searchParams.get(DEV_AUTH_BYPASS_PARAM) === "true" && isLocalDevHost(url.hostname);
};

export const createDevAuthBypassUser = (): FirebaseUser => ({
  ...createDevAuthBypassUserJson(),
  metadata: {
    creationTime: DEV_AUTH_BYPASS_TIME,
    lastSignInTime: DEV_AUTH_BYPASS_TIME,
  },
  providerData: [],
  refreshToken: DEV_AUTH_BYPASS_TOKEN,
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => DEV_AUTH_BYPASS_TOKEN,
  getIdTokenResult: async () => ({
    authTime: DEV_AUTH_BYPASS_TIME,
    claims: {},
    expirationTime: DEV_AUTH_BYPASS_TIME,
    issuedAtTime: DEV_AUTH_BYPASS_TIME,
    signInProvider: DEV_AUTH_BYPASS_PROVIDER_ID,
    signInSecondFactor: null,
    token: DEV_AUTH_BYPASS_TOKEN,
  }),
  reload: async () => {},
  toJSON: createDevAuthBypassUserJson,
}) as unknown as FirebaseUser;
