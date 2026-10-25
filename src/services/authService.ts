import { UserId } from '../types';

export interface UserAuthStatus {
  id: UserId;
  name: string;
  email: string;
  hasPassword: boolean;
}

const TOKEN_STORAGE_KEY = 'nfl_apuestas_session_token';

export const authService = {
  /**
   * Get stored session token from localStorage
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Store session token
   */
  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {}
  },

  /**
   * Clear session token
   */
  clearToken() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
  },

  /**
   * Verify stored session token with the backend.
   * Keeps player logged in across reloads, browser closes, and restarts.
   */
  async verifySession(): Promise<{ id: UserId; name: string; email: string; hasPassword: boolean } | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/session', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        this.clearToken();
        return null;
      }
      const data = await res.json();
      if (data.success && data.user) {
        return data.user;
      }
      this.clearToken();
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Fetch current registered password status from the backend database.
   * This is permanent and works across page reloads, browser cache clearing, and all devices.
   */
  async getStatus(): Promise<Record<UserId, UserAuthStatus>> {
    try {
      const res = await fetch('/api/auth/status');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.users) {
        return data.users;
      }
      throw new Error(data.error || 'No se pudo obtener el estado de autenticación.');
    } catch (err: any) {
      console.warn('Could not fetch auth status from server:', err);
      throw err;
    }
  },

  /**
   * Register a user's password for the FIRST and ONLY time.
   * The backend strictly rejects this if hasPassword is true.
   */
  async registerPassword(userId: UserId, email: string, password: string): Promise<{ success: boolean; token?: string; message?: string }> {
    const res = await fetch('/api/auth/register-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      // Return exact error message from server
      const errorMsg = data.error || 'Error al registrar la contraseña.';
      throw new Error(errorMsg);
    }

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  },

  /**
   * Log in with an existing password against the backend's secure hash.
   */
  async login(userId: UserId, email: string, password: string): Promise<{ success: boolean; user: any; token?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const errorMsg = data.error || 'Contraseña incorrecta.';
      throw new Error(errorMsg);
    }

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  },

  /**
   * Log out of current session.
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    this.clearToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
      } catch {}
    }
  },

  /**
   * Send an access recovery request to the tournament administrator.
   * Users cannot create or replace passwords directly.
   */
  async requestRecovery(userId: UserId, email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/request-recovery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, email }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const errorMsg = data.error || 'Error al enviar la solicitud de recuperación.';
      throw new Error(errorMsg);
    }

    return data;
  },
};
