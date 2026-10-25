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

  // Track wins and picks across all weeks
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

  // Scan every week in the season
  Object.values(weeks || {}).forEach((week) => {
    if (!week) return;

    // Check week winners if finished or if evaluation has winners
    if (week.isFinished && Array.isArray(week.winners) && week.winners.length > 0) {
      week.winners.forEach((uid) => {
        if (winsMap[uid]) winsMap[uid].add(week.weekNumber);
      });
    } else if (week.isFinished && week.games && week.games.length > 0 && week.games.every((g) => g.status === 'final')) {
      const result = evaluateWeekWinners(week, (week.userPicks || {}) as Record<UserId, Record<string, UserPick>>);
      if (result.winners && result.winners.length > 0) {
        result.winners.forEach((uid) => {
          if (winsMap[uid]) winsMap[uid].add(week.weekNumber);
        });
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
      earnings: profile.earnings || 0,
      isCurrentlyLeading: activeWeekLeaders.includes(uid),
    };
  }).sort((a, b) => {
    // Sort by cumulative weeks won descending, then by total correct picks
    if (b.cumulativeWeeksWon !== a.cumulativeWeeksWon) {
      return b.cumulativeWeeksWon - a.cumulativeWeeksWon;
    }
    return b.totalPicksCorrect - a.totalPicksCorrect;
  });
}

/**
 * Safely merge two lists of games without losing live scores, quarters, clocks, or final results.
 * Prevents flickering or reverting to scheduled state when background polls arrive.
 */
export function mergeGameLists(baseGames: NFLGame[] = [], incomingGames: NFLGame[] = []): NFLGame[] {
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

    // Progression: final > in_progress > scheduled
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

    let homeScore = base.homeScore;
    if (hasIncomingHome) {
      if (status === 'final' && base.homeScore !== undefined && incoming.homeScore! < base.homeScore) {
        homeScore = base.homeScore;
      } else {
        homeScore = incoming.homeScore;
      }
    }

    let awayScore = base.awayScore;
    if (hasIncomingAway) {
      if (status === 'final' && base.awayScore !== undefined && incoming.awayScore! < base.awayScore) {
        awayScore = base.awayScore;
      } else {
        awayScore = incoming.awayScore;
      }
    }

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
