import { QuinielaData, UserId, UserPick, NFLGame } from '../types';

export const tournamentService = {
  /**
   * Fetch the authoritative persistent tournament state from the backend database.
   * Survives page reloads, browser closes, and synchronizes across all devices.
   */
  async getState(): Promise<QuinielaData> {
    const res = await fetch('/api/tournament/state', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Error al obtener el estado del torneo`);
    }
    const data = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.error || 'No se pudo cargar el estado del torneo');
  },

  /**
   * Persist a user's pick for a game in a specific week.
   * Rejects if user has already sealed their bets with APOSTAR.
   */
  async savePick(
    userId: UserId,
    weekId: number,
    gameId: string,
    teamId: string,
    homeScore?: number,
    awayScore?: number
  ): Promise<{ success: boolean; pick: UserPick; userWeekPicks: Record<string, UserPick> }> {
    const res = await fetch('/api/picks/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        weekId,
        gameId,
        teamId,
        homeScore,
        awayScore,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al guardar el pick.');
    }
    return data;
  },

  /**
   * Seal bets for the week ("APOSTAR").
   * Enforces single final submission per week per user, preventing duplicates.
   */
  async submitWeekBets(
    userId: UserId,
    weekId: number
  ): Promise<{ success: boolean; submittedAt: string; message: string }> {
    const res = await fetch('/api/picks/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        weekId,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al sellar las apuestas.');
    }
    return data;
  },

  /**
   * Send live NFL score updates to server to synchronize database.
   */
  async syncGames(weekId: number, games: NFLGame[]): Promise<NFLGame[] | null> {
    try {
      const res = await fetch('/api/tournament/sync-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekId,
          games,
        }),
      });
      if (!res.ok) {
        console.warn(`Could not sync games with backend: HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      return Array.isArray(data?.games) ? data.games : null;
    } catch (err) {
      console.warn('Could not sync games with backend:', err);
      return null;
    }
  },
};
