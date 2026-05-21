import { AxiosError } from "axios";

export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | {
          statusCode?: number;
          error?: string;
          code?: string;
          message?: string | string[];
        }
      | undefined;
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message ?? err.message;
    const status = err.response?.status ?? 0;
    const code =
      data?.code ??
      data?.error ??
      (status === 429 ? "resource_exhausted" : "UnknownError");
    return {
      status,
      code,
      message,
    };
  }
  return {
    status: 0,
    code: "UnknownError",
    message: err instanceof Error ? err.message : String(err),
  };
}
