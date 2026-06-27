import { useEffect, useMemo, useReducer } from "react";
import { refreshConnectedServiceAccessToken, requestConnectedServiceAccessToken } from "@/integration/google-integration/google.oauth";
import { getServerStoredGoogleConnectedServiceAccessToken, isServerStoredGoogleOAuthEnabled } from "@/integration/google-integration/google.server-oauth";
import type { GoogleConnectedServiceAccountEntry, GoogleConnectedServiceAccountTokenUpdate } from "@/integration/google-integration/googleAccount.types";
import { fetchGoogleTaskLists } from "./gtask.api";
import type { GoogleTaskListItem } from "@/sync/googletask-sync/gtaskSync.types";



type GoogleTaskListAccountState = {
  taskLists: GoogleTaskListItem[];
  isLoading: boolean;
  error: string | null;
};
type GoogleTaskListsState = Record<string, GoogleTaskListAccountState>;
type GoogleTaskListsAction =
  | { type: "START"; accountId: string; }
  | { type: "SUCCESS"; accountId: string; taskLists: GoogleTaskListItem[]; }
  | { type: "ERROR"; accountId: string; error: string | null; }
  | { type: "REMOVE_MISSING_ACCOUNTS"; accountIds: string[]; };
type AccountTokenSnapshot = {
  accountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  connectionStatus: GoogleConnectedServiceAccountEntry["connectionStatus"];
};



const EMPTY_ACCOUNT_STATE: GoogleTaskListAccountState = {
  taskLists: [],
  isLoading: false,
  error: null,
};



const shouldHideAuthRecoveryError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  const status = (error as Error & { status?: number; }).status;
  const code = (error as Error & { code?: string; }).code;

  return status === 401 || code === "auto-recovery-pending";
};
const isGooglePermissionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  const status = (error as Error & { status?: number; }).status;
  const reason = (error as Error & { googleReason?: string; }).googleReason;

  return (
    status === 403 &&
    (reason === "authError" || reason === "insufficientPermissions")
  );
};
const toErrorMessage = (error: unknown) => {
  if (isGooglePermissionError(error)) {
    return "Google ToDo の権限が不足しています。再連携してください。";
  }

  if (shouldHideAuthRecoveryError(error)) return null;
  if (!(error instanceof Error)) return String(error);
  return error.message;
};
const isUnauthorizedError = (error: unknown): boolean =>
  error instanceof Error &&
  ((error as Error & { status?: number; }).status === 401 ||
    (error as Error & { status?: number; }).status === 403);
const getRecoverableAccessToken = async (
  account: AccountTokenSnapshot,
  onAccessTokenRecovered?: (update: GoogleConnectedServiceAccountTokenUpdate) => void,
): Promise<string | null> => {
  const applyRecoveredToken = (result: Awaited<ReturnType<typeof requestConnectedServiceAccessToken>>) => {
    onAccessTokenRecovered?.({
      accountId: account.accountId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? account.refreshToken ?? null,
      accountName: result.accountName,
      accountPhotoUrl: result.accountPhotoUrl,
      expiresInSeconds: result.expiresInSeconds,
    });

    return result.accessToken;
  };

  if (isServerStoredGoogleOAuthEnabled()) {
    const result = await getServerStoredGoogleConnectedServiceAccessToken({
      accountId: account.accountId,
    });

    onAccessTokenRecovered?.({
      accountId: account.accountId,
      accessToken: result.accessToken,
      refreshToken: null,
      accountName: result.accountName,
      accountPhotoUrl: result.accountPhotoUrl,
      expiresInSeconds: result.expiresInSeconds,
    });

    return result.accessToken;
  }

  if (!account.refreshToken) {
    const { auth } = await import("@platform/firebase/client");
    const result = await requestConnectedServiceAccessToken(auth, true);
    return applyRecoveredToken(result);
  }

  const result = await refreshConnectedServiceAccessToken({
    refreshToken: account.refreshToken,
  });

  onAccessTokenRecovered?.({
    accountId: account.accountId,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? account.refreshToken,
    accountName: result.accountName,
    accountPhotoUrl: result.accountPhotoUrl,
    expiresInSeconds: result.expiresInSeconds,
  });

  return result.accessToken;
};
const fetchGoogleTaskListsWithRecovery = async (
  account: AccountTokenSnapshot,
  onAccessTokenRecovered?: (update: GoogleConnectedServiceAccountTokenUpdate) => void,
): Promise<GoogleTaskListItem[]> => {
  if (!account.accessToken) {
    const recoveredToken = await getRecoverableAccessToken(
      account,
      onAccessTokenRecovered,
    );

    if (!recoveredToken) return [];

    return fetchGoogleTaskLists(recoveredToken);
  }

  try {
    return await fetchGoogleTaskLists(account.accessToken);
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error;

    const recoveredToken = await getRecoverableAccessToken(
      account,
      onAccessTokenRecovered,
    );

    if (!recoveredToken) throw error;

    return fetchGoogleTaskLists(recoveredToken);
  }
};
const reduceGoogleTaskLists = (
  state: GoogleTaskListsState,
  action: GoogleTaskListsAction,
): GoogleTaskListsState => {
  switch (action.type) {
    case "START":
      return {
        ...state,
        [action.accountId]: {
          ...(state[action.accountId] ?? EMPTY_ACCOUNT_STATE),
          isLoading: true,
          error: null,
        },
      };

    case "SUCCESS":
      return {
        ...state,
        [action.accountId]: {
          taskLists: action.taskLists,
          isLoading: false,
          error: null,
        },
      };

    case "ERROR":
      return {
        ...state,
        [action.accountId]: {
          ...(state[action.accountId] ?? EMPTY_ACCOUNT_STATE),
          isLoading: false,
          error: action.error,
        },
      };

    case "REMOVE_MISSING_ACCOUNTS": {
      const ids = new Set(action.accountIds);
      const entries = Object.entries(state);

      if (entries.every(([accountId]) => ids.has(accountId))) {
        return state;
      }

      const next: GoogleTaskListsState = {};

      for (const [accountId, accountState] of entries) {
        if (ids.has(accountId)) {
          next[accountId] = accountState;
        }
      }

      return next;
    }

    default:
      return state;
  }
};
const useGoogleTaskLists = (accounts: GoogleConnectedServiceAccountEntry[], onAccessTokenRecovered?: (update: GoogleConnectedServiceAccountTokenUpdate) => void, retryNonce = 0): GoogleTaskListsState => {
  const [state, dispatch] = useReducer(reduceGoogleTaskLists, {});

  const accountTokens = useMemo(
    () =>
      accounts.map((account) => ({
        accountId: account.id,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        connectionStatus: account.connectionStatus,
      })),
    [accounts],
  );

  useEffect(() => {
    dispatch({
      type: "REMOVE_MISSING_ACCOUNTS",
      accountIds: accountTokens.map((account) => account.accountId),
    });

    const abortController = new AbortController();

    for (const account of accountTokens) {
      if (account.connectionStatus !== "connected") {
        continue;
      }

      dispatch({ type: "START", accountId: account.accountId });

      void fetchGoogleTaskListsWithRecovery(account, onAccessTokenRecovered)
        .then((taskLists) => {
          if (abortController.signal.aborted) return;
          dispatch({ type: "SUCCESS", accountId: account.accountId, taskLists });
        })
        .catch((error: unknown) => {
          if (abortController.signal.aborted) return;
          dispatch({
            type: "ERROR",
            accountId: account.accountId,
            error: toErrorMessage(error),
          });
        });
    }

    return () => abortController.abort();
  }, [accountTokens, onAccessTokenRecovered, retryNonce]);

  return state;
};



export { useGoogleTaskLists };


export type { GoogleTaskListAccountState };
