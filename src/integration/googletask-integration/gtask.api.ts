import { createGoogleApiError, withGoogleApiRetry } from "@/integration/google-integration/googleApiRetry";
import type { GoogleTaskItem, GoogleTaskListItem, GoogleTasksApiTaskListsResponse, GoogleTasksApiTasksResponse, GoogleTaskStatus } from "@/sync/googletask-sync/gtaskSync.types";



type GoogleTaskPatch = {
  title?: string;
  notes?: string | null;
  status?: GoogleTaskStatus;
  due?: string | null;
  completed?: string | null;
};
type GoogleTaskCreateInput = {
  title: string;
  notes?: string | null;
  due?: string | null;
  status?: GoogleTaskStatus;
};
type RawGoogleTask = NonNullable<GoogleTasksApiTasksResponse["items"]>[number];



const GOOGLE_TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";



const toApiTaskBody = (input: GoogleTaskPatch | GoogleTaskCreateInput) => {
  const body: Record<string, string | null> = {};

  if ("title" in input && input.title !== undefined) body.title = input.title;
  if ("notes" in input && input.notes !== undefined) body.notes = input.notes;
  if ("due" in input && input.due !== undefined) body.due = input.due;
  if ("status" in input && input.status !== undefined) body.status = input.status;
  if ("completed" in input && input.completed !== undefined) {
    body.completed = input.completed;
  }

  return body;
};
const getJsonOnce = async <T>(accessToken: string, url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw await createGoogleApiError(res, "Google API failed");
  }

  return (await res.json()) as T;
};
const getJson = async <T>(accessToken: string, url: string, operation: string): Promise<T> =>
  withGoogleApiRetry(
    () => getJsonOnce<T>(accessToken, url),
    { service: "google_tasks", operation },
  );
const sendJsonOnce = async <T>(
  accessToken: string,
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> => {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    throw await createGoogleApiError(res, "Google Tasks API failed");
  }

  if (method === "DELETE") {
    return undefined as T;
  }

  return (await res.json()) as T;
};
const sendJson = async <T>(
  accessToken: string,
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  operation: string,
): Promise<T> =>
  withGoogleApiRetry(
    () => sendJsonOnce<T>(accessToken, url, method, body),
    { service: "google_tasks", operation },
  );
const toGoogleTaskItem = (
  item: RawGoogleTask,
  taskListId: string,
): GoogleTaskItem | null => {
  if (!item.id || !item.title || item.deleted) return null;

  return {
    id: item.id,
    taskListId,
    title: item.title,
    notes: item.notes,
    status: item.status ?? "needsAction",
    due: item.due,
    completed: item.completed,
    updated: item.updated,
    parent: item.parent,
    position: item.position,
  };
};
const fetchGoogleTaskLists = async (accessToken: string): Promise<GoogleTaskListItem[]> => {
  const taskLists: GoogleTaskListItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ maxResults: "1000" });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const data = await getJson<GoogleTasksApiTaskListsResponse>(
      accessToken,
      `${GOOGLE_TASKS_API_BASE}/users/@me/lists?${params}`,
      "fetch_task_lists",
    );

    taskLists.push(
      ...(data.items ?? [])
        .filter((item) => item.id)
        .map((item) => ({
          id: item.id!,
          title: item.title?.trim() ?? "Google ToDo",
          updated: item.updated,
        })),
    );

    pageToken = data.nextPageToken;
  } while (pageToken);

  return taskLists;
};
const fetchGoogleTasks = async ({ accessToken, taskListId }: { accessToken: string;
  taskListId: string;
}): Promise<GoogleTaskItem[]> => {
  const tasks: GoogleTaskItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      maxResults: "100",
      showCompleted: "true",
      showDeleted: "false",
      showHidden: "true",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const data = await getJson<GoogleTasksApiTasksResponse>(
      accessToken,
      `${GOOGLE_TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params}`,
      "fetch_tasks",
    );

    tasks.push(
      ...(data.items ?? [])
        .map((item) => toGoogleTaskItem(item, taskListId))
        .filter((item): item is GoogleTaskItem => item !== null),
    );

    pageToken = data.nextPageToken;
  } while (pageToken);

  return tasks;
};
const createGoogleTask = async ({ accessToken, taskListId, input }: { accessToken: string;
  taskListId: string;
  input: GoogleTaskCreateInput;
}): Promise<GoogleTaskItem> => {
  const params = new URLSearchParams();
  const data = await sendJson<RawGoogleTask>(
    accessToken,
    `${GOOGLE_TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params}`,
    "POST",
    toApiTaskBody(input),
    "create_task",
  );
  const task = toGoogleTaskItem(data, taskListId);

  if (!task) {
    throw new Error("Google Tasks API returned an invalid task");
  }

  return task;
};
const patchGoogleTask = async ({ accessToken, taskListId, taskId, patch }: { accessToken: string;
  taskListId: string;
  taskId: string;
  patch: GoogleTaskPatch;
}): Promise<GoogleTaskItem> => {
  const data = await sendJson<RawGoogleTask>(
    accessToken,
    `${GOOGLE_TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    "PATCH",
    toApiTaskBody(patch),
    "patch_task",
  );
  const task = toGoogleTaskItem(data, taskListId);

  if (!task) {
    throw new Error("Google Tasks API returned an invalid task");
  }

  return task;
};
const moveGoogleTask = async ({ accessToken, taskListId, taskId, destinationTaskListId }: { accessToken: string;
  taskListId: string;
  taskId: string;
  destinationTaskListId: string;
}): Promise<GoogleTaskItem> => {
  const params = new URLSearchParams({
    destinationTasklist: destinationTaskListId,
  });
  const data = await sendJson<RawGoogleTask>(
    accessToken,
    `${GOOGLE_TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}/move?${params}`,
    "POST",
    undefined,
    "move_task",
  );
  const task = toGoogleTaskItem(data, destinationTaskListId);

  if (!task) {
    throw new Error("Google Tasks API returned an invalid task");
  }

  return task;
};
const deleteGoogleTask = async ({ accessToken, taskListId, taskId }: { accessToken: string;
  taskListId: string;
  taskId: string;
}): Promise<void> => {
  await sendJson<void>(
    accessToken,
    `${GOOGLE_TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    "DELETE",
    undefined,
    "delete_task",
  );
};



export { fetchGoogleTaskLists, fetchGoogleTasks, createGoogleTask, patchGoogleTask, moveGoogleTask, deleteGoogleTask };
