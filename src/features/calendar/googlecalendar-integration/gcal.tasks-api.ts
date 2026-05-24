import type {
  GoogleTaskItem,
  GoogleTaskStatus,
  GoogleTasksApiTasksResponse,
} from "./gcalSync.types";

const GOOGLE_TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";

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

const getJson = async <T>(accessToken: string, url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null) as
      | {
        error?: {
          message?: string;
          errors?: Array<{ reason?: string }>;
        };
      }
      | null;
    const message = payload?.error?.message;
    const reason = payload?.error?.errors?.[0]?.reason;
    const error = new Error(
      message
        ? `Google API failed (${res.status}): ${message}`
        : `Google API failed (${res.status})`,
    );

    (error as Error & { googleReason?: string; status: number }).status = res.status;
    (error as Error & { googleReason?: string }).googleReason = reason;

    throw error;
  }

  return (await res.json()) as T;
};

const sendJson = async <T>(
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
    const payload = await res.json().catch(() => null) as
      | {
        error?: {
          message?: string;
          errors?: Array<{ reason?: string }>;
        };
      }
      | null;
    const message = payload?.error?.message;
    const reason = payload?.error?.errors?.[0]?.reason;
    const error = new Error(
      message
        ? `Google Tasks API failed (${res.status}): ${message}`
        : `Google Tasks API failed (${res.status})`,
    );

    (error as Error & { googleReason?: string; status: number }).status = res.status;
    (error as Error & { googleReason?: string }).googleReason = reason;

    throw error;
  }

  if (method === "DELETE") {
    return undefined as T;
  }

  return (await res.json()) as T;
};

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

export const fetchGoogleTasks = async ({
  accessToken,
  taskListId,
}: {
  accessToken: string;
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

export const createGoogleTask = async ({
  accessToken,
  taskListId,
  input,
}: {
  accessToken: string;
  taskListId: string;
  input: GoogleTaskCreateInput;
}): Promise<GoogleTaskItem> => {
  const params = new URLSearchParams();
  const data = await sendJson<RawGoogleTask>(
    accessToken,
    `${GOOGLE_TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params}`,
    "POST",
    toApiTaskBody(input),
  );
  const task = toGoogleTaskItem(data, taskListId);

  if (!task) {
    throw new Error("Google Tasks API returned an invalid task");
  }

  return task;
};

export const patchGoogleTask = async ({
  accessToken,
  taskListId,
  taskId,
  patch,
}: {
  accessToken: string;
  taskListId: string;
  taskId: string;
  patch: GoogleTaskPatch;
}): Promise<GoogleTaskItem> => {
  const data = await sendJson<RawGoogleTask>(
    accessToken,
    `${GOOGLE_TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    "PATCH",
    toApiTaskBody(patch),
  );
  const task = toGoogleTaskItem(data, taskListId);

  if (!task) {
    throw new Error("Google Tasks API returned an invalid task");
  }

  return task;
};

export const deleteGoogleTask = async ({
  accessToken,
  taskListId,
  taskId,
}: {
  accessToken: string;
  taskListId: string;
  taskId: string;
}): Promise<void> => {
  await sendJson<void>(
    accessToken,
    `${GOOGLE_TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    "DELETE",
  );
};
