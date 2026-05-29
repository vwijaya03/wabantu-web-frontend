export const SESSION_REAUTH_REQUIRED = "wabantu:session-reauth-required";
export const SESSION_REAUTH_RESOLVED = "wabantu:session-reauth-resolved";

let inflight: Promise<boolean> | null = null;
let resolveFn: ((success: boolean) => void) | null = null;

/** Opens the re-auth modal; concurrent 401s share one promise. */
export function requestSessionReauth(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (inflight) return inflight;

  inflight = new Promise<boolean>((resolve) => {
    resolveFn = (success) => {
      inflight = null;
      resolveFn = null;
      resolve(success);
      window.dispatchEvent(
        new CustomEvent(SESSION_REAUTH_RESOLVED, { detail: { success } }),
      );
    };
    window.dispatchEvent(new CustomEvent(SESSION_REAUTH_REQUIRED));
  });

  return inflight;
}

export function resolveSessionReauth(success: boolean): void {
  resolveFn?.(success);
}

export function isReauthInProgress(): boolean {
  return inflight != null;
}
