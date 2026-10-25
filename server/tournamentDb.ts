import fs from 'fs';
import path from 'path';
import { QuinielaData, UserId, UserPick, NFLGame, WeekState, UserProfile } from '../src/types';
import { INITIAL_QUINIELA_STATE } from '../src/data/initialData';

const TOURNAMENT_DB_FILE = path.join(process.cwd(), 'server', 'tournament_database.json');

let tournamentCache: QuinielaData | null = null;

function ensureDirExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadTournamentDatabase(): QuinielaData {
  if (tournamentCache) return tournamentCache;

  ensureDirExists(TOURNAMENT_DB_FILE);

  if (fs.existsSync(TOURNAMENT_DB_FILE)) {
    try {
      const content = fs.readFileSync(TOURNAMENT_DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && parsed.weeks && parsed.users) {
        tournamentCache = parsed;
        return tournamentCache!;
      }
    } catch (err) {
      console.error('Error reading tournament database, reinitializing with default state:', err);
    }
  }

  // Deep clone initial state
  tournamentCache = JSON.parse(JSON.stringify(INITIAL_QUINIELA_STATE));
  saveTournamentDatabase(tournamentCache!);
  return tournamentCache!;
}

function saveTournamentDatabase(db: QuinielaData): void {
  try {
    ensureDirExists(TOURNAMENT_DB_FILE);
    const tempFile = `${TOURNAMENT_DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, TOURNAMENT_DB_FILE);
  } catch (err) {
    console.error('Error writing tournament database:', err);
  }
}

export const TournamentDB = {
  /**
   * Get the full tournament state for all users, weeks, games, and picks.
   */
  getState(): QuinielaData {
    return loadTournamentDatabase();
  },

  /**
   * Save or update a single pick for a user in a specific week.
   * STRICT ENFORCEMENT:
   * 1. Cannot modify if user already sealed their bets with APOSTAR (submittedUsers[userId] === true).
   * 2. Cannot pick games that have started or finished.
   */
  savePick(
    userId: UserId,
    weekId: number,
    gameId: string,
    teamId: string,
    homeScore?: number,
    awayScore?: number
  ): { success: boolean; pick: UserPick; userWeekPicks: Record<string, UserPick> } {
    const db = loadTournamentDatabase();

    const week = db.weeks[weekId];
    if (!week) {
      throw new Error(`La semana ${weekId} no existe en el torneo.`);
    }

    // Check if user already confirmed and sealed bets for this week
    if (week.submittedUsers?.[userId]) {
      throw new Error('Tus apuestas para esta semana ya han sido selladas y no se pueden modificar.');
    }

    // Check game lock status
    const targetGame = week.games.find((g) => g.id === gameId);
    if (targetGame && (targetGame.status === 'in_progress' || targetGame.status === 'final')) {
      throw new Error('Este partido ya comenzó o finalizó. No se pueden realizar más apuestas sobre él.');
    }

    // Ensure week user picks map exists
    if (!week.userPicks) {
      week.userPicks = {
        enrique: {},
        diego: {},
        adrian: {},
        alejandro: {},
        andres: {},
      };
    }
    if (!week.userPicks[userId]) {
      week.userPicks[userId] = {};
    }

    const pick: UserPick = {
      userId,
      gameId,
      selectedTeamId: teamId,
      predictedHomeScore: homeScore !== undefined ? Number(homeScore) : undefined,
      predictedAwayScore: awayScore !== undefined ? Number(awayScore) : undefined,
      timestamp: new Date().toISOString(),
    };

    week.userPicks[userId][gameId] = pick;
    saveTournamentDatabase(db);

    return {
      success: true,
      pick,
      userWeekPicks: week.userPicks[userId],
    };
  },

  /**
   * Confirm and seal bets for a user for a given week ("APOSTAR").
   * STRICT ENFORCEMENT:
   * 1. User cannot submit twice (prevents duplicates).
   * 2. Must have at least 1 pick made.
   */
  submitWeekBets(
    userId: UserId,
    weekId: number
  ): { success: boolean; submittedAt: string; message: string } {
    const db = loadTournamentDatabase();

    const week = db.weeks[weekId];
    if (!week) {
      throw new Error(`La semana ${weekId} no existe.`);
    }

    if (!week.submittedUsers) {
      week.submittedUsers = {};
    }
    if (!week.submittedAt) {
      week.submittedAt = {};
    }

    // STRICT CHECK: Cannot submit twice
    if (week.submittedUsers[userId]) {
      throw new Error('Ya has sellado tus apuestas para esta semana.');
    }

    const userPicks = week.userPicks?.[userId] || {};
    const picksCount = Object.keys(userPicks).length;

    if (picksCount === 0) {
      throw new Error('Debes seleccionar al menos un ganador antes de apostar.');
    }

    const submittedAt = new Date().toISOString();
    week.submittedUsers[userId] = true;
    week.submittedAt[userId] = submittedAt;

    // Update user stats
    const userProfile = db.users[userId];
    if (userProfile) {
      userProfile.totalPicksMade = (userProfile.totalPicksMade || 0) + picksCount;
    }

    saveTournamentDatabase(db);

    return {
      success: true,
      submittedAt,
      message: `¡Apuestas selladas con éxito para ${userProfile?.name || userId}!`,
    };
  },

  /**
   * Sync NFL live games and scores into the tournament database.
   */
  syncWeekGames(weekId: number, updatedGames: NFLGame[]): { success: boolean } {
    const db = loadTournamentDatabase();
    const week = db.weeks[weekId];
    if (!week) return { success: false };

    week.games = updatedGames;
    week.isFinished = updatedGames.length > 0 && updatedGames.every((g) => g.status === 'final');

    saveTournamentDatabase(db);
    return { success: true };
  },

  /**
   * Update active user's preference or stats if needed.
   */
  updateUserProfile(userId: UserId, updates: Partial<UserProfile>): UserProfile {
    const db = loadTournamentDatabase();
    const user = db.users[userId];
    if (!user) throw new Error('Usuario no encontrado.');

    Object.assign(user, updates);
    saveTournamentDatabase(db);
    return user;
  },
};
