import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { QuinielaData, UserId, UserPick, NFLGame, WeekState, UserProfile } from '../src/types';
import { INITIAL_QUINIELA_STATE } from '../src/data/initialData';

let dbInstance: Firestore | null = null;

function getDb(): Firestore {
  if (dbInstance) return dbInstance;

  let config: any = {};
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.warn('Could not parse firebase-applet-config.json, using environment variables');
    }
  }

  const projectId = config.projectId || process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0595951339';
  const apiKey = config.apiKey || process.env.FIREBASE_API_KEY;
  const authDomain = config.authDomain || process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;
  const databaseId = config.firestoreDatabaseId || process.env.FIREBASE_FIRESTORE_DATABASE_ID || '(default)';

  const app = getApps().length === 0
    ? initializeApp({ apiKey, projectId, authDomain })
    : getApp();

  dbInstance = initializeFirestore(app, {}, databaseId);
  return dbInstance;
}

export interface StoredUser {
  id: UserId;
  name: string;
  email: string;
  avatar: string;
  color: string;
  secondaryColor: string;
  favoriteTeam: string;
  pin: string;
  hasPassword: boolean;
  passwordHash: string | null;
  salt: string | null;
  createdAt: string | null;
  weeksWon: number;
  totalPicksCorrect: number;
  totalPicksMade: number;
  earnings: number;
}

export interface StoredSession {
  token: string;
  userId: UserId;
  createdAt: string;
  expiresAt: string;
}

export interface StoredPickDocument {
  leagueId: string;
  season: string;
  weekId: number;
  userId: UserId;
  userName: string;
  isSubmitted: boolean;
  submittedAt: string | null;
  updatedAt: string;
  picks: Record<string, UserPick>;
}

let isInitialized = false;

function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * Initializes and migrates existing data into Cloud Firestore.
 * Ensures data is preserved and never overwritten if already present in Firestore.
 */
export async function ensureFirestoreInitialized(): Promise<void> {
  if (isInitialized) return;
  const db = getDb();

  try {
    // 1. Check/Seed System League doc
    const leagueRef = doc(db, 'system', 'league');
    const leagueSnap = await getDoc(leagueRef);

    if (!leagueSnap.exists()) {
      console.log('Seeding system league to Cloud Firestore...');
      await setDoc(
        leagueRef,
        sanitizeForFirestore({
          leagueId: 'nfl_2026',
          name: 'Liga Privada Apuestas NFL',
          baseStakePerUser: INITIAL_QUINIELA_STATE.baseStakePerUser || 50,
          currentWeekId: INITIAL_QUINIELA_STATE.currentWeekId || 2,
          updatedAt: new Date().toISOString(),
        })
      );
    }

    // 2. Check/Seed Users (individually to preserve existing credentials)
    let existingAuthData: any = null;
    const localAuthPath = path.join(process.cwd(), 'server', 'auth_database.json');
    if (fs.existsSync(localAuthPath)) {
      try {
        existingAuthData = JSON.parse(fs.readFileSync(localAuthPath, 'utf8'));
      } catch (e) {}
    }

    for (const [userId, userProfile] of Object.entries(INITIAL_QUINIELA_STATE.users)) {
      const uid = userId as UserId;
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log(`Seeding missing user ${uid} to Cloud Firestore...`);
        const localUser = existingAuthData?.users?.[uid];

        const userDoc: StoredUser = {
          id: uid,
          name: userProfile.name,
          email: userProfile.email,
          avatar: userProfile.avatar,
          color: userProfile.color,
          secondaryColor: userProfile.secondaryColor,
          favoriteTeam: userProfile.favoriteTeam,
          pin: userProfile.pin || '1234',
          hasPassword: Boolean(localUser?.hasPassword),
          passwordHash: localUser?.passwordHash || null,
          salt: localUser?.salt || null,
          createdAt: localUser?.createdAt || null,
          weeksWon: userProfile.weeksWon || 0,
          totalPicksCorrect: userProfile.totalPicksCorrect || 0,
          totalPicksMade: userProfile.totalPicksMade || 0,
          earnings: userProfile.earnings || 0,
        };

        await setDoc(userRef, sanitizeForFirestore(userDoc));
      }
    }

    // 3. Check/Seed Weeks and Historical Picks (individually to prevent clobbering)
    for (const [wIdStr, weekState] of Object.entries(INITIAL_QUINIELA_STATE.weeks)) {
      const weekId = Number(wIdStr);
      const weekRef = doc(db, 'weeks', String(weekId));
      const weekSnap = await getDoc(weekRef);

      if (!weekSnap.exists()) {
        console.log(`Seeding missing week ${weekId} to Cloud Firestore...`);
        const cleanWeek = sanitizeForFirestore({
          weekNumber: weekState.weekNumber || weekId,
          name: weekState.name || `Semana ${weekId}`,
          weekType: weekState.weekType || 'regular',
          isLocked: Boolean(weekState.isLocked),
          isFinished: Boolean(weekState.isFinished),
          totalPot: weekState.totalPot || 250,
          basePot: weekState.basePot || 250,
          rolledOverPot: weekState.rolledOverPot || 0,
          firstGameTime: weekState.firstGameTime || 'Dom 13:00',
          opensAt: weekState.opensAt || 'Mie 00:00',
          locksAt: weekState.locksAt || 'Dom 13:00',
          games: weekState.games || [],
          winners: weekState.winners || [],
          submittedUsers: weekState.submittedUsers || {},
          submittedAt: weekState.submittedAt || {},
          updatedAt: new Date().toISOString(),
        });

        await setDoc(weekRef, cleanWeek);

        // Seed user picks for this week if not present
        if (weekState.userPicks) {
          for (const [userId, picks] of Object.entries(weekState.userPicks)) {
            const uid = userId as UserId;
            const pickDocId = `nfl_2026_week_${weekId}_user_${uid}`;
            const pickRef = doc(db, 'picks', pickDocId);
            const pickSnap = await getDoc(pickRef);

            if (!pickSnap.exists()) {
              const isSub = Boolean(weekState.submittedUsers?.[uid]);
              const subAt = weekState.submittedAt?.[uid] || null;

              await setDoc(
                pickRef,
                sanitizeForFirestore({
                  leagueId: 'nfl_2026',
                  season: '2026',
                  weekId,
                  userId: uid,
                  userName: INITIAL_QUINIELA_STATE.users[uid]?.name || uid,
                  isSubmitted: isSub,
                  submittedAt: subAt,
                  updatedAt: new Date().toISOString(),
                  picks: picks || {},
                })
              );
            }
          }
        }
      } else {
        // Week already exists in Firestore: check if games array is empty and populate if needed
        const existingData = weekSnap.data() as any;
        const existingGames = existingData.games || [];
        if (existingGames.length === 0 && weekState.games && weekState.games.length > 0) {
          console.log(`Populating ${weekState.games.length} schedule games for week ${weekId} in Cloud Firestore...`);
          await updateDoc(
            weekRef,
            sanitizeForFirestore({
              games: weekState.games,
              firstGameTime: weekState.firstGameTime || existingData.firstGameTime,
              updatedAt: new Date().toISOString(),
            })
          );
        }
      }
    }

    isInitialized = true;
  } catch (error) {
    console.error('Error initializing Cloud Firestore database:', error);
    throw error;
  }
}

/**
 * Get all users from Cloud Firestore
 */
export async function getFirestoreUsers(): Promise<Record<UserId, StoredUser>> {
  await ensureFirestoreInitialized();
  const db = getDb();
  const snap = await getDocs(collection(db, 'users'));
  const users: Record<string, StoredUser> = {};

  snap.forEach((d) => {
    const data = d.data() as StoredUser;
    users[data.id] = data;
  });

  return users as Record<UserId, StoredUser>;
}

/**
 * Get single user from Cloud Firestore
 */
export async function getFirestoreUser(userId: UserId): Promise<StoredUser | null> {
  await ensureFirestoreInitialized();
  const db = getDb();
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return snap.data() as StoredUser;
}

/**
 * Register password for user in Cloud Firestore (FIRST AND ONLY TIME)
 */
export async function registerFirestoreUserPassword(
  userId: UserId,
  email: string,
  password: string
): Promise<{ token: string; user: UserProfile }> {
  await ensureFirestoreInitialized();
  const db = getDb();
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    throw new Error(`Usuario "${userId}" no encontrado en la liga.`);
  }

  const user = snap.data() as StoredUser;

  if (user.hasPassword && user.passwordHash) {
    const err: any = new Error(
      'Este usuario ya tiene una contraseña registrada. Ingresa con tu contraseña existente.'
    );
    err.alreadyRegistered = true;
    throw err;
  }

  if (email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    throw new Error('El correo electrónico no coincide con el registrado para este jugador.');
  }

  if (!password || password.length < 4) {
    throw new Error('La contraseña debe tener al menos 4 caracteres.');
  }

  // Cryptographic scrypt hash + unique 16-byte random salt
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const now = new Date().toISOString();

  await updateDoc(userRef, {
    hasPassword: true,
    passwordHash,
    salt,
    createdAt: now,
  });

  // Create persistent session in Cloud Firestore
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await setDoc(doc(db, 'sessions', token), {
    token,
    userId,
    createdAt: now,
    expiresAt,
  });

  return {
    token,
    user: {
      ...user,
      hasPassword: true,
      isPasswordSet: true,
      password: '',
    },
  };
}

/**
 * Login user with password against Cloud Firestore
 */
export async function loginFirestoreUser(
  userId: UserId,
  email: string,
  password: string
): Promise<{ token: string; user: UserProfile }> {
  await ensureFirestoreInitialized();
  const db = getDb();
  const snap = await getDoc(doc(db, 'users', userId));

  if (!snap.exists()) {
    throw new Error(`Usuario "${userId}" no encontrado en la liga.`);
  }

  const user = snap.data() as StoredUser;

  if (!user.hasPassword || !user.passwordHash || !user.salt) {
    throw new Error(
      'Este usuario aún no tiene contraseña creada. Por favor créala por primera vez.'
    );
  }

  if (email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    throw new Error('El correo electrónico no coincide con el registrado para este jugador.');
  }

  const hashToVerify = crypto.scryptSync(password, user.salt, 64).toString('hex');

  const storedBuffer = Buffer.from(user.passwordHash, 'hex');
  const verifyBuffer = Buffer.from(hashToVerify, 'hex');

  const isMatch =
    storedBuffer.length === verifyBuffer.length &&
    crypto.timingSafeEqual(storedBuffer, verifyBuffer);

  if (!isMatch) {
    throw new Error(
      'Contraseña incorrecta. Esta cuenta está protegida y ningún otro jugador puede acceder a ella.'
    );
  }

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await setDoc(doc(db, 'sessions', token), {
    token,
    userId,
    createdAt: now,
    expiresAt,
  });

  return {
    token,
    user: {
      ...user,
      hasPassword: true,
      isPasswordSet: true,
      password: '',
    },
  };
}

/**
 * Verify session token in Cloud Firestore
 */
export async function verifyFirestoreSession(token: string): Promise<UserProfile | null> {
  if (!token) return null;
  await ensureFirestoreInitialized();
  const db = getDb();

  const sessionSnap = await getDoc(doc(db, 'sessions', token));
  if (!sessionSnap.exists()) return null;

  const session = sessionSnap.data() as StoredSession;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    // Expired
    await deleteDoc(doc(db, 'sessions', token)).catch(() => {});
    return null;
  }

  const userSnap = await getDoc(doc(db, 'users', session.userId));
  if (!userSnap.exists()) return null;

  const user = userSnap.data() as StoredUser;
  return {
    ...user,
    hasPassword: true,
    isPasswordSet: true,
    password: '',
  };
}

/**
 * Revoke session in Cloud Firestore
 */
export async function revokeFirestoreSession(token: string): Promise<void> {
  if (!token) return;
  await ensureFirestoreInitialized();
  const db = getDb();
  await deleteDoc(doc(db, 'sessions', token)).catch(() => {});
}

/**
 * Get full tournament state from Cloud Firestore
 */
export async function getFirestoreTournamentState(): Promise<QuinielaData> {
  await ensureFirestoreInitialized();
  const db = getDb();

  // 1. Get league system doc
  const leagueSnap = await getDoc(doc(db, 'system', 'league'));
  const leagueData = leagueSnap.exists() ? leagueSnap.data() : null;

  // 2. Get all users
  const usersSnap = await getDocs(collection(db, 'users'));
  const users: Record<string, UserProfile> = {};
  usersSnap.forEach((d) => {
    const u = d.data() as StoredUser;
    users[u.id] = {
      ...u,
      isPasswordSet: Boolean(u.hasPassword),
      password: '',
    };
  });

  // 3. Get all weeks
  const weeksSnap = await getDocs(collection(db, 'weeks'));
  const weeks: Record<number, WeekState> = {};
  weeksSnap.forEach((d) => {
    const w = d.data() as any;
    const weekId = Number(w.weekNumber || w.id || d.id);
    weeks[weekId] = {
      weekNumber: weekId,
      name: w.name || `Semana ${weekId}`,
      weekType: w.weekType || 'regular',
      isLocked: Boolean(w.isLocked),
      isFinished: Boolean(w.isFinished),
      totalPot: w.totalPot || 250,
      basePot: w.basePot || 250,
      rolledOverPot: w.rolledOverPot || 0,
      firstGameTime: w.firstGameTime || 'Dom 13:00',
      opensAt: w.opensAt || 'Mie 00:00',
      locksAt: w.locksAt || 'Dom 13:00',
      games: (w.games && w.games.length > 0) ? w.games : (INITIAL_QUINIELA_STATE.weeks[weekId]?.games || []),
      winners: w.winners || [],
      userPicks: {
        enrique: {},
        diego: {},
        adrian: {},
        alejandro: {},
        andres: {},
      },
      submittedUsers: w.submittedUsers || {},
      submittedAt: w.submittedAt || {},
    };
  });

  // 4. Get all picks and merge into weeks
  const picksSnap = await getDocs(collection(db, 'picks'));
  picksSnap.forEach((d) => {
    const p = d.data() as StoredPickDocument;
    const week = weeks[p.weekId];
    if (week) {
      if (!week.userPicks) {
        week.userPicks = {
          enrique: {},
          diego: {},
          adrian: {},
          alejandro: {},
          andres: {},
        };
      }
      week.userPicks[p.userId] = p.picks || {};

      if (p.isSubmitted) {
        if (!week.submittedUsers) week.submittedUsers = {};
        week.submittedUsers[p.userId] = true;

        if (!week.submittedAt) week.submittedAt = {};
        if (p.submittedAt) {
          week.submittedAt[p.userId] = p.submittedAt;
        }
      }
    }
  });

  return {
    activeUserId: null,
    currentWeekId: leagueData?.currentWeekId || 2,
    baseStakePerUser: leagueData?.baseStakePerUser || 50,
    hasCompletedSplash: true,
    users: users as Record<UserId, UserProfile>,
    weeks,
  };
}

/**
 * Save pick in Cloud Firestore with strict validation and idempotency
 */
export async function saveFirestorePick(
  userId: UserId,
  weekId: number,
  gameId: string,
  selectedTeamId: string,
  predictedHomeScore?: number,
  predictedAwayScore?: number
): Promise<{ success: boolean; pick: UserPick }> {
  await ensureFirestoreInitialized();
  const db = getDb();

  const pickDocId = `nfl_2026_week_${weekId}_user_${userId}`;
  const pickRef = doc(db, 'picks', pickDocId);
  const pickSnap = await getDoc(pickRef);

  // Verification 1: Once sealed ("APOSTAR" button), picks cannot be modified
  if (pickSnap.exists()) {
    const existing = pickSnap.data() as StoredPickDocument;
    if (existing.isSubmitted) {
      throw new Error('Tus apuestas para esta semana ya han sido selladas y no se pueden modificar.');
    }
  }

  // Verification 2: Check if game has already started
  const weekRef = doc(db, 'weeks', String(weekId));
  const weekSnap = await getDoc(weekRef);
  if (weekSnap.exists()) {
    const weekData = weekSnap.data();
    const game = weekData.games?.find((g: NFLGame) => g.id === gameId);
    if (game && (game.status === 'in_progress' || game.status === 'final')) {
      throw new Error('Este partido ya comenzó o ha finalizado. No se puede modificar el pick.');
    }
  }

  const existingPicks = pickSnap.exists()
    ? (pickSnap.data() as StoredPickDocument).picks || {}
    : {};

  const now = new Date().toISOString();
  const newPick: UserPick = {
    userId,
    gameId,
    selectedTeamId,
    predictedHomeScore,
    predictedAwayScore,
    timestamp: now,
  };

  const updatedPicks = {
    ...existingPicks,
    [gameId]: newPick,
  };

  await setDoc(
    pickRef,
    sanitizeForFirestore({
      leagueId: 'nfl_2026',
      season: '2026',
      weekId,
      userId,
      isSubmitted: false,
      submittedAt: null,
      updatedAt: now,
      picks: updatedPicks,
    }),
    { merge: true }
  );

  return { success: true, pick: newPick };
}

/**
 * Clear user picks for a specific week (if not yet submitted)
 */
export async function clearUserWeekPicks(userId: UserId, weekId: number): Promise<void> {
  await ensureFirestoreInitialized();
  const db = getDb();
  const pickDocId = `nfl_2026_week_${weekId}_user_${userId}`;
  const pickRef = doc(db, 'picks', pickDocId);
  await setDoc(
    pickRef,
    sanitizeForFirestore({
      leagueId: 'nfl_2026',
      season: '2026',
      weekId,
      userId,
      isSubmitted: false,
      submittedAt: null,
      updatedAt: new Date().toISOString(),
      picks: {},
    })
  );
}

/**
 * Submit and seal weekly bets in Cloud Firestore
 */
export async function submitFirestoreWeekBets(
  userId: UserId,
  weekId: number
): Promise<{ success: boolean; submittedAt: string }> {
  await ensureFirestoreInitialized();
  const db = getDb();

  const pickDocId = `nfl_2026_week_${weekId}_user_${userId}`;
  const pickRef = doc(db, 'picks', pickDocId);
  const pickSnap = await getDoc(pickRef);

  if (pickSnap.exists()) {
    const existing = pickSnap.data() as StoredPickDocument;
    if (existing.isSubmitted) {
      throw new Error('Ya has sellado tus apuestas para esta semana.');
    }
  }

  const now = new Date().toISOString();

  // Atomically seal the pick document in Cloud Firestore
  await setDoc(
    pickRef,
    sanitizeForFirestore({
      leagueId: 'nfl_2026',
      season: '2026',
      weekId,
      userId,
      isSubmitted: true,
      submittedAt: now,
      updatedAt: now,
    }),
    { merge: true }
  );

  // Update the week's submission index in Cloud Firestore
  const weekRef = doc(db, 'weeks', String(weekId));
  const weekSnap = await getDoc(weekRef);
  if (weekSnap.exists()) {
    const weekData = weekSnap.data();
    const submittedUsers = { ...(weekData.submittedUsers || {}), [userId]: true };
    const submittedAt = { ...(weekData.submittedAt || {}), [userId]: now };

    await updateDoc(
      weekRef,
      sanitizeForFirestore({
        submittedUsers,
        submittedAt,
        updatedAt: now,
      })
    );
  }

  return { success: true, submittedAt: now };
}

/**
 * Safely merge two lists of games without losing live scores, quarters, clocks, or final results.
 */
function mergeGameLists(baseGames: NFLGame[] = [], incomingGames: NFLGame[] = []): NFLGame[] {
  if (!incomingGames || incomingGames.length === 0) return baseGames || [];
  if (!baseGames || baseGames.length === 0) return incomingGames || [];

  const matchedIncomingIds = new Set<string>();

  const merged = baseGames.map((base) => {
    const incoming = incomingGames.find(
      (inc) =>
        inc.id === base.id ||
        (inc.homeTeam?.id === base.homeTeam?.id && inc.awayTeam?.id === base.awayTeam?.id)
    );

    if (!incoming) return base;
    matchedIncomingIds.add(incoming.id);

    // Determine progression: final > in_progress > scheduled
    let status = base.status;
    if (incoming.status === 'final' || base.status === 'final') {
      status = 'final';
    } else if (incoming.status === 'in_progress' || base.status === 'in_progress') {
      status = 'in_progress';
    } else {
      status = incoming.status || base.status || 'scheduled';
    }

    const hasIncomingHome = incoming.homeScore !== undefined && !isNaN(incoming.homeScore);
    const hasIncomingAway = incoming.awayScore !== undefined && !isNaN(incoming.awayScore);

    const homeScore = hasIncomingHome ? incoming.homeScore : base.homeScore;
    const awayScore = hasIncomingAway ? incoming.awayScore : base.awayScore;

    let winnerTeamId = incoming.winnerTeamId || base.winnerTeamId;
    if (status === 'final' && homeScore !== undefined && awayScore !== undefined) {
      if (homeScore > awayScore) {
        winnerTeamId = incoming.homeTeam?.id || base.homeTeam?.id;
      } else if (awayScore > homeScore) {
        winnerTeamId = incoming.awayTeam?.id || base.awayTeam?.id;
      } else {
        winnerTeamId = 'TIE';
      }
    }

    return {
      ...base,
      ...incoming,
      id: base.id || incoming.id,
      status,
      homeScore,
      awayScore,
      winnerTeamId,
      quarter: incoming.quarter || base.quarter,
      clock: incoming.clock || base.clock,
      date: incoming.date || base.date,
      time: incoming.time || base.time,
      dateIso: incoming.dateIso || base.dateIso,
      tvNetwork: incoming.tvNetwork || base.tvNetwork,
      stadium: incoming.stadium || base.stadium,
      spread: incoming.spread || base.spread,
      homeTeam: {
        ...base.homeTeam,
        ...(incoming.homeTeam || {}),
        record: incoming.homeTeam?.record || base.homeTeam?.record || '0-0',
      },
      awayTeam: {
        ...base.awayTeam,
        ...(incoming.awayTeam || {}),
        record: incoming.awayTeam?.record || base.awayTeam?.record || '0-0',
      },
    };
  });

  for (const inc of incomingGames) {
    if (!matchedIncomingIds.has(inc.id)) {
      const alreadyPresent = merged.some(
        (m) =>
          m.id === inc.id ||
          (m.homeTeam?.id === inc.homeTeam?.id && m.awayTeam?.id === inc.awayTeam?.id)
      );
      if (!alreadyPresent) {
        merged.push(inc);
      }
    }
  }

  return merged;
}

/**
 * Sync live NFL games in Cloud Firestore
 */
export async function syncFirestoreGames(weekId: number, incomingGames: NFLGame[]): Promise<void> {
  await ensureFirestoreInitialized();
  const db = getDb();

  const weekRef = doc(db, 'weeks', String(weekId));
  const weekSnap = await getDoc(weekRef);

  if (weekSnap.exists()) {
    const existingWeekData = weekSnap.data() as any;
    const existingGames: NFLGame[] = existingWeekData.games || [];
    const mergedGames = mergeGameLists(existingGames, incomingGames);
    const isFinished = mergedGames.length > 0 && mergedGames.every((g) => g.status === 'final');

    await updateDoc(
      weekRef,
      sanitizeForFirestore({
        games: mergedGames,
        isFinished,
        updatedAt: new Date().toISOString(),
      })
    );
  }
}

/**
 * Reset all users' passwords (admin recovery) in Cloud Firestore
 */
export async function resetAllFirestorePasswords(adminSecret: string): Promise<void> {
  const expectedSecret = process.env.ADMIN_SECRET || 'ADMIN_RESET_ENRIQUE_2026';
  if (adminSecret !== expectedSecret) {
    throw new Error('Clave de administrador incorrecta.');
  }

  await ensureFirestoreInitialized();
  const db = getDb();

  const usersSnap = await getDocs(collection(db, 'users'));
  const updates: Promise<any>[] = [];

  usersSnap.forEach((u) => {
    updates.push(
      updateDoc(u.ref, {
        hasPassword: false,
        passwordHash: null,
        salt: null,
        createdAt: null,
      })
    );
  });

  // Delete all sessions
  const sessionsSnap = await getDocs(collection(db, 'sessions'));
  sessionsSnap.forEach((s) => {
    updates.push(deleteDoc(s.ref));
  });

  await Promise.all(updates);
}
