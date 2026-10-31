import type { AppRouter } from "@alhusseiniya/types/api";

type ProcedurePath = keyof AppRouter["_def"]["procedures"];

type InferProcedureInput<T> = T extends { _def: { input: infer I } }
  ? I
  : never;
type InferProcedureOutput<T> = T extends { _def: { output: infer O } }
  ? O
  : never;

type RouterInputs = {
  [K in ProcedurePath]: AppRouter["_def"]["procedures"][K] extends {
    _def: { input: infer I };
  }
    ? I
    : never;
};

type RouterOutputs = {
  [K in ProcedurePath]: AppRouter["_def"]["procedures"][K] extends {
    _def: { output: infer O };
  }
    ? O
    : never;
};

export type { RouterInputs, RouterOutputs };

export class FetchApiClient {
  private baseUrl: string;
  private getToken?: () => string | null;

  constructor(baseUrl: string, getToken?: () => string | null) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.getToken = getToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = this.getToken?.();
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        error.message || response.statusText,
        error
      );
    }

    return response.json();
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const queryString = params
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return this.request<T>(`${path}${queryString}`, { method: "GET" });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  // Typed procedure calls
  async query<T extends keyof RouterInputs>(
    procedure: T,
    input: RouterInputs[T]
  ): Promise<RouterOutputs[T]> {
    return this.post<RouterOutputs[T]>(`/api/trpc/${procedure as string}`, {
      input,
    });
  }

  async mutation<T extends keyof RouterInputs>(
    procedure: T,
    input: RouterInputs[T]
  ): Promise<RouterOutputs[T]> {
    return this.post<RouterOutputs[T]>(`/api/trpc/${procedure as string}`, {
      input,
    });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function createFetchClient(
  baseUrl: string,
  getToken?: () => string | null
) {
  return new FetchApiClient(baseUrl, getToken);
}
