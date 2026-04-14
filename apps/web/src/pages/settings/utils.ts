import { API_BASE_URL } from "../admin/types.js";
import type { SettingsUser } from "./types.js";

const USER_STORAGE_KEY = "devcentral_user";
const TOKEN_STORAGE_KEY = "devcentral_token";

type JwtPayload = {
  id?: string;
};

function getTokenPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    return JSON.parse(atob(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

export function getStoredUser(): SettingsUser {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SettingsUser;
  } catch {
    return {};
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getCurrentUserId(user: SettingsUser): string | null {
  const userId = user.id;
  if (typeof userId === "string" && userId.length > 0) {
    return userId;
  }

  const token = getAuthToken();
  if (!token) {
    return null;
  }

  const payload = getTokenPayload(token);
  return typeof payload?.id === "string" && payload.id.length > 0
    ? payload.id
    : null;
}

export function getAddress(user: SettingsUser): string {
  const address = user.address;
  return typeof address === "string" ? address : "";
}

export function persistUser(user: SettingsUser): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export async function refreshSessionUser(
  token: string,
): Promise<SettingsUser | null> {
  const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!refreshRes.ok) {
    return null;
  }

  const refreshData = (await refreshRes.json()) as {
    token: string;
    user: SettingsUser;
  };

  localStorage.setItem(TOKEN_STORAGE_KEY, refreshData.token);
  persistUser(refreshData.user);
  return refreshData.user;
}
