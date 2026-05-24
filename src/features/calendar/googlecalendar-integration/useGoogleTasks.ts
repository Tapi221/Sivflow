import { useEffect, useMemo, useReducer } from "react";

import { refreshCalendarAccessToken } from "./gcal.oauth";
import {
  getServerStoredGoogleCalendarAccessToken,
  isServerStoredGoogleOAuthEnabled,
} from "./gcal.server-oauth";
import { fetchGoogleTasks } from "./gcal.tasks-api";
import type { GoogleTaskItem, GoogleTaskListItem } from "./gcalSync.types";
import type { GoogleAccountEntry } from "./useMultiAccountGoogleCalendar";
import type { GoogleTaskListAccountState } from "./useGoogleTaskLists";

export type GoogleTasksAccountState = {
  tasks: GoogleTaskItem[];
  isLoading: boolean;
  error: string | null;
};

type GoogleTasksState = Record<string, GoogleTasksAccountState>;

type GoogleTasksAction =
  | { type: "START"; accountId: string }
  | { type: "SUCCESS"; accountId: string; tasks: GoogleTaskItem[] }
  | { type: "ERROR"; accountId: string; error: string }
  | { type: "REMOVE_MISSING_ACCOUNTS"; accountIds: string[] };

type AccountTokenSnapshot = {
  accountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  connectionStatus: GoogleAccountEntry["connectionStatus"];
  taskLists: GoogleTaskListItem[];
};

const EMPTY_ACCOUNT_STATE: GoogleTasksAccountState = {
  tasks: [],
  isLoading: false,
  error: null,
};

const toErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) return String(error);

  const status = (error as Error & { status?: number }).status;

  if (status === 401 || status === 403) {
    return "Google ToDo の表示には再連携が必要です。";
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

const fetchGoogleTasksWithRecovery = async (
  account: AccountTokenSnapshot,
): Promise<GoogleTaskItem[]> => {
  const fetchAll = async (accessToken: string) => {
    const results = await Promise.all(
      account.taskLists.map((taskList) =>
        fetchGoogleTasks({ accessToken, taskListId: taskList.id }),
      ),
    );

    return results.flat();
  };

  if (!account.accessToken) {
    const recoveredToken = await getRecoverableAccessToken(account);

    if (!recoveredToken) return [];

    return fetchAll(recoveredToken);
  }

  try {
    return await fetchAll(account.accessToken);
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error;

    const recoveredToken = await getRecoverableAccessToken(account);

    if (!recoveredToken) throw error;

    return fetchAll(recoveredToken);
  }
};

const reduceGoogleTasks = (
  state: GoogleTasksState,
  action: GoogleTasksAction,
): GoogleTasksState => {
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
          tasks: action.tasks,
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

      const next: GoogleTasksState = {};

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

const buildAccountTokenKey = (
  accounts: GoogleAccountEntry[],
  taskListsByAccount: Record<string, GoogleTaskListAccountState>,
) =>
  accounts
    .map((account) => {
      const taskLists = taskListsByAccount[account.id]?.taskLists ?? [];

      return [
        account.id,
        account.accessToken ?? "",
        account.refreshToken ?? "",
        account.connectionStatus,
        taskLists.map((taskList) => taskList.id).join(","),
      ].join("\t");
    })
    .join("\n");

export const useGoogleTasks = (
  accounts: GoogleAccountEntry[],
  taskListsByAccount: Record<string, GoogleTaskListAccountState>,
) => {
  const [state, dispatch] = useReducer(reduceGoogleTasks, {});

  const accountTokenKey = buildAccountTokenKey(accounts, taskListsByAccount);

  const accountTokens = useMemo(
    () =>
      accounts.map((account) => ({
        accountId: account.id,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        connectionStatus: account.connectionStatus,
        taskLists: taskListsByAccount[account.id]?.taskLists ?? [],
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

      if (account.taskLists.length === 0) {
        dispatch({ type: "SUCCESS", accountId: account.accountId, tasks: [] });
        continue;
      }

      dispatch({ type: "START", accountId: account.accountId });

      void fetchGoogleTasksWithRecovery(account)
        .then((tasks) => {
          if (abortController.signal.aborted) return;
          dispatch({ type: "SUCCESS", accountId: account.accountId, tasks });
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
