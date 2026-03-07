export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Request failed";
}

type JsonRecord = Record<string, unknown>;

function getMessage(status: number, data: unknown): string {
  if (data && typeof data === "object") {
    const record = data as JsonRecord;
    const details = typeof record.details === "string" ? record.details : null;
    const error = typeof record.error === "string" ? record.error : null;
    if (details && error) return `${error}: ${details}`;
    if (error) return error;
  }

  switch (status) {
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not found";
    case 409:
      return "Conflict";
    case 422:
      return "Validation error";
    case 429:
      return "Rate limit exceeded";
    default:
      return "Request failed";
  }
}

export async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type") && init?.body) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    throw new ApiError(res.status, getMessage(res.status, data), data);
  }

  return data as T;
}
