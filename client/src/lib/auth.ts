/**
 * Client-side auth state. We persist the JWT + the user object so that a page
 * refresh doesn't blow away the session, and so the Layout can render the
 * correct sidebar before any API call resolves.
 */

import type { User } from "./api";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function saveSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function getUserRole(): User["role"] | null {
  return getCurrentUser()?.role ?? null;
}

/**
 * Roles allowed to access a given route. An `undefined` value means any
 * authenticated user is allowed.
 */
export function canAccess(
  requiredRoles: User["role"][] | undefined,
  user: User | null
): boolean {
  if (!user) return false;
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(user.role);
}

/**
 * The home route for each role, used after login.
 */
export function homeForRole(role: User["role"]): string {
  switch (role) {
    case "admin":
    case "super_admin":
      return "/admin";
    case "inspector":
      return "/inspector";
    case "operations":
      return "/ops";
    case "owner":
      return "/owner";
    case "renter":
    default:
      return "/browse";
  }
}
