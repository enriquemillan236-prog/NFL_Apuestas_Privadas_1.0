import React from 'react';
import { QuinielaData, WeekState } from '../types';
import { calculateCumulativeUserStats, CumulativeUserRecord } from '../utils/bettingRules';
import { Award, Trophy, TrendingUp, Flame, CheckCircle2 } from 'lucide-react';
import { NFL_TEAMS } from '../data/nflTeams';

interface CumulativeWinnersBarProps {
  quinielaData: QuinielaData;
  activeWeekId: number;
}

export const CumulativeWinnersBar: React.FC<CumulativeWinnersBarProps> = ({
  quinielaData,
  activeWeekId,
}) => {
  const stats: CumulativeUserRecord[] = calculateCumulativeUserStats(
    quinielaData.users,
    quinielaData.weeks,
    activeWeekId
  );

  const completedWeeksCount = (Object.values(quinielaData.weeks || {}) as WeekState[]).filter(
    (w) => w && (w.isFinished || (w.games?.length > 0 && w.games.every((g) => g.status === 'final')))
  ).length;

  return (
    <section
      id="cumulative-winners-bar"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6"
    >
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-slate-700/60 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
              <Trophy className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-wide text-white uppercase flex items-center gap-2">
                Conteo Acumulativo de Semanas Ganadas
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Temporada Oficial
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Historial arrastrado y acumulado para Enrique, Diego, Adrián, Alejandro y Andrés
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Semanas evaluadas: <strong>{completedWeeksCount}</strong></span>
            </div>
          </div>
        </div>

        {/* 5 Participants Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-5 relative z-10">
          {stats.map((user, index) => {
            const team = NFL_TEAMS[user.favoriteTeam];
            const isFirst = index === 0 && user.cumulativeWeeksWon > 0;
            const effPercentage =
              user.totalPicksMade > 0
                ? Math.round((user.totalPicksCorrect / user.totalPicksMade) * 100)
                : 0;

            return (
              <div
                key={user.userId}
                id={`cumulative-card-${user.userId}`}
                className={`relative rounded-xl p-4 transition-all duration-300 flex flex-col justify-between border ${
                  isFirst
                    ? 'bg-gradient-to-b from-amber-500/15 via-slate-800/90 to-slate-800/90 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-800/60 hover:bg-slate-800/90 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {/* Ranking Ribbon / Leader indicator */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className="text-xs font-mono font-bold text-slate-400">
                      #{index + 1}
                    </span>
                  </div>

                  {user.isCurrentlyLeading && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                      <Flame className="w-3 h-3 text-emerald-400" /> Líder en Vivo
                    </span>
                  )}
                  {isFirst && !user.isCurrentlyLeading && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Award className="w-3 h-3 text-amber-400" /> Líder General
                    </span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="relative">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-md border-2"
                      style={{
                        borderColor: user.color,
                        backgroundColor: `${user.color}22`,
                      }}
                    >
                      {user.avatar}
                    </div>
                    {team && (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="w-5 h-5 absolute -bottom-1 -right-1 rounded-full bg-slate-900 p-0.5 border border-slate-700 shadow"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm sm:text-base text-white truncate">
                      {user.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {team ? team.name : user.favoriteTeam}
                    </p>
                  </div>
                </div>

                {/* Big Metric: Cumulative Weeks Won */}
                <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700/50 mb-3 text-center">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 block mb-0.5">
                    Semanas Ganadas
                  </span>
                  <div className="flex items-center justify-center gap-1.5">
                    <Trophy
                      className={`w-5 h-5 ${
                        user.cumulativeWeeksWon > 0
                          ? 'text-amber-400 fill-amber-400/20'
                          : 'text-slate-600'
                      }`}
                    />
                    <span
                      className={`text-2xl font-black ${
                        user.cumulativeWeeksWon > 0 ? 'text-amber-300' : 'text-slate-500'
                      }`}
                    >
                      {user.cumulativeWeeksWon}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {user.cumulativeWeeksWon === 1 ? 'semana' : 'semanas'}
                    </span>
                  </div>

                  {/* List of specific weeks won */}
                  {user.wonWeeksList && user.wonWeeksList.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-center gap-1 mt-2">
                      {user.wonWeeksList.map((wNum) => (
                        <span
                          key={wNum}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        >
                          Semana {wNum}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Sin semanas ganadas aún
                    </span>
                  )}
                </div>

                {/* Secondary Accuracy Metrics */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs text-slate-400 pt-1 border-t border-slate-700/40">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-medium uppercase">
                      Aciertos
                    </span>
                    <span className="font-bold text-slate-200">
                      {user.totalPicksCorrect}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-medium uppercase">
                      Efectividad
                    </span>
                    <span className="font-bold text-slate-200">
                      {effPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
