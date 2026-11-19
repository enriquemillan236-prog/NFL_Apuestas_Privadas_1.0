import { NFLGame, UserPick, UserId, WeekState, UserProfile } from '../types';

export const BASE_STAKE_PER_USER = 50; // Bs. 50.00 base por apostador
export const TOTAL_USERS_COUNT = 5;
export const BASE_WEEK_POT = BASE_STAKE_PER_USER * TOTAL_USERS_COUNT; // Bs. 250.00 total semanal

export interface UserWeekScore {
  userId: UserId;
  correctPicks: number;
  livePicksLeading: number;
  totalGames: number;
  playoffPoints?: number;
  marginHits?: number; // count of scores within +- 7 points
}

/**
 * Calculates user scores for a given week.
 */
export function calculateWeekScores(
  week: WeekState,
  userPicks: Record<UserId, Record<string, UserPick>>
): Record<UserId, UserWeekScore> {
  const users: UserId[] = ['enrique', 'diego', 'adrian', 'alejandro', 'andres'];
  const scores: Record<UserId, UserWeekScore> = {} as Record<UserId, UserWeekScore>;

  users.forEach((userId) => {
    scores[userId] = {
      userId,
      correctPicks: 0,
      livePicksLeading: 0,
      totalGames: week.games.length,
      playoffPoints: 0,
      marginHits: 0,
    };
  });

  week.games.forEach((game) => {
    const isFinal = game.status === 'final';
    const isLive = game.status === 'in_progress';

    if (!isFinal && !isLive) return;

    // Actual or provisional game winner
    const homeScore = game.homeScore ?? 0;
    const awayScore = game.awayScore ?? 0;
    const currentLeaderId =
      game.winnerTeamId ||
      (homeScore > awayScore
        ? game.homeTeam.id
        : awayScore > homeScore
        ? game.awayTeam.id
        : null);

    users.forEach((userId) => {
      const pick = userPicks[userId]?.[game.id];
      if (!pick) return;

      if (isFinal) {
        // Final game pick check
        if (pick.selectedTeamId === currentLeaderId) {
          scores[userId].correctPicks += 1;
        }

        // Playoff / Super Bowl score prediction evaluation (+- 7 points margin)
        if (week.weekType === 'playoff' || week.weekType === 'superbowl') {
          let pts = 0;
          let hits = 0;

          if (pick.selectedTeamId === currentLeaderId) {
            pts += 10; // 10 points for picking winner
          }

          if (
            game.homeScore !== undefined &&
            game.awayScore !== undefined &&
            pick.predictedHomeScore !== undefined &&
            pick.predictedAwayScore !== undefined
          ) {
            const homeDiff = Math.abs(pick.predictedHomeScore - game.homeScore);
            const awayDiff = Math.abs(pick.predictedAwayScore - game.awayScore);

            // Margin +- 7 points rule
            if (homeDiff <= 7) {
              hits += 1;
              pts += Math.max(0, 10 - homeDiff);
            }
            if (awayDiff <= 7) {
              hits += 1;
              pts += Math.max(0, 10 - awayDiff);
            }

            // Exact score bonus
            if (homeDiff === 0 && awayDiff === 0) {
              pts += 15;
            }
          }

          scores[userId].playoffPoints = (scores[userId].playoffPoints || 0) + pts;
          scores[userId].marginHits = (scores[userId].marginHits || 0) + hits;
        }
      } else if (isLive) {
        // In progress live pick check: user is currently leading this live game
        if (currentLeaderId && pick.selectedTeamId === currentLeaderId) {
          scores[userId].livePicksLeading += 1;
        }
      }
    });
  });

  return scores;
}

export interface WeekResultEvaluation {
  status: 'pending' | 'calculated';
  winners: UserId[];
  maxScore: number;
  potType: 'single_winner' | 'split_two' | 'rollover_tie' | 'none';
  amountPerWinner: number;
  amountRolledOver: number;
  totalPot: number;
  userScores: Record<UserId, UserWeekScore>;
  summaryText: string;
}

/**
 * Evaluates the winner(s) of the week according to the exact rules:
 * - 1 winner: Wins week outright, claims the whole pot, resets rollover.
 * - 2 winners: Pot is split equally (50% each), both get +1 week won, resets rollover.
 * - 3 or more winners: Pot rolls over to next week. All tied winners get +1 week won.
 */
export function evaluateWeekWinners(
  week: WeekState,
  userPicks: Record<UserId, Record<string, UserPick>>
): WeekResultEvaluation {
  const userScores = calculateWeekScores(week, userPicks);
  const users: UserId[] = ['enrique', 'diego', 'adrian', 'alejandro', 'andres'];

  // Check if all games are final
  const allFinal = week.games.length > 0 && week.games.every((g) => g.status === 'final');
  const isPlayoff = week.weekType === 'playoff' || week.weekType === 'superbowl';
  const userNamesMap: Record<UserId, string> = {
    enrique: 'Enrique',
    diego: 'Diego',
    adrian: 'Adrián',
    alejandro: 'Alejandro',
    andres: 'Andrés',
  };

  if (!allFinal && !week.isFinished) {
    let highestActiveScore = -1;
    users.forEach((u) => {
      const activeScore = isPlayoff
        ? (userScores[u].playoffPoints || 0)
        : userScores[u].correctPicks + userScores[u].livePicksLeading;
      if (activeScore > highestActiveScore) {
        highestActiveScore = activeScore;
      }
    });

    const provisionalWinners =
      highestActiveScore > 0
        ? users.filter((u) => {
            const activeScore = isPlayoff
              ? (userScores[u].playoffPoints || 0)
              : userScores[u].correctPicks + userScores[u].livePicksLeading;
            return activeScore === highestActiveScore;
          })
        : [];

    let summaryText = 'Semana en curso. Los marcadores y posiciones se actualizan en vivo.';
    if (provisionalWinners.length === 1) {
      const wId = provisionalWinners[0];
      const leadHits = userScores[wId].correctPicks;
      const liveHits = userScores[wId].livePicksLeading;
      summaryText = `Líder Provisional: ${userNamesMap[wId]} con ${highestActiveScore} ${
        isPlayoff ? 'pts' : 'aciertos'
      }${liveHits > 0 ? ` (${leadHits} cerrados + ${liveHits} en juego)` : ''}`;
    } else if (provisionalWinners.length > 1) {
      const names = provisionalWinners.map((wId) => userNamesMap[wId]).join(', ');
      summaryText = `Empate en la Cima: ${names} con ${highestActiveScore} ${
        isPlayoff ? 'pts' : 'aciertos'
      } en vivo`;
    }

    return {
      status: 'pending',
      winners: provisionalWinners,
      maxScore: Math.max(0, highestActiveScore),
      potType: 'none',
      amountPerWinner: 0,
      amountRolledOver: 0,
      totalPot: week.totalPot,
      userScores,
      summaryText,
    };
  }

  let highestScore = -1;
  users.forEach((u) => {
    const score = isPlayoff ? (userScores[u].playoffPoints || 0) : userScores[u].correctPicks;
    if (score > highestScore) {
      highestScore = score;
    }
  });

  if (highestScore <= 0) {
    // No picks made or 0 score
    return {
      status: 'calculated',
      winners: [],
      maxScore: 0,
      potType: 'rollover_tie',
      amountPerWinner: 0,
      amountRolledOver: week.totalPot,
      totalPot: week.totalPot,
      userScores,
      summaryText: 'Sin aciertos en la semana. El pozo se acumula para la siguiente semana.',
    };
  }

  // Find all users who achieved the highest score
  const winners = users.filter((u) => {
    const score = isPlayoff ? (userScores[u].playoffPoints || 0) : userScores[u].correctPicks;
    return score === highestScore;
  });

  const totalPot = week.totalPot || week.basePot + week.rolledOverPot;

  if (winners.length === 1) {
    return {
      status: 'calculated',
      winners,
      maxScore: highestScore,
      potType: 'single_winner',
      amountPerWinner: totalPot,
      amountRolledOver: 0,
      totalPot,
      userScores,
      summaryText: `¡${winners[0].toUpperCase()} es el Ganador Absoluto! Se lleva el pozo completo de Bs. ${totalPot.toLocaleString()} con ${highestScore} aciertos.`,
    };
  } else if (winners.length === 2) {
    const splitAmount = Math.floor(totalPot / 2);
    return {
      status: 'calculated',
      winners,
      maxScore: highestScore,
      potType: 'split_two',
      amountPerWinner: splitAmount,
      amountRolledOver: 0,
      totalPot,
      userScores,
      summaryText: `¡Empate entre 2 ganadores (${winners.join(' y ').toUpperCase()})! Cada uno se lleva Bs. ${splitAmount.toLocaleString()} y ambos suman +1 victoria en Semanas Ganadas.`,
    };
  } else {
    // 3 or more winners: rollover!
    return {
      status: 'calculated',
      winners,
      maxScore: highestScore,
      potType: 'rollover_tie',
      amountPerWinner: 0,
      amountRolledOver: totalPot,
      totalPot,
      userScores,
      summaryText: `¡Empate múltiple de ${winners.length} participantes! A todos se les anota su victoria en "Semanas Ganadas" y el pozo de Bs. ${totalPot.toLocaleString()} se ACUMULA para la siguiente semana.`,
    };
  }
}

/**
 * Checks if bets are currently locked for a given week.
 * Rules:
 * - Opens automatically Tuesday at 06:00 AM
 * - Closes strictly 30 minutes before the kickoff of the first game
 */
export function getBetLockStatus(week: WeekState, virtualDate?: Date): {
  isLocked: boolean;
  isOpen: boolean;
  timeUntilLockMs: number;
  formattedCountdown: string;
  statusLabel: string;
  badgeColor: string;
} {
  const now = virtualDate ? virtualDate.getTime() : Date.now();

  // If week is explicitly finished
  if (week.isFinished) {
    return {
      isLocked: true,
      isOpen: false,
      timeUntilLockMs: 0,
      formattedCountdown: 'Semana Finalizada',
      statusLabel: 'FINALIZADA',
      badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
    };
  }

  // If any game in this week has already started or finished, the week is locked
  const hasStartedGame = week.games.some(
    (g) => g.status === 'in_progress' || g.status === 'final'
  );
  if (hasStartedGame) {
    return {
      isLocked: true,
      isOpen: false,
      timeUntilLockMs: 0,
      formattedCountdown: 'Partidos en Juego',
      statusLabel: 'CERRADA / EN JUEGO',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
  }

  if (week.isLocked) {
    return {
      isLocked: true,
      isOpen: false,
      timeUntilLockMs: 0,
      formattedCountdown: 'Apuestas Cerradas',
      statusLabel: 'CERRADA',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
  }

  // Determine earliest kickoff among scheduled games
  let earliestKickoffMs: number | null = null;
  if (week.games && week.games.length > 0) {
    for (const game of week.games) {
      const candidateStr = game.dateIso || game.date;
      if (candidateStr) {
        const time = new Date(candidateStr).getTime();
        if (!isNaN(time) && time > 0) {
          if (earliestKickoffMs === null || time < earliestKickoffMs) {
            earliestKickoffMs = time;
          }
        }
      }
    }
  }

  // Fallback to week.firstGameTime if valid
  if (earliestKickoffMs === null && week.firstGameTime) {
    const parsed = new Date(week.firstGameTime).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      earliestKickoffMs = parsed;
    }
  }

  // If no dates available or if it's a future week (>= 3), it is open!
  if (earliestKickoffMs === null) {
    return {
      isLocked: false,
      isOpen: true,
      timeUntilLockMs: 86400000 * 7,
      formattedCountdown: 'Abierta para Pronósticos',
      statusLabel: 'ABIERTA',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse',
    };
  }

  // Calculate lock timestamp (30 mins before first game)
  const lockTime = earliestKickoffMs - 30 * 60 * 1000;
  const diff = lockTime - now;

  if (diff <= 0) {
    return {
      isLocked: true,
      isOpen: false,
      timeUntilLockMs: 0,
      formattedCountdown: 'Límite de 30 min alcanzado',
      statusLabel: 'BLOQUEADA',
      badgeColor: 'bg-rose-600 text-white border-rose-400',
    };
  }

  // Calculate hours and minutes remaining
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const days = Math.floor(hours / 24);

  let countdownStr = '';
  if (days > 0) {
    countdownStr = `${days}d ${hours % 24}h ${minutes}m`;
  } else if (hours > 0) {
    countdownStr = `${hours}h ${minutes}m`;
  } else {
    countdownStr = `${minutes} min`;
  }

  return {
    isLocked: false,
    isOpen: true,
    timeUntilLockMs: diff,
    formattedCountdown: `Cierra en ${countdownStr}`,
    statusLabel: 'ABIERTA',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse',
  };
}

export interface CumulativeUserRecord {
  userId: UserId;
  name: string;
  avatar: string;
  color: string;
  secondaryColor?: string;
  favoriteTeam: string;
  cumulativeWeeksWon: number;
  wonWeeksList: number[];
  totalPicksCorrect: number;
  totalPicksMade: number;
  earnings: number;
  isCurrentlyLeading?: boolean;
}

/**
 * Calculates cumulative weeks won and cumulative accuracy stats for the 5 participants.
 */
export function calculateCumulativeUserStats(
  users: Record<UserId, UserProfile>,
  weeks: Record<number, WeekState>,
  activeWeekId?: number
): CumulativeUserRecord[] {
  const userList: UserId[] = ['enrique', 'diego', 'adrian', 'alejandro', 'andres'];

  // Track wins, picks, and earnings across all official weeks (Weeks 2..22)
  const winsMap: Record<UserId, Set<number>> = {
    enrique: new Set(),
    diego: new Set(),
    adrian: new Set(),
    alejandro: new Set(),
    andres: new Set(),
  };

  const correctPicksMap: Record<UserId, number> = {
    enrique: 0,
    diego: 0,
    adrian: 0,
    alejandro: 0,
    andres: 0,
  };

  const totalPicksMadeMap: Record<UserId, number> = {
    enrique: 0,
    diego: 0,
    adrian: 0,
    alejandro: 0,
    andres: 0,
  };

  const earningsMap: Record<UserId, number> = {
    enrique: 0,
    diego: 0,
    adrian: 0,
    alejandro: 0,
    andres: 0,
  };

  let carryOverPot = 0;

  // Sort weeks chronologically (1..22)
  const sortedWeeks = Object.values(weeks || {})
    .filter((w): w is WeekState => Boolean(w))
    .sort((a, b) => a.weekNumber - b.weekNumber);

  sortedWeeks.forEach((week) => {
    // Week 1 is inaugural ("No cuenta - Inaugural")
    if (week.weekNumber === 1) return;

    const allGamesFinal =
      week.games && week.games.length > 0 && week.games.every((g) => g.status === 'final');
    const isWeekDone = week.isFinished || allGamesFinal;

    const effectiveWeek: WeekState = {
      ...week,
      rolledOverPot: week.rolledOverPot || carryOverPot,
      totalPot: (week.basePot || BASE_WEEK_POT) + (week.rolledOverPot || carryOverPot),
    };

    if (isWeekDone) {
      const result = evaluateWeekWinners(
        effectiveWeek,
        (week.userPicks || {}) as Record<UserId, Record<string, UserPick>>
      );

      if (result.winners && result.winners.length > 0) {
        result.winners.forEach((uid) => {
          if (winsMap[uid]) winsMap[uid].add(week.weekNumber);
          if (result.amountPerWinner > 0) {
            earningsMap[uid] += result.amountPerWinner;
          }
        });
      }

      if (result.potType === 'rollover_tie') {
        carryOverPot = result.amountRolledOver;
      } else if (result.winners.length > 0) {
        carryOverPot = 0;
      }
    }

    // Count correct picks for finished games
    (week.games || []).forEach((game) => {
      if (game.status === 'final') {
        const winningTeamId =
          game.winnerTeamId ||
          (game.homeScore !== undefined && game.awayScore !== undefined
            ? game.homeScore > game.awayScore
              ? game.homeTeam.id
              : game.awayTeam.id
            : null);

        userList.forEach((uid) => {
          const pick = week.userPicks?.[uid]?.[game.id];
          if (pick) {
            totalPicksMadeMap[uid] += 1;
            if (winningTeamId && pick.selectedTeamId === winningTeamId) {
              correctPicksMap[uid] += 1;
            }
          }
        });
      }
    });
  });

  // Calculate who is currently leading the active week
  let activeWeekLeaders: UserId[] = [];
  if (activeWeekId && weeks[activeWeekId]) {
    const actWeek = weeks[activeWeekId];
    const scores = calculateWeekScores(actWeek, (actWeek.userPicks || {}) as Record<UserId, Record<string, UserPick>>);
    let maxHits = -1;
    userList.forEach((uid) => {
      const combined = scores[uid].correctPicks + scores[uid].livePicksLeading;
      if (combined > maxHits && combined > 0) {
        maxHits = combined;
        activeWeekLeaders = [uid];
      } else if (combined === maxHits && maxHits > 0) {
        activeWeekLeaders.push(uid);
      }
    });
  }

  return userList.map((uid) => {
    const profile = users[uid] || {
      id: uid,
      name: uid,
      email: '',
      avatar: '👤',
      color: '#3B82F6',
      favoriteTeam: 'KC',
      pin: '1234',
      isPasswordSet: false,
      weeksWon: 0,
      totalPicksCorrect: 0,
      totalPicksMade: 0,
      earnings: 0,
    };

    // Calculate total weeks won: max of explicit profile.weeksWon or dynamic winsMap
    const computedWins = winsMap[uid].size;
    const finalWins = Math.max(profile.weeksWon || 0, computedWins);
    const wonWeeksList = Array.from(winsMap[uid]).sort((a, b) => a - b);

    const finalCorrectPicks = Math.max(profile.totalPicksCorrect || 0, correctPicksMap[uid]);
    const finalPicksMade = Math.max(profile.totalPicksMade || 0, totalPicksMadeMap[uid]);
    const finalEarnings = Math.max(profile.earnings || 0, earningsMap[uid]);

    return {
      userId: uid,
      name: profile.name,
      avatar: profile.avatar,
      color: profile.color,
      secondaryColor: (profile as any).secondaryColor || profile.color,
      favoriteTeam: profile.favoriteTeam,
      cumulativeWeeksWon: finalWins,
      wonWeeksList,
      totalPicksCorrect: finalCorrectPicks,
      totalPicksMade: finalPicksMade,
      earnings: finalEarnings,
      isCurrentlyLeading: activeWeekLeaders.includes(uid),
    };
  }).sort((a, b) => {
    // Sort by cumulative weeks won descending, then by total correct picks, then by earnings
    if (b.cumulativeWeeksWon !== a.cumulativeWeeksWon) {
      return b.cumulativeWeeksWon - a.cumulativeWeeksWon;
    }
    if (b.totalPicksCorrect !== a.totalPicksCorrect) {
      return b.totalPicksCorrect - a.totalPicksCorrect;
    }
    return b.earnings - a.earnings;
  });
}

const TEAM_ABBR_NORMALIZATION: Record<string, string> = {
  WSH: 'WAS',
  LA: 'LAR',
  OAK: 'LV',
  SD: 'LAC',
  STL: 'LAR',
};

const GAME_STATUS_RANK: Record<string, number> = {
  scheduled: 0,
  in_progress: 1,
  final: 2,
};

function normalizeTeamAbbr(id?: string | null): string {
  if (!id) return '';
  const upper = String(id).trim().toUpperCase();
  return TEAM_ABBR_NORMALIZATION[upper] || upper;
}

function isSameNFLGame(a: NFLGame, b: NFLGame): boolean {
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  const aHome = normalizeTeamAbbr(a.homeTeam?.id || a.homeTeam?.abbreviation);
  const aAway = normalizeTeamAbbr(a.awayTeam?.id || a.awayTeam?.abbreviation);
  const bHome = normalizeTeamAbbr(b.homeTeam?.id || b.homeTeam?.abbreviation);
  const bAway = normalizeTeamAbbr(b.awayTeam?.id || b.awayTeam?.abbreviation);
  return Boolean(aHome && aAway && aHome === bHome && aAway === bAway);
}

function isValidScore(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

function parseClockSeconds(clock?: string | null): number | null {
  if (!clock || typeof clock !== 'string') return null;
  const parts = clock.trim().split(':');
  if (parts.length !== 2) return null;
  const mins = parseInt(parts[0], 10);
  const secs = parseInt(parts[1], 10);
  if (isNaN(mins) || isNaN(secs)) return null;
  return mins * 60 + secs;
}

function parseQuarterRank(quarter?: string | null): number | null {
  if (!quarter || typeof quarter !== 'string') return null;
  const q = quarter.trim().toUpperCase();
  if (q === '1Q' || q === '1' || q === 'Q1') return 1;
  if (q === '2Q' || q === '2' || q === 'Q2') return 2;
  if (q.includes('MEDIO') || q.includes('HALF') || q === 'HT') return 2.5;
  if (q === '3Q' || q === '3' || q === 'Q3') return 3;
  if (q === '4Q' || q === '4' || q === 'Q4') return 4;
  if (q === 'OT' || q === 'TE' || q.includes('OVERTIME') || q === '5Q') return 5;
  if (q.includes('FINAL')) return 6;
  return null;
}

function getLiveGameProgress(quarter?: string | null, clock?: string | null): number | null {
  const qRank = parseQuarterRank(quarter);
  if (qRank === null) return null;
  if (qRank === 2.5 || qRank === 6) return qRank * 10000;
  const remSecs = parseClockSeconds(clock);
  if (remSecs === null) return qRank * 10000;
  const elapsed = Math.max(0, 900 - remSecs);
  return qRank * 10000 + elapsed;
}

function sanitizeGameNulls(game: NFLGame): NFLGame {
  const cleaned: NFLGame = {
    ...game,
    homeScore: game.status !== 'scheduled' && isValidScore(game.homeScore) ? game.homeScore : undefined,
    awayScore: game.status !== 'scheduled' && isValidScore(game.awayScore) ? game.awayScore : undefined,
    quarter: game.quarter || undefined,
    clock: game.clock || undefined,
    winnerTeamId: game.status === 'final' ? (game.winnerTeamId || undefined) : undefined,
    spread: game.spread || undefined,
  };
  return cleaned;
}

/**
 * Safely merge two lists of games without losing live scores, quarters, clocks, or final results.
 * Prevents flickering or reverting to scheduled/0-0 state when background polls arrive.
 */
export function mergeGameLists(baseGames: NFLGame[] = [], incomingGames: NFLGame[] = []): NFLGame[] {
  const cleanBase = (baseGames || []).map(sanitizeGameNulls);
  const cleanIncoming = (incomingGames || []).map(sanitizeGameNulls);

  if (cleanIncoming.length === 0) return cleanBase;
  if (cleanBase.length === 0) return cleanIncoming;

  const matchedIncomingIndices = new Set<number>();

  const merged = cleanBase.map((base) => {
    const incomingIdx = cleanIncoming.findIndex((inc) => isSameNFLGame(base, inc));
    if (incomingIdx === -1) return base;

    matchedIncomingIndices.add(incomingIdx);
    const incoming = cleanIncoming[incomingIdx];

    const baseRank = GAME_STATUS_RANK[base.status] ?? 0;
    const incomingRank = GAME_STATUS_RANK[incoming.status] ?? 0;

    const baseHasScores =
      base.status !== 'scheduled' && isValidScore(base.homeScore) && isValidScore(base.awayScore);
    const incomingHasScores =
      incoming.status !== 'scheduled' &&
      isValidScore(incoming.homeScore) &&
      isValidScore(incoming.awayScore);

    // Decide whether incoming carries newer/authoritative live or final state
    let useIncomingLiveState = false;

    if (incomingRank < baseRank) {
      // Never allow scheduled/in_progress to downgrade an in_progress/final game
      useIncomingLiveState = false;
    } else if (incomingRank > baseRank) {
      // Strictly advanced state (scheduled -> in_progress, in_progress -> final, scheduled -> final)
      useIncomingLiveState = true;
    } else if (baseRank === 0) {
      // Both scheduled
      useIncomingLiveState = true;
    } else if (baseRank === 2) {
      // Both final: never downgrade valid scores to null/undefined or lower total
      if (incomingHasScores && baseHasScores) {
        const baseTotal = base.homeScore! + base.awayScore!;
        const incTotal = incoming.homeScore! + incoming.awayScore!;
        useIncomingLiveState = incTotal >= baseTotal;
      } else {
        useIncomingLiveState = incomingHasScores;
      }
    } else {
      // Both in_progress: protect live scores, quarter, and clock from stale server reads
      if (!incomingHasScores && baseHasScores) {
        useIncomingLiveState = false;
      } else if (incomingHasScores && !baseHasScores) {
        useIncomingLiveState = true;
      } else if (incomingHasScores && baseHasScores) {
        const baseTotal = base.homeScore! + base.awayScore!;
        const incTotal = incoming.homeScore! + incoming.awayScore!;
        if (incTotal < baseTotal) {
          useIncomingLiveState = false;
        } else if (incTotal > baseTotal) {
          useIncomingLiveState = true;
        } else {
          // Equal scores: compare quarter & clock progression
          const baseProg = getLiveGameProgress(base.quarter, base.clock);
          const incProg = getLiveGameProgress(incoming.quarter, incoming.clock);
          if (baseProg !== null && incProg !== null) {
            useIncomingLiveState = incProg >= baseProg;
          } else if (baseProg !== null && incProg === null) {
            useIncomingLiveState = false;
          } else {
            useIncomingLiveState = true;
          }
        }
      } else {
        const baseProg = getLiveGameProgress(base.quarter, base.clock);
        const incProg = getLiveGameProgress(incoming.quarter, incoming.clock);
        if (baseProg !== null && (incProg === null || incProg < baseProg)) {
          useIncomingLiveState = false;
        } else {
          useIncomingLiveState = true;
        }
      }
    }

    const status = useIncomingLiveState ? incoming.status || base.status || 'scheduled' : base.status;

    let homeScore: number | undefined;
    let awayScore: number | undefined;
    if (status !== 'scheduled') {
      if (useIncomingLiveState) {
        homeScore = isValidScore(incoming.homeScore)
          ? incoming.homeScore
          : isValidScore(base.homeScore)
          ? base.homeScore
          : undefined;
        awayScore = isValidScore(incoming.awayScore)
          ? incoming.awayScore
          : isValidScore(base.awayScore)
          ? base.awayScore
          : undefined;
      } else {
        homeScore = isValidScore(base.homeScore)
          ? base.homeScore
          : isValidScore(incoming.homeScore)
          ? incoming.homeScore
          : undefined;
        awayScore = isValidScore(base.awayScore)
          ? base.awayScore
          : isValidScore(incoming.awayScore)
          ? incoming.awayScore
          : undefined;
      }
    }

    const quarter =
      status === 'scheduled'
        ? undefined
        : useIncomingLiveState
        ? incoming.quarter || base.quarter || undefined
        : base.quarter || incoming.quarter || undefined;

    const clock =
      status === 'scheduled'
        ? incoming.clock || base.clock || undefined
        : useIncomingLiveState
        ? incoming.clock || base.clock || undefined
        : base.clock || incoming.clock || undefined;

    let winnerTeamId: string | undefined;
    if (status === 'final') {
      if (isValidScore(homeScore) && isValidScore(awayScore)) {
        if (homeScore > awayScore) {
          winnerTeamId = base.homeTeam?.id || incoming.homeTeam?.id;
        } else if (awayScore > homeScore) {
          winnerTeamId = base.awayTeam?.id || incoming.awayTeam?.id;
        } else {
          winnerTeamId = 'TIE';
        }
      } else {
        winnerTeamId = base.winnerTeamId || incoming.winnerTeamId || undefined;
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
      quarter,
      clock,
      date: incoming.date || base.date,
      time: incoming.time || base.time,
      dateIso: incoming.dateIso || base.dateIso,
      tvNetwork: incoming.tvNetwork || base.tvNetwork,
      stadium: incoming.stadium || base.stadium,
      spread: incoming.spread || base.spread,
      homeTeam: {
        ...base.homeTeam,
        ...(incoming.homeTeam || {}),
        id: base.homeTeam?.id || incoming.homeTeam?.id,
        record: incoming.homeTeam?.record || base.homeTeam?.record || '0-0',
      },
      awayTeam: {
        ...base.awayTeam,
        ...(incoming.awayTeam || {}),
        id: base.awayTeam?.id || incoming.awayTeam?.id,
        record: incoming.awayTeam?.record || base.awayTeam?.record || '0-0',
      },
    };
  });

  cleanIncoming.forEach((inc, idx) => {
    if (!matchedIncomingIndices.has(idx)) {
      const alreadyPresent = merged.some((m) => isSameNFLGame(m, inc));
      if (!alreadyPresent) {
        merged.push(inc);
      }
    }
  });

  return merged;
}
