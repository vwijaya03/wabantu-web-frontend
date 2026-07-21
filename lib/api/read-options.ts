/** Optional AbortSignal for tenant-scoped GET requests (React Query cancellation). */
export type ApiReadOptions = {
  signal?: AbortSignal;
};

export function apiGetConfig(
  params?: Record<string, string | number | boolean | undefined> | object,
  signal?: AbortSignal,
) {
  const cfg: {
    params?: Record<string, string | number | boolean | undefined>;
    signal?: AbortSignal;
  } = {};
  if (params && Object.keys(params as object).length > 0) {
    cfg.params = params as Record<string, string | number | boolean | undefined>;
  }
  if (signal) {
    cfg.signal = signal;
  }
  return cfg;
}
