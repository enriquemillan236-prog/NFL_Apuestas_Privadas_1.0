import React from 'react';
import { QuinielaData, WeekState } from '../types';
import { getBetLockStatus } from '../utils/bettingRules';
import { ASSETS } from '../assets';
import { Clock, Lock, Unlock, ShieldAlert, Award, ChevronRight, Zap } from 'lucide-react';

interface WeekHeroBannerProps {
  currentWeek: WeekState;
  quinielaData: QuinielaData;
  onGoToPicks: () => void;
  onOpenPotModal: () => void;
}

export const WeekHeroBanner: React.FC<WeekHeroBannerProps> = ({
  currentWeek,
  quinielaData,
  onGoToPicks,
  onOpenPotModal,
}) => {
  const lockStatus = getBetLockStatus(currentWeek);
  const activeUser = quinielaData.activeUserId ? quinielaData.users[quinielaData.activeUserId] : null;

  // Calculate picks completed by the active user
  const totalGames = currentWeek.games.length;
  const userPicksCount = activeUser
    ? Object.keys(currentWeek.userPicks[activeUser.id] || {}).length
    : 0;
  const isAllPicked = userPicksCount >= totalGames && totalGames > 0;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl shadow-blue-950/40 mb-8 bg-[#091528]">
      {/* Stadium Background Image (Matching user reference photo) */}
      <div className="absolute inset-0 z-0">
        <img
          src={ASSETS.stadiumBg}
          alt="NFL Stadium"
          className="w-full h-full object-cover object-center brightness-[0.55] contrast-125"
        />
        {/* Navy, turf green, and dark gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#060d18] via-[#091528]/85 to-[#060d18]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060d18] via-transparent to-transparent" />
      </div>

      {/* Banner Content */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="max-w-2xl">
          {/* Top chips */}
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="px-3 py-1 rounded-full bg-rose-600/90 text-white font-condensed font-bold text-xs uppercase tracking-wider shadow">
              {currentWeek.weekType === 'superbowl' ? 'EVENTO CUMBRE' : 'TEMPORADA REGULAR'}
            </span>

            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${lockStatus.badgeColor}`}>
              {lockStatus.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{lockStatus.statusLabel}: {lockStatus.formattedCountdown}</span>
            </div>

            {currentWeek.rolledOverPot > 0 && (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center gap-1 animate-pulse">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>¡POZO ACUMULADO POR EMPATE PREVIO!</span>
              </span>
            )}
          </div>

          <h1 className="font-condensed text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-white leading-none">
            {currentWeek.name}
            {currentWeek.weekType === 'superbowl' && (
              <span className="text-amber-400 block text-3xl sm:text-4xl mt-1">SOFI STADIUM • MARCADOR EXACTO (±7 PTS)</span>
            )}
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
            {currentWeek.isLocked
              ? 'Las apuestas se encuentran cerradas formalmente 30 minutos antes del kickoff. Monitorea los marcadores en vivo y la tabla comparativa.'
              : 'Apertura semanal los martes a las 06:00 AM. El cierre estricto ocurre 30 minutos antes del primer partido. ¡Haz tus elecciones a tiempo!'}
          </p>

          {/* Active User Pick Status Pill */}
          {activeUser && (
            <div className="mt-5 p-3.5 rounded-2xl bg-slate-900/85 border border-slate-700/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner"
                  style={{ backgroundColor: `${activeUser.color}35`, border: `1px solid ${activeUser.color}` }}
                >
                  {activeUser.avatar}
                </div>
                <div>
                  <div className="text-xs text-slate-400">Progreso de {activeUser.name}:</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>
                      {userPicksCount} de {totalGames} partidos pronosticados
                    </span>
                    {isAllPicked ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/40">
                        ¡Apuestas Completas!
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/40">
                        {totalGames - userPicksCount} pendientes
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!currentWeek.isLocked && (
                <button
                  onClick={onGoToPicks}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-condensed text-sm font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{isAllPicked ? 'Revisar Mis Apuestas' : 'Completar Apuestas'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Card: Pot Box & Rules Overview */}
        <div className="w-full lg:w-80 shrink-0">
          <div
            onClick={onOpenPotModal}
            className="group relative p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 via-[#0C1A30]/90 to-slate-950/95 border border-amber-500/40 shadow-xl backdrop-blur-xl cursor-pointer hover:border-amber-400 transition-all"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Pozo de la Semana
              </span>
              <span className="text-[11px] text-slate-400 group-hover:text-amber-300 transition-colors">
                Ver reglas →
              </span>
            </div>

            <div className="mt-3">
              <div className="font-teko text-5xl font-extrabold text-white leading-none tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
                Bs. {currentWeek.totalPot.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span>Base 5 jugadores: Bs. {currentWeek.basePot.toLocaleString()}</span>
                {currentWeek.rolledOverPot > 0 && (
                  <span className="text-amber-400 font-bold">+Bs. {currentWeek.rolledOverPot.toLocaleString()} Acumulado</span>
                )}
              </div>
            </div>

            {/* Quick rule preview */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">1 Ganador:</span>
                <span className="font-bold text-white">Gana el 100% (Bs. {currentWeek.totalPot.toLocaleString()})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">2 Ganadores:</span>
                <span className="font-bold text-white">50% c/u (Bs. {Math.floor(currentWeek.totalPot / 2).toLocaleString()})</span>
              </div>
              <div className="flex items-center justify-between text-amber-300">
                <span>3+ Empatados:</span>
                <span className="font-bold">¡Pozo se acumula!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
