import React, { useState } from 'react';
import { NFLGame, UserId, UserPick, WeekState, UserProfile } from '../types';
import { getBetLockStatus } from '../utils/bettingRules';
import { formatETDate, formatETTime } from '../utils/timeUtils';
import {
  Clock,
  Tv,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  RefreshCw,
  Radio,
  Calendar,
} from 'lucide-react';

interface MatchesDashboardProps {
  currentWeek: WeekState;
  allWeeks?: Record<number, WeekState>;
  activeUser: UserProfile | null;
  onGoToPicks: () => void;
  onQuickPick: (gameId: string, teamId: string) => void;
  onSelectWeek?: (weekId: number) => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
  onManualSync?: () => void;
}

export const MatchesDashboard: React.FC<MatchesDashboardProps> = ({
  currentWeek,
  allWeeks,
  activeUser,
  onGoToPicks,
  onQuickPick,
  onSelectWeek,
  isSyncing = false,
  lastSyncTime,
  onManualSync,
}) => {
  const [filter, setFilter] = useState<'all' | 'live' | 'final' | 'scheduled'>('all');
  const lockStatus = getBetLockStatus(currentWeek);

  const userPicks = activeUser ? currentWeek.userPicks[activeUser.id] || {} : {};
  const isUserSubmitted = Boolean(activeUser && currentWeek.submittedUsers?.[activeUser.id]);

  const filteredGames = currentWeek.games.filter((game) => {
    if (filter === 'live') return game.status === 'in_progress';
    if (filter === 'final') return game.status === 'final';
    if (filter === 'scheduled') return game.status === 'scheduled';
    return true;
  });

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

          {onManualSync && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onManualSync}
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

      {/* Header and Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-condensed text-3xl font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              <span>Partidos de la {currentWeek.name}</span>
              <span className="text-sm font-normal text-slate-400 font-sans">
                ({currentWeek.games.length} encuentros)
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
            <span>Horarios oficiales en Zona ET (Eastern Time), marcadores y líneas</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Datos Oficiales NFL.com</span>
            </span>
            {lastSyncTime && (
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                • Sincronizado: {lastSyncTime}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title="Sincronizar resultados en vivo con NFL.com"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/50 text-slate-300 hover:text-white text-xs font-semibold shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Actualizando...' : 'Actualizar en Vivo'}</span>
            </button>
          )}

          {/* Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'live', label: 'En Vivo' },
                { id: 'scheduled', label: 'Por Jugar' },
                { id: 'final', label: 'Finalizados' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === f.id
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Games */}
      {currentWeek.games.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white uppercase tracking-wide">
              Partidos para {currentWeek.name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              No hay partidos sincronizados en este momento para la {currentWeek.name}. Pulsa el botón para cargar el calendario oficial en Zona ET desde NFL.com.
            </p>
          </div>
          {onManualSync && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onManualSync}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-red-950/60 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Cargando Partidos...' : 'Cargar Partidos en Vivo'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGames.map((game) => {
            const userPick = userPicks[game.id];
            const hasPicked = !!userPick;
            const isFinal = game.status === 'final';
            const isLive = game.status === 'in_progress';
            const etTime = formatETTime(game.time, game.dateIso);
            const etDate = formatETDate(game.date);

            // Check if user hit the pick
            const isUserPickCorrect =
              isFinal &&
              userPick &&
              ((game.homeScore! > game.awayScore! && userPick.selectedTeamId === game.homeTeam.id) ||
                (game.awayScore! > game.homeScore! && userPick.selectedTeamId === game.awayTeam.id));

            const isUserPickWrong =
              isFinal &&
              userPick &&
              !isUserPickCorrect &&
              game.homeScore !== game.awayScore;

            return (
              <div
                key={game.id}
                className={`relative rounded-2xl p-5 border transition-all overflow-hidden ${
                  isLive
                    ? 'bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border-amber-500/50 shadow-lg shadow-amber-950/20'
                    : 'bg-gradient-to-b from-slate-900/90 to-slate-950/95 border-slate-800/90 hover:border-slate-700 shadow-md'
                }`}
              >
                {/* Top match metadata */}
                <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800/80 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase">{etDate}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <strong className="text-amber-300 font-bold">{etTime}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {game.tvNetwork && (
                      <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        <Tv className="w-3 h-3 text-slate-400" />
                        {game.tvNetwork}
                      </span>
                    )}

                    {/* Status Badge */}
                    {isLive ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 font-bold text-[10px] animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        EN VIVO ({game.quarter || '4Q'} {game.clock || '02:15'})
                      </span>
                    ) : isFinal ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700">
                        FINALIZADO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-bold text-[10px] border border-blue-500/30">
                        PROGRAMADO
                      </span>
                    )}
                  </div>
                </div>

              {/* Teams Matchup Row */}
              <div className="grid grid-cols-5 items-center gap-2 my-2">
                {/* Away Team (Left) */}
                <div className="col-span-2 flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl p-1.5 flex items-center justify-center shrink-0 border transition-all ${
                      userPick?.selectedTeamId === game.awayTeam.id
                        ? 'bg-blue-950 border-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-slate-800/80 border-slate-700/80'
                    }`}
                  >
                    <img
                      src={game.awayTeam.logoUrl}
                      alt={game.awayTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="font-condensed font-extrabold text-lg text-white leading-tight uppercase">
                      {game.awayTeam.city}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {game.awayTeam.name} ({game.awayTeam.record})
                    </div>
                  </div>
                </div>

                {/* Center Scores / VS */}
                <div className="col-span-1 text-center">
                  {game.status !== 'scheduled' ? (
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`font-teko text-3xl font-bold leading-none ${
                          game.awayScore! > game.homeScore! ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        {game.awayScore}
                      </span>
                      <span className="text-slate-500 text-sm font-bold">-</span>
                      <span
                        className={`font-teko text-3xl font-bold leading-none ${
                          game.homeScore! > game.awayScore! ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        {game.homeScore}
                      </span>
                    </div>
                  ) : (
                    <div className="font-condensed font-extrabold text-slate-500 text-lg">
                      VS
                    </div>
                  )}

                  {game.spread && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Línea: {game.spread}
                    </div>
                  )}
                </div>

                {/* Home Team (Right) */}
                <div className="col-span-2 flex items-center justify-end gap-3 text-right">
                  <div>
                    <div className="font-condensed font-extrabold text-lg text-white leading-tight uppercase">
                      {game.homeTeam.city}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {game.homeTeam.name} ({game.homeTeam.record})
                    </div>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-xl p-1.5 flex items-center justify-center shrink-0 border transition-all ${
                      userPick?.selectedTeamId === game.homeTeam.id
                        ? 'bg-blue-950 border-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-slate-800/80 border-slate-700/80'
                    }`}
                  >
                    <img
                      src={game.homeTeam.logoUrl}
                      alt={game.homeTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Stadium Location */}
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span className="truncate">{game.stadium}</span>
              </div>

              {/* User Pick Footer Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {activeUser ? (
                  hasPicked ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Tu apuesta:</span>
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-800 text-white font-bold text-xs border border-slate-700">
                          <img
                            src={
                              userPick.selectedTeamId === game.homeTeam.id
                                ? game.homeTeam.logoUrl
                                : game.awayTeam.logoUrl
                            }
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                          <span>
                            {userPick.selectedTeamId === game.homeTeam.id
                              ? game.homeTeam.name
                              : game.awayTeam.name}
                          </span>
                        </div>
                      </div>

                      {/* Result validation */}
                      {isUserPickCorrect && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>¡Acertado! +1</span>
                        </span>
                      )}
                      {isUserPickWrong && (
                        <span className="text-xs font-bold text-rose-400">
                          Fallado ✕
                        </span>
                      )}
                      {!isFinal && (
                        <span className="text-[11px] text-amber-400/90 font-medium">
                          {isUserSubmitted
                            ? '✓ Apuesta sellada (APOSTAR)'
                            : currentWeek.isLocked
                            ? 'Apuesta bloqueada'
                            : 'Apuesta guardada'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 text-xs text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Sin apuesta aún</span>
                      </div>

                      {!currentWeek.isLocked && !isUserSubmitted && game.status === 'scheduled' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onQuickPick(game.id, game.awayTeam.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 cursor-pointer"
                          >
                            {game.awayTeam.abbreviation}
                          </button>
                          <button
                            onClick={() => onQuickPick(game.id, game.homeTeam.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 cursor-pointer"
                          >
                            {game.homeTeam.abbreviation}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-semibold">
                          {isUserSubmitted
                            ? 'Apuestas selladas'
                            : game.status === 'final'
                            ? 'Partido finalizado'
                            : game.status === 'in_progress'
                            ? 'En juego'
                            : 'Apuestas cerradas'}
                        </span>
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-between w-full text-xs text-slate-400">
                    <span>Identifícate para ver tus selecciones</span>
                    <button
                      onClick={onGoToPicks}
                      className="text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      Ingresar →
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
