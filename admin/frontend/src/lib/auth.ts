const AUTH_TOKEN_KEY = "adminToken";
const AUTH_STATE_KEY = "isAuthenticated";
const AUTH_USER_KEY = "adminUser";

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthSession(token: string, username: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_STATE_KEY, "true");
  localStorage.setItem(AUTH_USER_KEY, username);
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_STATE_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken()) && localStorage.getItem(AUTH_STATE_KEY) === "true";
}

export function buildAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
