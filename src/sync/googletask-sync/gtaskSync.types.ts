export type GoogleTaskListItem = {
  id: string;
  title: string;
  updated?: string;
};

export type GoogleTaskStatus = "needsAction" | "completed";

export type GoogleTaskItem = {
  id: string;
  taskListId: string;
  title: string;
  notes?: string;
  status: GoogleTaskStatus;
  due?: string;
  completed?: string;
  updated?: string;
  parent?: string;
  position?: string;
};

export type GoogleTasksApiTaskListsResponse = {
  items?: Array<{
    id?: string;
    title?: string;
    updated?: string;
  }>;
  nextPageToken?: string;
};

export type GoogleTasksApiTasksResponse = {
  items?: Array<{
    id?: string;
    title?: string;
    notes?: string;
    status?: GoogleTaskStatus;
    due?: string;
    completed?: string;
    updated?: string;
    parent?: string;
    position?: string;
    deleted?: boolean;
    hidden?: boolean;
  }>;
  nextPageToken?: string;
};
