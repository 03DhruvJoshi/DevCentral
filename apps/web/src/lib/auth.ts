const TOKEN_KEY = "devcentral_token";
const USER_KEY = "devcentral_user";

function getTokenPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = getTokenPayload(token);
  const exp = payload?.exp;

  if (typeof exp !== "number") {
    // If exp is missing or malformed, treat token as invalid.
    return true;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowInSeconds;
}

export function isUserLoggedIn(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === "null" || token === "undefined") {
    return false;
  }

  if (isTokenExpired(token)) {
    return false;
  }

  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr || userStr === "null" || userStr === "undefined") {
    return false;
  }

  try {
    const user = JSON.parse(userStr) as Record<string, unknown>;
    return Object.keys(user).length > 0;
  } catch {
    return false;
  }
}

export function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}