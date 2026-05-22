import { useEffect, useMemo, useReducer } from "react";

import { fetchGoogleTaskLists } from "./gcal.api";
import { refreshCalendarAccessToken } from "./gcal.oauth";
import {
  getServerStoredGoogleCalendarAccessToken,
  isServerStoredGoogleOAuthEnabled,
} from "./gcal.server-oauth";
import type { GoogleTaskListItem } from "./gcalSync.types";
import type { GoogleAccountEntry } from "./useMultiAccountGoogleCalendar";

export type GoogleTaskListAccountState = {
  taskLists: GoogleTaskListItem[];
  isLoading: boolean;
  error: string | null;
};

type GoogleTaskListsState = Record<string, GoogleTaskListAccountState>;

type GoogleTaskListsAction =
  | { type: "START"; accountId: string }
  | { type: "SUCCESS"; accountId: string; taskLists: GoogleTaskListItem[] }
  | { type: "ERROR"; accountId: string; error: string }
  | { type: "REMOVE_MISSING_ACCOUNTS"; accountIds: string[] };

type AccountTokenSnapshot = {
  accountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  connectionStatus: GoogleAccountEntry["connectionStatus"];
};

const EMPTY_ACCOUNT_STATE: GoogleTaskListAccountState = {
  taskLists: [],
  isLoading: false,
  error: null,
};

const toErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) return String(error);

  const status = (error as Error & { status?: number }).status;

  if (status === 401 || status === 403) {
    return "Google ToDo リストの表示には再連携が必要です。";
  }

  return error.message;
};

const isUnauthorizedError = (error: unknown): boolean =>
  error instanceof Error &&
  ((error as Error & { status?: number }).status === 401 ||
    (error as Error & { status?: number }).status === 403);

const getRecoverableAccessToken = async (
  account: AccountTokenSnapshot,
): Promise<string | null> => {
  if (isServerStoredGoogleOAuthEnabled()) {
    const result = await getServerStoredGoogleCalendarAccessToken({
      accountId: account.accountId,
    });

    return result.accessToken;
  }

  if (!account.refreshToken) {
    return null;
  }

  const result = await refreshCalendarAccessToken({
    refreshToken: account.refreshToken,
  });

  return result.accessToken;
};

const fetchGoogleTaskListsWithRecovery = async (
  account: AccountTokenSnapshot,
): Promise<GoogleTaskListItem[]> => {
  if (!account.accessToken) {
    const recoveredToken = await getRecoverableAccessToken(account);

    if (!recoveredToken) return [];

    return fetchGoogleTaskLists(recoveredToken);
  }

  try {
    return await fetchGoogleTaskLists(account.accessToken);
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error;

    const recoveredToken = await getRecoverableAccessToken(account);

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

const buildAccountTokenKey = (accounts: GoogleAccountEntry[]) =>
  accounts
    .map((account) =>
      [
        account.id,
        account.accessToken ?? "",
        account.refreshToken ?? "",
        account.connectionStatus,
      ].join("\t"),
    )
    .join("\n");

export const useGoogleTaskLists = (accounts: GoogleAccountEntry[]) => {
  const [state, dispatch] = useReducer(reduceGoogleTaskLists, {});

  const accountTokenKey = buildAccountTokenKey(accounts);

  const accountTokens = useMemo(
    () =>
      accounts.map((account) => ({
        accountId: account.id,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        connectionStatus: account.connectionStatus,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountTokenKey],
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

      void fetchGoogleTaskListsWithRecovery(account)
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
  }, [accountTokens]);

  return state;
};