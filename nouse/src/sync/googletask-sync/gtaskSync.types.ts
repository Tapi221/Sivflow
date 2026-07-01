type GoogleTaskListItem = {
  id: string;
  title: string;
  updated?: string;
};
type GoogleTaskStatus = "needsAction" | "completed";
type GoogleTaskItem = {
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
type GoogleTasksApiTaskListsResponse = {
  items?: Array<{ id?: string;
    title?: string;
    updated?: string;
  }>;
  nextPageToken?: string;
};
type GoogleTasksApiTasksResponse = {
  items?: Array<{ id?: string;
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

export type { GoogleTaskListItem, GoogleTaskStatus, GoogleTaskItem, GoogleTasksApiTaskListsResponse, GoogleTasksApiTasksResponse };
