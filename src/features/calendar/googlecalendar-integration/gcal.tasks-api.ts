import type { GoogleTaskItem, GoogleTasksApiTasksResponse } from "./gcalSync.types";

const GOOGLE_TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";

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
        .filter((item) => item.id && item.title && !item.deleted)
        .map((item) => ({
          id: item.id!,
          taskListId,
          title: item.title!,
          notes: item.notes,
          status: item.status ?? "needsAction",
          due: item.due,
          completed: item.completed,
          updated: item.updated,
          parent: item.parent,
          position: item.position,
        })),
    );

    pageToken = data.nextPageToken;
  } while (pageToken);

  return tasks;
};
