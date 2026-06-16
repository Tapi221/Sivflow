import { useCallback, useEffect, useMemo, useReducer } from "react";
import { refreshConnectedServiceAccessToken, requestConnectedServiceAccessToken } from "@/integration/google-integration/google.oauth";
import { getServerStoredGoogleConnectedServiceAccessToken, isServerStoredGoogleOAuthEnabled } from "@/integration/google-integration/google.server-oauth";
import type { GoogleConnectedServiceAccountEntry, GoogleConnectedServiceAccountTokenUpdate } from "@/integration/google-integration/googleAccount.types";
import { createGoogleTask, deleteGoogleTask, fetchGoogleTasks, moveGoogleTask, patchGoogleTask } from "./gtask.api";
import type { GoogleTaskListAccountState } from "./useGoogleTaskLists";
import type { GoogleTaskItem, GoogleTaskListItem } from "@/sync/googletask-sync/gtaskSync.types";



type GoogleTasksAccountState = {
  tasks: GoogleTaskItem[];
  isLoading: boolean;
  error: string | null;
};
type GoogleTaskCreateInput = {
  title: string;
  notes?: string | null;
  due?: string | null;
  status?: GoogleTaskItem["status"];
};
type GoogleTaskPatchInput = {
  title?: string;
  notes?: string | null;
  due?: string | null;
  status?: GoogleTaskItem["status"];
  completed?: string | null;
};
type GoogleTasksState = Record<string, GoogleTasksAccountState>;
type GoogleTasksAction =
  | { type: "START"; accountId: string; }
  | { type: "SUCCESS"; accountId: string; tasks: GoogleTaskItem[]; }
  | { type: "ERROR"; accountId: string; error: string; }
  | { type: "UPSERT_TASK"; accountId: string; task: GoogleTaskItem; }
  | { type: "DELETE_TASK"; accountId: string; taskListId: string; taskId: string; }
  | { type: "MOVE_TASK"; accountId: string; sourceTaskListId: string; task: GoogleTaskItem; }
  | { type: "REMOVE_MISSING_ACCOUNTS"; accountIds: string[]; };
type AccountTokenSnapshot = {
  accountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  connectionStatus: GoogleConnectedServiceAccountEntry["connectionStatus"];
  taskLists: GoogleTaskListItem[];
};



const EMPTY_ACCOUNT_STATE: GoogleTasksAccountState = {
  tasks: [],
  isLoading: false,
  error: null,
};
const DEFAULT_POLL_INTERVAL_MS = 10_000;



const toErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) return String(error);

  const status = (error as Error & { status?: number; }).status;

  if (status === 401 || status === 403) {
    return "Google ToDo を自動復旧中です。";
  }

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
const getAccessTokenWithRecovery = async (
  account: AccountTokenSnapshot,
  onAccessTokenRecovered?: (update: GoogleConnectedServiceAccountTokenUpdate) => void,
): Promise<string | null> => {
  if (account.accessToken) return account.accessToken;
  return getRecoverableAccessToken(account, onAccessTokenRecovered);
};
const withRecoveredToken = async <T>(
  account: AccountTokenSnapshot,
  action: (accessToken: string) => Promise<T>,
  onAccessTokenRecovered?: (update: GoogleConnectedServiceAccountTokenUpdate) => void,
): Promise<T> => {
  const accessToken = await getAccessTokenWithRecovery(
    account,
    onAccessTokenRecovered,
  );

  if (!accessToken) {
    throw new Error("Google Tasks access token is missing");
  }

  try {
    return await action(accessToken);
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error;

    const recoveredToken = await getRecoverableAccessToken(
      account,
      onAccessTokenRecovered,
    );

    if (!recoveredToken) throw error;

    return action(recoveredToken);
  }
};
const fetchGoogleTasksWithRecovery = async (
  account: AccountTokenSnapshot,
  onAccessTokenRecovered?: (update: GoogleConnectedServiceAccountTokenUpdate) => void,
): Promise<GoogleTaskItem[]> => {
  return withRecoveredToken(account, async (accessToken) => {
    const results = await Promise.all(
      account.taskLists.map((taskList) =>
        fetchGoogleTasks({ accessToken, taskListId: taskList.id }),
      ),
    );

    return results.flat();
  }, onAccessTokenRecovered);
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

    case "UPSERT_TASK": {
      const accountState = state[action.accountId] ?? EMPTY_ACCOUNT_STATE;
      const tasks = accountState.tasks.some(
        (task) =>
          task.id === action.task.id && task.taskListId === action.task.taskListId,
      )
        ? accountState.tasks.map((task) =>
          task.id === action.task.id && task.taskListId === action.task.taskListId
            ? action.task
            : task,
        )
        : [...accountState.tasks, action.task];

      return {
        ...state,
        [action.accountId]: {
          ...accountState,
          tasks,
          isLoading: false,
          error: null,
        },
      };
    }

    case "MOVE_TASK": {
      const accountState = state[action.accountId] ?? EMPTY_ACCOUNT_STATE;
      const tasksWithoutSource = accountState.tasks.filter(
        (task) =>
          !(task.id === action.task.id && task.taskListId === action.sourceTaskListId),
      );
      const tasks = tasksWithoutSource.some(
        (task) =>
          task.id === action.task.id && task.taskListId === action.task.taskListId,
      )
        ? tasksWithoutSource.map((task) =>
          task.id === action.task.id && task.taskListId === action.task.taskListId
            ? action.task
            : task,
        )
        : [...tasksWithoutSource, action.task];

      return {
        ...state,
        [action.accountId]: {
          ...accountState,
          tasks,
          isLoading: false,
          error: null,
        },
      };
    }

    case "DELETE_TASK": {
      const accountState = state[action.accountId] ?? EMPTY_ACCOUNT_STATE;
      return {
        ...state,
        [action.accountId]: {
          ...accountState,
          tasks: accountState.tasks.filter(
            (task) =>
              !(
                task.id === action.taskId && task.taskListId === action.taskListId
              ),
          ),
          isLoading: false,
          error: null,
        },
      };
    }

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
const useGoogleTasks = (accounts: GoogleConnectedServiceAccountEntry[], taskListsByAccount: Record<string, GoogleTaskListAccountState>, onAccessTokenRecovered?: (update: GoogleConnectedServiceAccountTokenUpdate) => void) => {
  const [state, dispatch] = useReducer(reduceGoogleTasks, {});

  const accountTokens = useMemo(
    () =>
      accounts.map((account) => ({
        accountId: account.id,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        connectionStatus: account.connectionStatus,
        taskLists: taskListsByAccount[account.id]?.taskLists ?? [],
      })),
    [accounts, taskListsByAccount],
  );

  const refreshAccount = useCallback(
    async (account: AccountTokenSnapshot) => {
      if (account.connectionStatus !== "connected") return;

      if (account.taskLists.length === 0) {
        dispatch({ type: "SUCCESS", accountId: account.accountId, tasks: [] });
        return;
      }

      dispatch({ type: "START", accountId: account.accountId });

      try {
        const tasks = await fetchGoogleTasksWithRecovery(
          account,
          onAccessTokenRecovered,
        );
        dispatch({ type: "SUCCESS", accountId: account.accountId, tasks });
      } catch (error) {
        dispatch({
          type: "ERROR",
          accountId: account.accountId,
          error: toErrorMessage(error),
        });
      }
    },
    [onAccessTokenRecovered],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all(accountTokens.map((account) => refreshAccount(account)));
  }, [accountTokens, refreshAccount]);

  const findAccountForTaskList = useCallback(
    (taskListId: string) =>
      accountTokens.find((account) =>
        account.taskLists.some((taskList) => taskList.id === taskListId),
      ) ?? null,
    [accountTokens],
  );

  const createTask = useCallback(
    async (taskListId: string, input: GoogleTaskCreateInput) => {
      const account = findAccountForTaskList(taskListId);

      if (!account) throw new Error("Google ToDo リストが見つかりません");

      const task = await withRecoveredToken(
        account,
        (accessToken) => createGoogleTask({ accessToken, taskListId, input }),
        onAccessTokenRecovered,
      );

      dispatch({ type: "UPSERT_TASK", accountId: account.accountId, task });
      return task;
    },
    [findAccountForTaskList, onAccessTokenRecovered],
  );

  const updateTask = useCallback(
    async (taskListId: string, taskId: string, patch: GoogleTaskPatchInput) => {
      const account = findAccountForTaskList(taskListId);

      if (!account) throw new Error("Google ToDo リストが見つかりません");

      const task = await withRecoveredToken(
        account,
        (accessToken) => patchGoogleTask({ accessToken, taskListId, taskId, patch }),
        onAccessTokenRecovered,
      );

      dispatch({ type: "UPSERT_TASK", accountId: account.accountId, task });
      return task;
    },
    [findAccountForTaskList, onAccessTokenRecovered],
  );

  const moveTaskList = useCallback(
    async (taskListId: string, taskId: string, destinationTaskListId: string) => {
      const account = findAccountForTaskList(taskListId);

      if (!account) throw new Error("Google ToDo リストが見つかりません");

      const existingTask = state[account.accountId]?.tasks.find(
        (task) => task.id === taskId && task.taskListId === taskListId,
      ) ?? null;

      if (taskListId === destinationTaskListId) {
        return existingTask;
      }

      if (existingTask) {
        dispatch({
          type: "MOVE_TASK",
          accountId: account.accountId,
          sourceTaskListId: taskListId,
          task: { ...existingTask, taskListId: destinationTaskListId },
        });
      }

      try {
        const task = await withRecoveredToken(
          account,
          (accessToken) => moveGoogleTask({ accessToken, taskListId, taskId, destinationTaskListId }),
          onAccessTokenRecovered,
        );

        dispatch({ type: "MOVE_TASK", accountId: account.accountId, sourceTaskListId: taskListId, task });
        return task;
      } catch (error) {
        console.error("Google task move failed. Rolling back optimistic task list move.", {
          accountId: account.accountId,
          destinationTaskListId,
          error,
          taskId,
          taskListId,
        });

        if (existingTask) {
          dispatch({
            type: "MOVE_TASK",
            accountId: account.accountId,
            sourceTaskListId: destinationTaskListId,
            task: existingTask,
          });
        }

        throw error;
      }
    },
    [findAccountForTaskList, onAccessTokenRecovered, state],
  );

  const removeTask = useCallback(
    async (taskListId: string, taskId: string) => {
      const account = findAccountForTaskList(taskListId);

      if (!account) throw new Error("Google ToDo リストが見つかりません");

      await withRecoveredToken(
        account,
        (accessToken) => deleteGoogleTask({ accessToken, taskListId, taskId }),
        onAccessTokenRecovered,
      );

      dispatch({
        type: "DELETE_TASK",
        accountId: account.accountId,
        taskListId,
        taskId,
      });
    },
    [findAccountForTaskList, onAccessTokenRecovered],
  );

  useEffect(() => {
    dispatch({
      type: "REMOVE_MISSING_ACCOUNTS",
      accountIds: accountTokens.map((account) => account.accountId),
    });

    let isCancelled = false;

    for (const account of accountTokens) {
      if (isCancelled) break;
      void refreshAccount(account);
    }

    return () => {
      isCancelled = true;
    };
  }, [accountTokens, refreshAccount]);

  useEffect(() => {
    if (accountTokens.length === 0) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshAll();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshAll();
      }
    }, DEFAULT_POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accountTokens.length, refreshAll]);

  return {
    byAccount: state,
    refreshAll,
    createTask,
    updateTask,
    moveTaskList,
    removeTask,
  };
};



export { useGoogleTasks };


export type { GoogleTasksAccountState, GoogleTaskCreateInput, GoogleTaskPatchInput };
