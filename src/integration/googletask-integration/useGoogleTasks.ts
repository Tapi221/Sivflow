import { useCallback, useEffect, useMemo, useReducer } from "react";
import { refreshConnectedServiceAccessToken, requestConnectedServiceAccessToken } from "@/integration/google-integration/google.oauth";
import { getServerStoredGoogleConnectedServiceAccessToken, isServerStoredGoogleOAuthEnabled } from "@/integration/google-integration/google.server-oauth";
import type { GoogleConnectedServiceAccountEntry, GoogleConnectedServiceAccountTokenUpdate } from "@/integration/google-integration/googleAccount.types";
import type { GoogleTaskItem, GoogleTaskListItem } from "@/sync/googletask-sync/gtaskSync.types";
import { createGoogleTask, deleteGoogleTask, fetchGoogleTasks, moveGoogleTask, patchGoogleTask } from "./gtask.api";
import type { GoogleTaskListAccountState } from "./useGoogleTaskLists";

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
    const { auth } = await import("@/infrastructure/firebase/client");
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
): Promise<T | null> => {
  const accessToken = await getAccessTokenWithRecovery(account, onAccessTokenRecovered);
  if (!accessToken) return null;

  try {
    return await action(accessToken);
  } catch (error) {
    if (!isUnauthorizedError(error) || !account.refreshToken) throw error;

    const refreshed = await refreshConnectedServiceAccessToken({ refreshToken: account.refreshToken });
    onAccessTokenRecovered?.({
      accountId: account.accountId,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? account.refreshToken,
      accountName: refreshed.accountName,
      accountPhotoUrl: refreshed.accountPhotoUrl,
      expiresInSeconds: refreshed.expiresInSeconds,
    });

    return action(refreshed.accessToken);
  }
};
const reduceTasks = (state: GoogleTasksState, action: GoogleTasksAction): GoogleTasksState => {
  switch (action.type) {
    case "START":
      return { ...state, [action.accountId]: { tasks: state[action.accountId]?.tasks ?? [], isLoading: true, error: null } };
    case "SUCCESS":
      return { ...state, [action.accountId]: { tasks: action.tasks, isLoading: false, error: null } };
    case "ERROR":
      return { ...state, [action.accountId]: { tasks: state[action.accountId]?.tasks ?? [], isLoading: false, error: action.error } };
    case "UPSERT_TASK": {
      const current = state[action.accountId] ?? EMPTY_ACCOUNT_STATE;
      const index = current.tasks.findIndex((task) => task.id === action.task.id && task.taskListId === action.task.taskListId);
      const tasks = index >= 0 ? current.tasks.map((task, taskIndex) => taskIndex === index ? action.task : task) : [action.task, ...current.tasks];
      return { ...state, [action.accountId]: { ...current, tasks } };
    }
    case "DELETE_TASK": {
      const current = state[action.accountId] ?? EMPTY_ACCOUNT_STATE;
      return { ...state, [action.accountId]: { ...current, tasks: current.tasks.filter((task) => task.id !== action.taskId || task.taskListId !== action.taskListId) } };
    }
    case "MOVE_TASK": {
      const current = state[action.accountId] ?? EMPTY_ACCOUNT_STATE;
      const withoutMoved = current.tasks.filter((task) => task.id !== action.task.id || task.taskListId !== action.sourceTaskListId);
      return { ...state, [action.accountId]: { ...current, tasks: [action.task, ...withoutMoved] } };
    }
    case "REMOVE_MISSING_ACCOUNTS": {
      const accountIds = new Set(action.accountIds);
      return Object.fromEntries(Object.entries(state).filter(([accountId]) => accountIds.has(accountId)));
    }
    default:
      return state;
  }
};

const useGoogleTasks = (
  accounts: GoogleTaskListAccountState[],
  onAccessTokenRecovered?: (update: GoogleConnectedServiceAccountTokenUpdate) => void,
) => {
  const [tasksByAccount, dispatch] = useReducer(reduceTasks, {});
  const accountSnapshots = useMemo<AccountTokenSnapshot[]>(() => accounts.map((account) => ({
    accountId: account.id,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    connectionStatus: account.connectionStatus,
    taskLists: account.taskLists,
  })), [accounts]);

  const loadAccountTasks = useCallback(async (account: AccountTokenSnapshot) => {
    dispatch({ type: "START", accountId: account.accountId });

    try {
      const tasks = await withRecoveredToken(
        account,
        async (accessToken) => {
          const allTasks = await Promise.all(account.taskLists.map((taskList) => fetchGoogleTasks(accessToken, taskList.id)));
          return allTasks.flat();
        },
        onAccessTokenRecovered,
      );
      dispatch({ type: "SUCCESS", accountId: account.accountId, tasks: tasks ?? [] });
    } catch (error) {
      dispatch({ type: "ERROR", accountId: account.accountId, error: toErrorMessage(error) });
    }
  }, [onAccessTokenRecovered]);

  const reload = useCallback(async () => {
    await Promise.all(accountSnapshots.map((account) => loadAccountTasks(account)));
  }, [accountSnapshots, loadAccountTasks]);

  const createTask = useCallback(async (accountId: string, taskListId: string, input: GoogleTaskCreateInput) => {
    const account = accountSnapshots.find((snapshot) => snapshot.accountId === accountId);
    if (!account) return null;

    const task = await withRecoveredToken(account, (accessToken) => createGoogleTask(accessToken, taskListId, input), onAccessTokenRecovered);
    if (task) dispatch({ type: "UPSERT_TASK", accountId, task });
    return task;
  }, [accountSnapshots, onAccessTokenRecovered]);

  const updateTask = useCallback(async (accountId: string, taskListId: string, taskId: string, input: GoogleTaskPatchInput) => {
    const account = accountSnapshots.find((snapshot) => snapshot.accountId === accountId);
    if (!account) return null;

    const task = await withRecoveredToken(account, (accessToken) => patchGoogleTask(accessToken, taskListId, taskId, input), onAccessTokenRecovered);
    if (task) dispatch({ type: "UPSERT_TASK", accountId, task });
    return task;
  }, [accountSnapshots, onAccessTokenRecovered]);

  const removeTask = useCallback(async (accountId: string, taskListId: string, taskId: string) => {
    const account = accountSnapshots.find((snapshot) => snapshot.accountId === accountId);
    if (!account) return;

    await withRecoveredToken(account, (accessToken) => deleteGoogleTask(accessToken, taskListId, taskId), onAccessTokenRecovered);
    dispatch({ type: "DELETE_TASK", accountId, taskListId, taskId });
  }, [accountSnapshots, onAccessTokenRecovered]);

  const moveTaskToList = useCallback(async (accountId: string, sourceTaskListId: string, targetTaskListId: string, taskId: string) => {
    const account = accountSnapshots.find((snapshot) => snapshot.accountId === accountId);
    if (!account) return null;

    const task = await withRecoveredToken(account, (accessToken) => moveGoogleTask(accessToken, sourceTaskListId, targetTaskListId, taskId), onAccessTokenRecovered);
    if (task) dispatch({ type: "MOVE_TASK", accountId, sourceTaskListId, task });
    return task;
  }, [accountSnapshots, onAccessTokenRecovered]);

  useEffect(() => {
    dispatch({ type: "REMOVE_MISSING_ACCOUNTS", accountIds: accountSnapshots.map((account) => account.accountId) });
    void reload();
  }, [accountSnapshots, reload]);

  useEffect(() => {
    if (accountSnapshots.length === 0) return;
    const id = window.setInterval(() => {
      void reload();
    }, DEFAULT_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [accountSnapshots.length, reload]);

  return {
    tasksByAccount,
    reload,
    createTask,
    updateTask,
    removeTask,
    moveTaskToList,
  };
};

export { useGoogleTasks };
export type { GoogleTaskCreateInput, GoogleTaskPatchInput, GoogleTasksAccountState };
