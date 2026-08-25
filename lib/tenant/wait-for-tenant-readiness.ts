import { tenantApi, type TenantReadiness } from "@/lib/api/tenant";

const DEFAULT_MAX_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 400;

export type WaitTenantReadinessOptions = {
  signal?: AbortSignal;
  maxWaitMs?: number;
  onPoll?: (status: TenantReadiness) => void;
};

/** Poll until backend reports tenant schema is ready (or timeout). */
export async function waitForTenantReadiness(
  options: WaitTenantReadinessOptions = {},
): Promise<TenantReadiness> {
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const started = Date.now();

  while (true) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const status = await tenantApi.readiness(options.signal);
    options.onPoll?.(status);
    if (status.ready) {
      return status;
    }

    if (Date.now() - started >= maxWaitMs) {
      return status;
    }

    await sleep(POLL_INTERVAL_MS, options.signal);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
