import "server-only";

const TODOIST_API_BASE_URL = "https://api.todoist.com/api/v1";
const TODOIST_PAGE_LIMIT = 200;
const MAX_PAGES = 100;

export type TodoistTaskFilter = "today" | "overdue" | "today | overdue";
export type TodoistPriority = 1 | 2 | 3 | 4;
export type TodoistDurationUnit = "minute" | "day";

export interface TodoistDue {
  date: string;
  string: string;
  lang: string;
  is_recurring: boolean;
  timezone?: string | null;
}

export interface TodoistDeadline {
  date: string;
  lang?: string;
}

export interface TodoistDuration {
  amount: number;
  unit: TodoistDurationUnit;
}

export interface TodoistTask {
  id: string;
  user_id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  added_by_uid: string | null;
  assigned_by_uid: string | null;
  responsible_uid: string | null;
  labels: string[];
  deadline: TodoistDeadline | null;
  duration: TodoistDuration | null;
  is_collapsed: boolean;
  checked: boolean;
  is_deleted: boolean;
  added_at: string;
  completed_at: string | null;
  completed_by_uid?: string | null;
  updated_at: string;
  due: TodoistDue | null;
  priority: TodoistPriority;
  child_order: number;
  content: string;
  description: string;
  note_count: number;
  day_order: number;
  goal_ids: string[];
  completed_count: number;
  postponed_count: number;
}

export type TodoistErrorCode =
  | "CONFIGURATION"
  | "INVALID_INPUT"
  | "NETWORK"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM"
  | "INVALID_RESPONSE";

export class TodoistApiError extends Error {
  readonly code: TodoistErrorCode;
  readonly status: number | undefined;

  constructor(code: TodoistErrorCode, message: string, status?: number) {
    super(message);
    this.name = "TodoistApiError";
    this.code = code;
    this.status = status;
  }
}

interface TodoistTaskPage {
  results: TodoistTask[];
  next_cursor: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isPriority(value: unknown): value is TodoistPriority {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function isDue(value: unknown): value is TodoistDue | null {
  if (value === null) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.date === "string" &&
    typeof value.string === "string" &&
    typeof value.lang === "string" &&
    typeof value.is_recurring === "boolean" &&
    (value.timezone === undefined || isNullableString(value.timezone))
  );
}

function isDeadline(value: unknown): value is TodoistDeadline | null {
  if (value === null) {
    return true;
  }

  return (
    isRecord(value) &&
    typeof value.date === "string" &&
    (value.lang === undefined || typeof value.lang === "string")
  );
}

function isDuration(value: unknown): value is TodoistDuration | null {
  if (value === null) {
    return true;
  }

  return (
    isRecord(value) &&
    isInteger(value.amount) &&
    value.amount > 0 &&
    (value.unit === "minute" || value.unit === "day")
  );
}

function isOptionalNullableString(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return record[key] === undefined || isNullableString(record[key]);
}

function isTodoistTask(value: unknown): value is TodoistTask {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.user_id === "string" &&
    typeof value.project_id === "string" &&
    isNullableString(value.section_id) &&
    isNullableString(value.parent_id) &&
    isNullableString(value.added_by_uid) &&
    isNullableString(value.assigned_by_uid) &&
    isNullableString(value.responsible_uid) &&
    isStringArray(value.labels) &&
    isDeadline(value.deadline) &&
    isDuration(value.duration) &&
    typeof value.is_collapsed === "boolean" &&
    typeof value.checked === "boolean" &&
    typeof value.is_deleted === "boolean" &&
    typeof value.added_at === "string" &&
    isNullableString(value.completed_at) &&
    isOptionalNullableString(value, "completed_by_uid") &&
    typeof value.updated_at === "string" &&
    isDue(value.due) &&
    isPriority(value.priority) &&
    isInteger(value.child_order) &&
    typeof value.content === "string" &&
    typeof value.description === "string" &&
    isInteger(value.note_count) &&
    isInteger(value.day_order) &&
    isStringArray(value.goal_ids) &&
    isInteger(value.completed_count) &&
    isInteger(value.postponed_count)
  );
}

function parseTask(value: unknown): TodoistTask {
  if (!isTodoistTask(value)) {
    throw new TodoistApiError(
      "INVALID_RESPONSE",
      "Todoist returned an unexpected response.",
    );
  }

  return value;
}

function parseTaskPage(value: unknown): TodoistTaskPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.results) ||
    !value.results.every(isTodoistTask) ||
    !(value.next_cursor === null || typeof value.next_cursor === "string")
  ) {
    throw new TodoistApiError(
      "INVALID_RESPONSE",
      "Todoist returned an unexpected response.",
    );
  }

  return {
    results: value.results,
    next_cursor: value.next_cursor,
  };
}

function getToken(): string {
  const token = process.env.TODOIST_API_TOKEN?.trim();

  if (!token) {
    throw new TodoistApiError(
      "CONFIGURATION",
      "Todoist is not configured.",
    );
  }

  return token;
}

function getHttpError(status: number): TodoistApiError {
  if (status === 401 || status === 403) {
    return new TodoistApiError(
      "UNAUTHORIZED",
      "Todoist authorization failed.",
      status,
    );
  }

  if (status === 404) {
    return new TodoistApiError(
      "NOT_FOUND",
      "The Todoist item could not be found.",
      status,
    );
  }

  if (status === 429) {
    return new TodoistApiError(
      "RATE_LIMITED",
      "Todoist is temporarily rate limited.",
      status,
    );
  }

  return new TodoistApiError(
    "UPSTREAM",
    status >= 500
      ? "Todoist is temporarily unavailable."
      : "Todoist rejected the request.",
    status,
  );
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  let response: Response;

  try {
    response = await fetch(`${TODOIST_API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
    });
  } catch {
    throw new TodoistApiError(
      "NETWORK",
      "Todoist could not be reached.",
    );
  }

  if (!response.ok) {
    throw getHttpError(response.status);
  }

  return response;
}

async function readRequiredJson(response: Response): Promise<unknown> {
  let body: string;

  try {
    body = await response.text();
  } catch {
    throw new TodoistApiError(
      "INVALID_RESPONSE",
      "Todoist returned an unexpected response.",
    );
  }

  if (!body.trim()) {
    throw new TodoistApiError(
      "INVALID_RESPONSE",
      "Todoist returned an unexpected response.",
    );
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new TodoistApiError(
      "INVALID_RESPONSE",
      "Todoist returned an unexpected response.",
    );
  }
}

export async function getTasksByFilter(
  filter: TodoistTaskFilter,
): Promise<TodoistTask[]> {
  const tasks: TodoistTask[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;

  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const query = new URLSearchParams({
      query: filter,
      limit: String(TODOIST_PAGE_LIMIT),
    });

    if (cursor !== null) {
      query.set("cursor", cursor);
    }

    const response = await request(`/tasks/filter?${query.toString()}`);
    const page = parseTaskPage(await readRequiredJson(response));
    tasks.push(...page.results);

    if (page.next_cursor === null) {
      return tasks;
    }

    if (!page.next_cursor || seenCursors.has(page.next_cursor)) {
      throw new TodoistApiError(
        "INVALID_RESPONSE",
        "Todoist returned an unexpected response.",
      );
    }

    seenCursors.add(page.next_cursor);
    cursor = page.next_cursor;
  }

  throw new TodoistApiError(
    "INVALID_RESPONSE",
    "Todoist returned an unexpected response.",
  );
}

export function getTodayTasks(): Promise<TodoistTask[]> {
  return getTasksByFilter("today");
}

export function getOverdueTasks(): Promise<TodoistTask[]> {
  return getTasksByFilter("overdue");
}

export function getTodayAndOverdueTasks(): Promise<TodoistTask[]> {
  return getTasksByFilter("today | overdue");
}

export async function quickAddTask(text: string): Promise<TodoistTask> {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new TodoistApiError(
      "INVALID_INPUT",
      "A task description is required.",
    );
  }

  const response = await request("/tasks/quick", {
    method: "POST",
    body: JSON.stringify({ text: normalizedText }),
  });

  return parseTask(await readRequiredJson(response));
}

export async function closeTask(taskId: string): Promise<void> {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new TodoistApiError(
      "INVALID_INPUT",
      "A Todoist task ID is required.",
    );
  }

  const response = await request(
    `/tasks/${encodeURIComponent(normalizedTaskId)}/close`,
    { method: "POST" },
  );
  const body = await response.text();

  if (body.trim()) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(body) as unknown;
    } catch {
      throw new TodoistApiError(
        "INVALID_RESPONSE",
        "Todoist returned an unexpected response.",
      );
    }

    if (parsed !== null) {
      throw new TodoistApiError(
        "INVALID_RESPONSE",
        "Todoist returned an unexpected response.",
      );
    }
  }
}
