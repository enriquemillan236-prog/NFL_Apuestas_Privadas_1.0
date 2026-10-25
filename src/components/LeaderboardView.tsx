import React from 'react';
import { QuinielaData, UserId, UserProfile } from '../types';
import { NFL_TEAMS } from '../data/nflTeams';
import { calculateCumulativeUserStats } from '../utils/bettingRules';
import { CumulativeWinnersBar } from './CumulativeWinnersBar';
import { Trophy, Medal, Crown, TrendingUp, Sparkles, DollarSign, Award, Star } from 'lucide-react';

interface LeaderboardViewProps {
  users: Record<UserId, UserProfile>;
  activeUserId: UserId | null;
  quinielaData?: QuinielaData;
  activeWeekId?: number;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  users,
  activeUserId,
  quinielaData,
  activeWeekId,
}) => {
  // If quinielaData is provided, calculate cumulative real-time stats
  const cumulativeStats = quinielaData
    ? calculateCumulativeUserStats(
        quinielaData.users,
        quinielaData.weeks,
        activeWeekId ?? quinielaData.currentWeekId
      )
    : [];

  const cumulativeMap = new Map(cumulativeStats.map((s) => [s.userId, s]));

  // Enhance users with cumulative stats
  const enhancedUsers = (Object.values(users) as UserProfile[]).map((u) => {
    const stat = cumulativeMap.get(u.id);
    if (!stat) return u;
    return {
      ...u,
      weeksWon: Math.max(u.weeksWon, stat.cumulativeWeeksWon),
      totalPicksCorrect: Math.max(u.totalPicksCorrect, stat.totalPicksCorrect),
      totalPicksMade: Math.max(u.totalPicksMade, stat.totalPicksMade),
      earnings: Math.max(u.earnings, stat.earnings),
    };
  });

  // Sort users by:
  // 1. weeksWon (descending)
  // 2. totalPicksCorrect (descending)
  // 3. earnings (descending)
  const sortedUsers = enhancedUsers.sort((a, b) => {
    if (b.weeksWon !== a.weeksWon) return b.weeksWon - a.weeksWon;
    if (b.totalPicksCorrect !== a.totalPicksCorrect) return b.totalPicksCorrect - a.totalPicksCorrect;
    return b.earnings - a.earnings;
  });

  const top3 = sortedUsers.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Historical Cumulative Winners Bar Component */}
      {quinielaData && (
        <CumulativeWinnersBar
          quinielaData={quinielaData}
          activeWeekId={activeWeekId ?? quinielaData.currentWeekId}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-bold shadow-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <h2 className="font-condensed text-3xl font-extrabold uppercase tracking-wide text-white">
              Tabla General: Semanas Ganadas
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Clasificación acumulativa oficial para los 5 contendientes. El campeón se define por mayor
            número de semanas ganadas.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold self-start sm:self-auto">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>Métrica Reina: Semanas Ganadas</span>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        {/* 2nd Place (Silver) */}
        {top3[1] && (
          <div
            className={`order-2 sm:order-1 relative p-5 rounded-2xl border transition-all text-center flex flex-col justify-between ${
              activeUserId === top3[1].id
                ? 'bg-gradient-to-b from-slate-900 to-blue-950/60 border-slate-400 ring-2 ring-slate-400/40'
                : 'bg-gradient-to-b from-slate-900/90 to-slate-950 border-slate-800'
            }`}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-300 text-slate-900 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1 shadow">
              <Medal className="w-3.5 h-3.5" />
              <span>2° Lugar</span>
            </div>

            <div className="pt-2">
              <div
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/10"
                style={{ backgroundColor: `${top3[1].color}30` }}
              >
                {top3[1].avatar}
              </div>

              <h3 className="font-condensed font-extrabold text-2xl text-white mt-3 uppercase">
                {top3[1].name}
              </h3>
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                {NFL_TEAMS[top3[1].favoriteTeam] && (
                  <img
                    src={NFL_TEAMS[top3[1].favoriteTeam].logoUrl}
                    alt=""
                    className="w-4 h-4 object-contain"
                  />
                )}
                <span>{NFL_TEAMS[top3[1].favoriteTeam]?.name || 'Fan'}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="font-teko text-4xl font-extrabold text-white leading-none">
                {top3[1].weeksWon} <span className="text-sm font-sans text-slate-400">victorias</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {top3[1].totalPicksCorrect} aciertos • Bs. {top3[1].earnings.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* 1st Place (Gold - Taller & Prominent) */}
        {top3[0] && (
          <div
            className={`order-1 sm:order-2 relative p-6 rounded-2xl border transition-all text-center flex flex-col justify-between sm:-translate-y-2 ${
              activeUserId === top3[0].id
                ? 'bg-gradient-to-b from-[#162744] via-[#0E1F3B] to-slate-950 border-amber-400 ring-2 ring-amber-400/60 shadow-xl shadow-amber-950/40'
                : 'bg-gradient-to-b from-slate-900 via-[#10223D] to-slate-950 border-amber-500/50 shadow-lg'
            }`}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
              <Crown className="w-4 h-4 fill-slate-950" />
              <span>LÍDER ACTUAL</span>
            </div>

            <div className="pt-2">
              <div
                className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl shadow-2xl border-2 border-amber-400/80 ring-4 ring-amber-400/20"
                style={{ backgroundColor: `${top3[0].color}35` }}
              >
                {top3[0].avatar}
              </div>

              <h3 className="font-condensed font-extrabold text-3xl text-white mt-3 uppercase tracking-wide">
                {top3[0].name}
              </h3>
              <div className="text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5 mt-1">
                {NFL_TEAMS[top3[0].favoriteTeam] && (
                  <img
                    src={NFL_TEAMS[top3[0].favoriteTeam].logoUrl}
                    alt=""
                    className="w-4 h-4 object-contain"
                  />
                )}
                <span>{NFL_TEAMS[top3[0].favoriteTeam]?.city} {NFL_TEAMS[top3[0].favoriteTeam]?.name}</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-amber-500/30">
              <div className="font-teko text-5xl font-black text-amber-400 leading-none">
                {top3[0].weeksWon} <span className="text-base font-sans text-amber-200">victorias</span>
              </div>
              <div className="text-xs font-semibold text-emerald-400 mt-1">
                Bs. {top3[0].earnings.toLocaleString()} Ganados • {top3[0].totalPicksCorrect} aciertos
              </div>
            </div>
          </div>
        )}

        {/* 3rd Place (Bronze) */}
        {top3[2] && (
          <div
            className={`order-3 relative p-5 rounded-2xl border transition-all text-center flex flex-col justify-between ${
              activeUserId === top3[2].id
                ? 'bg-gradient-to-b from-slate-900 to-blue-950/60 border-amber-700 ring-2 ring-amber-700/40'
                : 'bg-gradient-to-b from-slate-900/90 to-slate-950 border-slate-800'
            }`}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-700 text-amber-100 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1 shadow">
              <Medal className="w-3.5 h-3.5" />
              <span>3° Lugar</span>
            </div>

            <div className="pt-2">
              <div
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/10"
                style={{ backgroundColor: `${top3[2].color}30` }}
              >
                {top3[2].avatar}
              </div>

              <h3 className="font-condensed font-extrabold text-2xl text-white mt-3 uppercase">
                {top3[2].name}
              </h3>
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                {NFL_TEAMS[top3[2].favoriteTeam] && (
                  <img
                    src={NFL_TEAMS[top3[2].favoriteTeam].logoUrl}
                    alt=""
                    className="w-4 h-4 object-contain"
                  />
                )}
                <span>{NFL_TEAMS[top3[2].favoriteTeam]?.name || 'Fan'}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="font-teko text-4xl font-extrabold text-white leading-none">
                {top3[2].weeksWon} <span className="text-sm font-sans text-slate-400">victorias</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {top3[2].totalPicksCorrect} aciertos • Bs. {top3[2].earnings.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Standings Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <span className="font-condensed font-bold text-base uppercase text-white tracking-wider">
            Detalle Completo de los 5 Jugadores
          </span>
          <span className="text-xs text-slate-400">Temporada 2026-2027</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950/50 text-slate-400 border-b border-slate-800 font-condensed tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center">Pos</th>
                <th className="px-4 py-3">Participante</th>
                <th className="px-4 py-3 text-center text-amber-400 font-extrabold">Semanas Ganadas</th>
                <th className="px-4 py-3 text-center">Total Aciertos</th>
                <th className="px-4 py-3 text-center">% Efectividad</th>
                <th className="px-4 py-3 text-right">Pozo Ganado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedUsers.map((user, idx) => {
                const isCurrentUser = user.id === activeUserId;
                const winRate =
                  user.totalPicksMade > 0
                    ? Math.round((user.totalPicksCorrect / user.totalPicksMade) * 100)
                    : 0;

                return (
                  <tr
                    key={user.id}
                    className={`transition-colors ${
                      isCurrentUser
                        ? 'bg-blue-950/40 font-semibold text-white'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3.5 text-center font-bold">
                      {idx === 0 && <span className="text-amber-400 text-base">🥇</span>}
                      {idx === 1 && <span className="text-slate-300 text-base">🥈</span>}
                      {idx === 2 && <span className="text-amber-700 text-base">🥉</span>}
                      {idx > 2 && <span className="text-slate-500">{idx + 1}</span>}
                    </td>

                    {/* Participant */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                          style={{ backgroundColor: `${user.color}35` }}
                        >
                          {user.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                                Tú
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            {NFL_TEAMS[user.favoriteTeam] && (
                              <img
                                src={NFL_TEAMS[user.favoriteTeam].logoUrl}
                                alt=""
                                className="w-3.5 h-3.5 object-contain"
                              />
                            )}
                            <span>{NFL_TEAMS[user.favoriteTeam]?.name || 'NFL'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Semanas Ganadas */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-sm shadow">
                        <Trophy className="w-3.5 h-3.5" />
                        {user.weeksWon}
                      </span>
                    </td>

                    {/* Total Aciertos */}
                    <td className="px-4 py-3.5 text-center font-bold text-white">
                      {user.totalPicksCorrect} / {user.totalPicksMade}
                    </td>

                    {/* Win Rate */}
                    <td className="px-4 py-3.5 text-center text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-bold text-slate-200">
                        {winRate}%
                      </span>
                    </td>

                    {/* Total Earnings */}
                    <td className="px-4 py-3.5 text-right font-extrabold text-emerald-400">
                      Bs. {user.earnings.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
