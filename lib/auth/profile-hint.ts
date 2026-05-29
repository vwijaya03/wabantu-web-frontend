const PROFILE_HINT_KEY = "wabantu_profile_hint";

export type ProfileHint = {
  email: string;
  name?: string | null;
};

export function setProfileHint(hint: ProfileHint): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PROFILE_HINT_KEY, JSON.stringify(hint));
}

export function getProfileHint(): ProfileHint | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PROFILE_HINT_KEY);
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
  sessionStorage.removeItem(PROFILE_HINT_KEY);
}
