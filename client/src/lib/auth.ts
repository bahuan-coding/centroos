export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}

export function getUserEmail(): string | null {
  return localStorage.getItem('user_email');
}

export function getUserRole(): string | null {
  return localStorage.getItem('user_role');
}

export function logout(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_role');
}

export function requireAuth(): boolean {
  if (!isAuthenticated()) {
    return false;
  }
  return true;
}











