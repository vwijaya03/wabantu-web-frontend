const PROFILE_HINT_KEY = "wabantu_profile_hint";

export type ProfileHint = {
  email: string;
  name?: string | null;
};

export function setProfileHint(hint: ProfileHint): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_HINT_KEY, JSON.stringify(hint));
  } catch {
    /* ignore */
  }
}

export function getProfileHint(): ProfileHint | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PROFILE_HINT_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(PROFILE_HINT_KEY);
      if (raw) {
        localStorage.setItem(PROFILE_HINT_KEY, raw);
        sessionStorage.removeItem(PROFILE_HINT_KEY);
      }
    }
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProfileHint;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProfileHint(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_HINT_KEY);
    sessionStorage.removeItem(PROFILE_HINT_KEY);
  } catch {
    /* ignore */
  }
}
