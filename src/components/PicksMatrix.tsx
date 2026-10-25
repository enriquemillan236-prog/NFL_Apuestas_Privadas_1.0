import React from 'react';
import { UserId, UserProfile, WeekState } from '../types';
import { NFL_TEAMS } from '../data/nflTeams';
import { calculateWeekScores, evaluateWeekWinners, getBetLockStatus } from '../utils/bettingRules';
import { formatETDate, formatETTime } from '../utils/timeUtils';
import {
  Check,
  X,
  Clock,
  Users,
  Trophy,
  Sparkles,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Calendar,
  Flame,
} from 'lucide-react';

interface PicksMatrixProps {
  currentWeek: WeekState;
  allWeeks?: Record<number, WeekState>;
  users: Record<UserId, UserProfile>;
  activeUserId: UserId | null;
  onSelectWeek?: (weekId: number) => void;
  onSyncWeek?: (weekId: number) => void;
  isSyncing?: boolean;
}

export const PicksMatrix: React.FC<PicksMatrixProps> = ({
  currentWeek,
  allWeeks,
  users,
  activeUserId,
  onSelectWeek,
  onSyncWeek,
  isSyncing = false,
}) => {
  const lockStatus = getBetLockStatus(currentWeek);
  const userScores = calculateWeekScores(currentWeek, currentWeek.userPicks);
  const evaluation = evaluateWeekWinners(currentWeek, currentWeek.userPicks);
  const userList: UserId[] = ['enrique', 'diego', 'adrian', 'alejandro', 'andres'];

  return (
    <div className="space-y-6">
      {/* Week Switcher Bar */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Previous Week */}
        <button
          type="button"
          disabled={!onSelectWeek || currentWeek.weekNumber <= 1}
          onClick={() => onSelectWeek && onSelectWeek(currentWeek.weekNumber - 1)}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors border border-slate-700/60"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Semana Anterior</span>
        </button>

        {/* Center: Week Selector & Sync */}
        <div className="flex items-center justify-center gap-2 flex-1">
          <div className="relative">
            <select
              value={currentWeek.weekNumber}
              onChange={(e) => onSelectWeek && onSelectWeek(Number(e.target.value))}
              className="appearance-none bg-slate-950 border border-amber-500/50 hover:border-amber-400 rounded-xl px-4 py-2 pr-9 text-xs sm:text-sm font-extrabold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer shadow-inner transition-colors"
            >
              {allWeeks &&
                (Object.values(allWeeks) as WeekState[]).map((w) => (
                  <option key={w.weekNumber} value={w.weekNumber} className="bg-slate-900 text-white">
                    {w.name} {w.isFinished ? '✓ Finalizada' : w.isLocked ? '🔒 Bloqueada' : '⚡ Activa'}
                  </option>
                ))}
            </select>
            <ChevronDown className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {onSyncWeek && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => onSyncWeek(currentWeek.weekNumber)}
              title="Actualizar partidos y marcadores en vivo"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          )}
        </div>

        {/* Next Week */}
        <button
          type="button"
          disabled={!onSelectWeek || currentWeek.weekNumber >= 22}
          onClick={() => onSelectWeek && onSelectWeek(currentWeek.weekNumber + 1)}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors border border-slate-700/60"
        >
          <span>Semana Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-condensed text-3xl font-extrabold uppercase tracking-wide text-white">
              Matriz Comparativa: Los 5 Amigos
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Revisa y compara las apuestas de Enrique, Diego, Adrián, Alejandro y Andrés frente a
            frente.
          </p>
        </div>

        {/* Lock alert status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border self-start sm:self-auto ${lockStatus.badgeColor}`}>
          {lockStatus.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          <span>{lockStatus.isLocked ? 'Apuestas Bloqueadas para todos' : 'Apuestas Abiertas'}</span>
        </div>
      </div>

      {/* Current Week Live Leader Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-600/20 border border-amber-400/40 flex items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 font-bold shadow">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <span>{currentWeek.isFinished ? 'Resultado Oficial' : 'Líder(es) Provisional(es) en Vivo'}</span>
              {!currentWeek.isFinished && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 animate-pulse">
                  Marcadores en Vivo
                </span>
              )}
            </div>
            <div className="text-base font-bold text-white mt-0.5">
              {evaluation.summaryText}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs text-slate-400 block">Pozo en juego</span>
          <span className="font-teko text-3xl font-bold text-amber-400 leading-none">
            Bs. {currentWeek.totalPot.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 5 Contenders Quick Live Standings Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {userList.map((userId) => {
          const u = users[userId];
          const score = userScores[userId];
          const isLead = evaluation.winners.includes(userId);
          const isCurrent = userId === activeUserId;
          const totalLive = score.correctPicks + score.livePicksLeading;

          return (
            <div
              key={userId}
              className={`p-3.5 rounded-2xl border transition-all ${
                isLead
                  ? 'bg-gradient-to-b from-amber-500/15 to-slate-900 border-amber-400/50 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/85 border-slate-800'
              } ${isCurrent ? 'ring-1 ring-blue-500/70' : ''}`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base">{u.avatar}</span>
                  <span className="font-condensed font-bold text-sm text-white truncate">
                    {u.name}
                  </span>
                </div>
                {isLead && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                    {currentWeek.isFinished ? 'Ganador' : 'Puntero'}
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex items-baseline justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">
                    {currentWeek.isFinished ? 'Aciertos' : 'Aciertos'}
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-teko text-2xl sm:text-3xl font-bold text-white leading-none">
                      {currentWeek.weekType === 'playoff' || currentWeek.weekType === 'superbowl'
                        ? (score.playoffPoints || 0)
                        : score.correctPicks}
                    </span>
                    {score.livePicksLeading > 0 && currentWeek.weekType !== 'playoff' && currentWeek.weekType !== 'superbowl' && (
                      <span className="text-xs font-bold text-emerald-400">
                        (+{score.livePicksLeading})
                      </span>
                    )}
                  </div>
                </div>

                {!currentWeek.isFinished && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">En juego</span>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {totalLive} / {score.totalGames}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Matrix Table */}
      {currentWeek.games.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white uppercase tracking-wide">
              Matriz para {currentWeek.name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              No hay partidos cargados aún para esta semana. Sincroniza el calendario para comparar los pronósticos de los 5 amigos.
            </p>
          </div>
          {onSyncWeek && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => onSyncWeek(currentWeek.weekNumber)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-red-950/60 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Cargando Partidos...' : 'Cargar Partidos de la Semana'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              {/* Header: Match details on left, 5 participants on right */}
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-300">
                <tr>
                  <th className="p-4 min-w-[200px] font-condensed font-bold uppercase tracking-wider text-xs">
                    Encuentro NFL (Horario ET)
                  </th>
                  <th className="p-4 text-center min-w-[90px] font-condensed font-bold uppercase tracking-wider text-xs">
                    Marcador
                  </th>
                  {userList.map((userId) => {
                    const user = users[userId];
                    const isCurrent = userId === activeUserId;
                    const score = userScores[userId];

                    return (
                      <th
                        key={userId}
                        className={`p-3 text-center min-w-[120px] transition-colors border-l border-slate-800/80 ${
                          isCurrent ? 'bg-blue-950/50 text-white' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-inner mb-1"
                            style={{ backgroundColor: `${user.color}35`, border: `1px solid ${user.color}` }}
                          >
                            {user.avatar}
                          </div>
                          <span className="font-condensed font-extrabold text-sm uppercase text-white flex items-center gap-1">
                            {user.name}
                            {isCurrent && <span className="text-amber-400 text-[10px]">★</span>}
                          </span>

                          {/* Live hits score pill */}
                          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 text-[11px] font-bold border border-slate-700">
                            {currentWeek.weekType === 'playoff' || currentWeek.weekType === 'superbowl'
                              ? `${score.playoffPoints || 0} pts`
                              : `${score.correctPicks} aciertos${score.livePicksLeading > 0 ? ` (+${score.livePicksLeading} en juego)` : ''}`}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body: One row per game */}
              <tbody className="divide-y divide-slate-800/60">
                {currentWeek.games.map((game, idx) => {
                  const isFinal = game.status === 'final';
                  const isLive = game.status === 'in_progress';
                  const actualWinner =
                    game.winnerTeamId ||
                    (isFinal && game.homeScore !== undefined && game.awayScore !== undefined
                      ? game.homeScore > game.awayScore
                        ? game.homeTeam.id
                        : game.awayTeam.id
                      : isLive && game.homeScore !== undefined && game.awayScore !== undefined && game.homeScore !== game.awayScore
                      ? game.homeScore > game.awayScore
                        ? game.homeTeam.id
                        : game.awayTeam.id
                      : null);

                  const etTime = formatETTime(game.time, game.dateIso);
                  const etDate = formatETDate(game.date);

                  return (
                    <tr key={game.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Game Matchup Cell */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-xs text-slate-500">#{idx + 1}</span>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5 text-xs sm:text-sm">
                              <span className={actualWinner === game.awayTeam.id ? 'text-amber-400 font-black' : ''}>
                                {game.awayTeam.abbreviation}
                              </span>
                              <span className="text-slate-500 font-normal">@</span>
                              <span className={actualWinner === game.homeTeam.id ? 'text-amber-400 font-black' : ''}>
                                {game.homeTeam.abbreviation}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{etDate}</span>
                              <span>•</span>
                              <span className="text-amber-300 font-bold">{etTime}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score / Status Cell */}
                      <td className="p-4 text-center font-bold">
                        {isFinal ? (
                          <span className="px-2 py-1 rounded bg-slate-800 text-slate-200 text-xs border border-slate-700">
                            {game.awayScore} - {game.homeScore}
                          </span>
                        ) : isLive ? (
                          <span className="px-2 py-1 rounded bg-red-600/20 text-red-400 text-xs font-bold border border-red-500/40 animate-pulse">
                            {game.awayScore} - {game.homeScore}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-normal">
                            Por jugar
                          </span>
                        )}
                      </td>

                      {/* 5 User Picks Cells */}
                      {userList.map((userId) => {
                        const pick = currentWeek.userPicks[userId]?.[game.id];
                        const selectedTeam = pick ? NFL_TEAMS[pick.selectedTeamId] : null;
                        const isCurrent = userId === activeUserId;

                        const isHit = isFinal && pick && pick.selectedTeamId === actualWinner;
                        const isMiss = isFinal && pick && actualWinner && pick.selectedTeamId !== actualWinner;
                        const isLiveLeading = isLive && pick && actualWinner && pick.selectedTeamId === actualWinner;

                        return (
                          <td
                            key={userId}
                            className={`p-3 text-center border-l border-slate-800/80 ${
                              isCurrent ? 'bg-blue-950/30' : ''
                            }`}
                          >
                            {pick && selectedTeam ? (
                              <div className="flex flex-col items-center">
                                <div
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                                    isHit
                                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/40'
                                      : isMiss
                                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                      : isLiveLeading
                                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/50 animate-pulse'
                                      : 'bg-slate-800/90 border-slate-700 text-white'
                                  }`}
                                >
                                  <img
                                    src={selectedTeam.logoUrl}
                                    alt=""
                                    className="w-4 h-4 object-contain"
                                  />
                                  <span>{selectedTeam.abbreviation}</span>
                                  {isHit && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                  {isMiss && <X className="w-3.5 h-3.5 text-rose-400" />}
                                  {isLiveLeading && <Flame className="w-3.5 h-3.5 text-emerald-400" />}
                                </div>

                                {/* Playoff predicted score display */}
                                {pick.predictedHomeScore !== undefined && (
                                  <span className="text-[10px] text-amber-300/80 mt-1 font-mono">
                                    {pick.predictedAwayScore ?? '?'}-{pick.predictedHomeScore ?? '?'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 italic">
                                Sin pick
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Row */}
              <tfoot className="bg-slate-950/90 border-t-2 border-slate-700 font-bold">
                <tr>
                  <td colSpan={2} className="p-4 text-right font-condensed uppercase tracking-wider text-xs text-slate-400">
                    Total de Aciertos de la Semana:
                  </td>
                  {userList.map((userId) => {
                    const score = userScores[userId];
                    const isCurrent = userId === activeUserId;
                    const isLeading = evaluation.winners.includes(userId);

                    return (
                      <td
                        key={userId}
                        className={`p-4 text-center border-l border-slate-800/80 ${
                          isCurrent ? 'bg-blue-950/40' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <div className="flex items-baseline justify-center gap-1">
                            <span
                              className={`font-teko text-3xl font-extrabold leading-none ${
                                isLeading ? 'text-amber-400' : 'text-white'
                              }`}
                            >
                              {currentWeek.weekType === 'playoff' || currentWeek.weekType === 'superbowl'
                                ? (score.playoffPoints || 0)
                                : score.correctPicks}
                            </span>
                            {score.livePicksLeading > 0 && currentWeek.weekType !== 'playoff' && currentWeek.weekType !== 'superbowl' && (
                              <span className="text-emerald-400 font-bold text-xs font-sans">
                                (+{score.livePicksLeading})
                              </span>
                            )}
                          </div>
                          {!currentWeek.isFinished && score.livePicksLeading > 0 && (
                            <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                              {score.correctPicks + score.livePicksLeading} en vivo
                            </span>
                          )}
                          {isLeading && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30 mt-0.5">
                              {currentWeek.isFinished ? '¡Ganador!' : 'Puntero'}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
