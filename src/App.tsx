import React, { useState, useEffect, useCallback } from 'react';
import { QuinielaData, UserId, UserPick, UserProfile, WeekState } from './types';
import { INITIAL_QUINIELA_STATE } from './data/initialData';
import { SplashScreen } from './components/SplashScreen';
import { Navbar, NavTab } from './components/Navbar';
import { WeekHeroBanner } from './components/WeekHeroBanner';
import { MatchesDashboard } from './components/MatchesDashboard';
import { PicksPanel } from './components/PicksPanel';
import { LeaderboardView } from './components/LeaderboardView';
import { PicksMatrix } from './components/PicksMatrix';
import { PotModal } from './components/PotModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { evaluateWeekWinners, mergeGameLists } from './utils/bettingRules';
import { fetchNFLScoreboard } from './services/nflApiService';
import { authService } from './services/authService';
import { tournamentService } from './services/tournamentService';

export default function App() {
  // Remote database authoritative state
  const [data, setData] = useState<QuinielaData>(INITIAL_QUINIELA_STATE);

  // UI state
  const [currentTab, setCurrentTab] = useState<NavTab>('matches');
  const [showSplash, setShowSplash] = useState<boolean>(!data.hasCompletedSplash);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isPotModalOpen, setIsPotModalOpen] = useState<boolean>(false);

  // Live NFL Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const currentWeek: WeekState = data.weeks[data.currentWeekId] || data.weeks[2] || data.weeks[1];
  const activeUser = data.activeUserId ? data.users[data.activeUserId] : null;

  // Synchronization with official NFL calendar and live scoreboard
  const syncWeekData = useCallback(async (weekId: number, silent: boolean = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const scoreboard = await fetchNFLScoreboard(weekId);
      let gamesToPersist: any[] = [];

      setData((prev) => {
        const existingWeek = prev.weeks[weekId];
        const baseGames = existingWeek?.games || [];
        const incomingGames = scoreboard.games || [];

        // Safely merge incoming scoreboard with existing games without dropping live data
        const mergedGames = mergeGameLists(baseGames, incomingGames);
        gamesToPersist = mergedGames;
        const isAllFinished = mergedGames.length > 0 && mergedGames.every((g) => g.status === 'final');

        if (!existingWeek) {
          const newWeek: WeekState = {
            weekNumber: weekId,
            name: weekId <= 18 ? `Semana ${weekId}` : weekId === 22 ? 'Super Bowl LXI' : `Playoffs ${weekId}`,
            weekType: weekId <= 18 ? 'regular' : weekId === 22 ? 'superbowl' : 'playoff',
            opensAt: 'Martes 06:00 AM',
            locksAt: 'Jueves 17:50 PM',
            firstGameTime: mergedGames[0]?.date || '2026-09-17T18:15:00Z',
            isLocked: false,
            isFinished: isAllFinished,
            basePot: 250,
            rolledOverPot: 0,
            totalPot: 250,
            games: mergedGames,
            userPicks: {
              enrique: {},
              diego: {},
              adrian: {},
              alejandro: {},
              andres: {},
            },
            submittedUsers: {
              enrique: false,
              diego: false,
              adrian: false,
              alejandro: false,
              andres: false,
            },
            submittedAt: {},
          };
          return {
            ...prev,
            weeks: {
              ...prev.weeks,
              [weekId]: newWeek,
            },
          };
        }

        return {
          ...prev,
          weeks: {
            ...prev.weeks,
            [weekId]: {
              ...existingWeek,
              games: mergedGames,
              isFinished: isAllFinished,
            },
          },
        };
      });

      setLastSyncTime(scoreboard.lastUpdated);

      // Persist the merged live game scores to Firestore so background state polls also receive them
      if (gamesToPersist.length > 0) {
        tournamentService.syncGames(weekId, gamesToPersist).catch((err) => {
          console.warn('Could not persist synced games to backend:', err);
        });
      }
    } catch (err) {
      console.warn('Could not sync with official NFL live feed:', err);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, []);

  // Sync on mount and when week changes
  useEffect(() => {
    syncWeekData(data.currentWeekId, true);
  }, [data.currentWeekId, syncWeekData]);

  // Live polling interval for real-time scores
  useEffect(() => {
    const hasLiveGames = currentWeek?.games?.some((g) => g.status === 'in_progress');
    // Poll every 30s during live games, or 60s otherwise
    const intervalTime = hasLiveGames ? 30000 : 60000;

    const timer = setInterval(() => {
      syncWeekData(data.currentWeekId, true);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [data.currentWeekId, currentWeek, syncWeekData]);

  // Synchronize registered password status with backend database (works across devices, reload & cache clearing)
  useEffect(() => {
    authService
      .getStatus()
      .then((serverStatus) => {
        setData((prev) => {
          let hasChanges = false;
          const updatedUsers = { ...prev.users };
          for (const [id, status] of Object.entries(serverStatus)) {
            const uid = id as UserId;
            if (updatedUsers[uid]) {
              const serverHasPw = Boolean(status.hasPassword);
              if (updatedUsers[uid].isPasswordSet !== serverHasPw || updatedUsers[uid].password !== '') {
                updatedUsers[uid] = {
                  ...updatedUsers[uid],
                  isPasswordSet: serverHasPw,
                  password: '',
                };
                hasChanges = true;
              }
            }
          }
          if (!hasChanges) return prev;
          return {
            ...prev,
            users: updatedUsers,
          };
        });
      })
      .catch((err) => {
        console.warn('Could not sync initial auth status with backend:', err);
      });
  }, []);

  // Fetch and refresh authoritative tournament database from backend
  const refreshTournamentState = useCallback(async () => {
    try {
      const serverState = await tournamentService.getState();
      setData((prev) => {
        // Merge serverState.weeks with prev.weeks without losing live games, quarters, clocks, or scores!
        const mergedWeeks: Record<number, WeekState> = { ...serverState.weeks };

        for (const wIdStr of Object.keys(prev.weeks)) {
          const wId = Number(wIdStr);
          const prevWeek = prev.weeks[wId];
          const serverWeek = mergedWeeks[wId];

          if (serverWeek && prevWeek) {
            // mergeGameLists preserves live and finished games if server is still scheduled or incomplete
            const baseGames = prevWeek.games && prevWeek.games.length > 0 ? prevWeek.games : serverWeek.games;
            const combinedGames = mergeGameLists(baseGames, serverWeek.games);
            const isAllFinished = combinedGames.length > 0 && combinedGames.every((g) => g.status === 'final');

            // Deep merge userPicks so that existing picks in memory are NEVER wiped by an empty response
            const mergedUserPicks: Record<UserId, Record<string, UserPick>> = {
              enrique: {},
              diego: {},
              adrian: {},
              alejandro: {},
              andres: {},
            };
            const allUsers: UserId[] = ['enrique', 'diego', 'adrian', 'alejandro', 'andres'];
            for (const uid of allUsers) {
              const prevPicks = prevWeek.userPicks?.[uid] || {};
              const serverPicks = serverWeek.userPicks?.[uid] || {};
              if (Object.keys(serverPicks).length >= Object.keys(prevPicks).length) {
                mergedUserPicks[uid] = { ...prevPicks, ...serverPicks };
              } else {
                mergedUserPicks[uid] = { ...serverPicks, ...prevPicks };
              }
            }

            const mergedSubmittedUsers = {
              ...(prevWeek.submittedUsers || {}),
              ...(serverWeek.submittedUsers || {}),
            };

            const mergedSubmittedAt = {
              ...(prevWeek.submittedAt || {}),
              ...(serverWeek.submittedAt || {}),
            };

            mergedWeeks[wId] = {
              ...serverWeek,
              games: combinedGames,
              isFinished: serverWeek.isFinished || isAllFinished,
              userPicks: mergedUserPicks,
              submittedUsers: mergedSubmittedUsers,
              submittedAt: mergedSubmittedAt,
            };
          } else if (!serverWeek && prevWeek) {
            mergedWeeks[wId] = prevWeek;
          }
        }

        // Deep merge users ensuring credentials and weeksWon are never downgraded
        const mergedUsers: Record<UserId, UserProfile> = { ...serverState.users };
        for (const uid of ['enrique', 'diego', 'adrian', 'alejandro', 'andres'] as UserId[]) {
          if (prev.users[uid]) {
            mergedUsers[uid] = {
              ...prev.users[uid],
              ...(serverState.users[uid] || {}),
              isPasswordSet: prev.users[uid].isPasswordSet || Boolean(serverState.users[uid]?.isPasswordSet),
              weeksWon: Math.max(prev.users[uid].weeksWon || 0, serverState.users[uid]?.weeksWon || 0),
              totalPicksCorrect: Math.max(prev.users[uid].totalPicksCorrect || 0, serverState.users[uid]?.totalPicksCorrect || 0),
              totalPicksMade: Math.max(prev.users[uid].totalPicksMade || 0, serverState.users[uid]?.totalPicksMade || 0),
              earnings: Math.max(prev.users[uid].earnings || 0, serverState.users[uid]?.earnings || 0),
            };
          }
        }

        return {
          ...serverState,
          users: mergedUsers,
          weeks: mergedWeeks,
          activeUserId: prev.activeUserId,
          currentWeekId: prev.currentWeekId || serverState.currentWeekId || 2,
          hasCompletedSplash: prev.hasCompletedSplash,
        };
      });
    } catch (err) {
      console.warn('Could not refresh tournament state:', err);
    }
  }, []);

  // Verify session and load persistent tournament state on startup
  useEffect(() => {
    // 1. Restore authenticated session
    authService
      .verifySession()
      .then((verifiedUser) => {
        if (verifiedUser) {
          setData((prev) => ({
            ...prev,
            activeUserId: verifiedUser.id,
          }));
        }
      })
      .catch(() => {});

    // 2. Fetch authoritative tournament state
    refreshTournamentState();
  }, [refreshTournamentState]);

  // Real-time synchronization across devices and 5 league members:
  // Polls every 15s and on window focus so all players see picks made by others in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTournamentState();
    }, 15000);

    const onFocus = () => {
      refreshTournamentState();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshTournamentState]);

  // Handle entering from splash screen
  const handleEnterFromSplash = () => {
    setShowSplash(false);
    setData((prev) => ({ ...prev, hasCompletedSplash: true }));
    if (!data.activeUserId) {
      setIsAuthOpen(true);
    }
  };

  // Handle user authentication / selection
  const handleSelectUser = (userId: UserId, remember: boolean) => {
    setData((prev) => ({
      ...prev,
      activeUserId: userId,
    }));
  };

  // Handle user logout
  const handleLogout = () => {
    authService.logout().catch(() => {});
    setData((prev) => ({
      ...prev,
      activeUserId: null,
    }));
  };

  // Handle user setting their password (FIRST AND ONLY TIME)
  const handleSetUserPassword = (userId: UserId, password: string) => {
    setData((prev) => {
      const user = prev.users[userId];
      if (!user) return prev;
      return {
        ...prev,
        users: {
          ...prev.users,
          [userId]: {
            ...user,
            isPasswordSet: true,
          },
        },
      };
    });
  };

  // Handle week selection
  const handleSelectWeek = (weekId: number) => {
    setData((prev) => ({
      ...prev,
      currentWeekId: weekId,
    }));
    syncWeekData(weekId, false);
  };

  // Handle saving or updating a pick
  const handleSavePick = (
    gameId: string,
    teamId: string,
    homeScore?: number,
    awayScore?: number,
    targetWeekId?: number
  ) => {
    if (!data.activeUserId) {
      setIsAuthOpen(true);
      return;
    }

    const userId = data.activeUserId;
    const weekId = targetWeekId || data.currentWeekId;

    // Optimistic UI update for instantaneous responsiveness
    setData((prev) => {
      const week = prev.weeks[weekId];
      if (!week) return prev;

      // Restrict modification if user already pressed APOSTAR
      if (week.submittedUsers?.[userId]) {
        console.warn('Tus apuestas ya están selladas y no se pueden modificar.');
        return prev;
      }

      const userPicks = { ...(week.userPicks[userId] || {}) };
      userPicks[gameId] = {
        userId,
        gameId,
        selectedTeamId: teamId,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
        timestamp: new Date().toISOString(),
      };

      const updatedWeeks = {
        ...prev.weeks,
        [weekId]: {
          ...week,
          userPicks: {
            ...week.userPicks,
            [userId]: userPicks,
          },
        },
      };

      return {
        ...prev,
        weeks: updatedWeeks,
      };
    });

    // Persist to backend database permanently
    tournamentService
      .savePick(userId, weekId, gameId, teamId, homeScore, awayScore)
      .catch((err: any) => {
        console.warn('Error saving pick to database:', err);
        refreshTournamentState();
      });
  };

  // Handle the "APOSTAR" button submission - seals bets for the week
  const handleConfirmBets = async (weekId: number, userId: UserId) => {
    try {
      const result = await tournamentService.submitWeekBets(userId, weekId);
      setData((prev) => {
        const week = prev.weeks[weekId];
        if (!week) return prev;
        const now = result.submittedAt || new Date().toISOString();
        return {
          ...prev,
          weeks: {
            ...prev.weeks,
            [weekId]: {
              ...week,
              submittedUsers: {
                ...(week.submittedUsers || {}),
                [userId]: true,
              },
              submittedAt: {
                ...(week.submittedAt || {}),
                [userId]: now,
              },
            },
          },
        };
      });
      refreshTournamentState();
    } catch (err: any) {
      console.error('Error confirming bets on server:', err);
      alert(err.message || 'Error al sellar las apuestas.');
      refreshTournamentState();
    }
  };

  // If user requested splash screen or viewing for first time
  if (showSplash) {
    return <SplashScreen onEnter={handleEnterFromSplash} />;
  }

  return (
    <div className="min-h-screen bg-[#060D18] text-slate-100 flex flex-col justify-between selection:bg-rose-600 selection:text-white">
      {/* Sticky Header Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'pot') {
            setIsPotModalOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        activeUser={activeUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentWeek={currentWeek}
        allWeeks={data.weeks}
        onSelectWeek={handleSelectWeek}
        onOpenPotModal={() => setIsPotModalOpen(true)}
        onOpenIntro={() => setShowSplash(true)}
        onLogout={handleLogout}
      />

      {/* Main App Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Dynamic Hero Banner matching reference photo */}
        <WeekHeroBanner
          currentWeek={currentWeek}
          quinielaData={data}
          onGoToPicks={() => setCurrentTab('picks')}
          onOpenPotModal={() => setIsPotModalOpen(true)}
        />

        {/* Tab Content Views */}
        {currentTab === 'matches' && (
          <MatchesDashboard
            currentWeek={currentWeek}
            allWeeks={data.weeks}
            activeUser={activeUser}
            onGoToPicks={() => setCurrentTab('picks')}
            onQuickPick={(gameId, teamId) => handleSavePick(gameId, teamId)}
            onSelectWeek={handleSelectWeek}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
            onManualSync={() => syncWeekData(data.currentWeekId, false)}
          />
        )}

        {currentTab === 'picks' && (
          <PicksPanel
            currentWeek={currentWeek}
            allWeeks={data.weeks}
            activeUser={activeUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            onSavePick={handleSavePick}
            onConfirmBets={handleConfirmBets}
            onSelectWeek={handleSelectWeek}
            onSyncWeek={(weekId) => syncWeekData(weekId, false)}
            isSyncing={isSyncing}
          />
        )}

        {currentTab === 'leaderboard' && (
          <LeaderboardView
            users={data.users}
            activeUserId={data.activeUserId}
            quinielaData={data}
            activeWeekId={data.currentWeekId}
          />
        )}

        {currentTab === 'matrix' && (
          <PicksMatrix
            currentWeek={currentWeek}
            allWeeks={data.weeks}
            users={data.users}
            activeUserId={data.activeUserId}
            onSelectWeek={handleSelectWeek}
            onSyncWeek={(weekId) => syncWeekData(weekId, false)}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        users={data.users}
        weeks={data.weeks}
        currentWeekId={data.currentWeekId}
        onOpenIntro={() => setShowSplash(true)}
        onOpenPotModal={() => setIsPotModalOpen(true)}
      />

      {/* Auth Selector Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        users={data.users}
        activeUserId={data.activeUserId}
        onSelectUser={handleSelectUser}
        onSetPassword={handleSetUserPassword}
        onLogout={handleLogout}
      />

      {/* Pot & Official Rules Modal */}
      <PotModal
        isOpen={isPotModalOpen}
        onClose={() => setIsPotModalOpen(false)}
        currentWeek={currentWeek}
        quinielaData={data}
      />
    </div>
  );
}
