const localDevHostnames = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
]);

export const LOCAL_DEV_FIREBASE_BACKEND_UNAVAILABLE_MESSAGE =
  "Sivflow のバックエンド開発サーバーに接続できません。`npm run dev:web` または `npm run dev:backend` を実行してから、もう一度お試しください。";

type LocalDevFirebaseBackendCheckOptions = {
  backendEnabled?: boolean;
  error?: unknown;
  hostname?: string | null;
  responseText?: string | null;
  status?: number | null;
};

function isLocalDevHostname(hostname?: string | null) {
  return hostname ? localDevHostnames.has(hostname) : false;
}

export function createLocalDevFirebaseBackendUnavailableError() {
  return new Error(LOCAL_DEV_FIREBASE_BACKEND_UNAVAILABLE_MESSAGE);
}

export function isLocalDevFirebaseBackendUnavailableError(error: unknown) {
  return (
    error instanceof Error &&
    error.message === LOCAL_DEV_FIREBASE_BACKEND_UNAVAILABLE_MESSAGE
  );
}

export function isLocalDevFirebaseBackendUnavailable({
  backendEnabled,
  error,
  hostname,
  responseText,
  status,
}: LocalDevFirebaseBackendCheckOptions) {
  if (!backendEnabled || !isLocalDevHostname(hostname)) {
    return false;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (status === 502 || status === 503 || status === 504) {
    return true;
  }

  return status === 500 && !responseText?.trim();
}
