import React from 'react';
import { ASSETS } from '../assets';
import { UserId, UserProfile, WeekState } from '../types';
import { calculateCumulativeUserStats } from '../utils/bettingRules';
import { Award, CheckCircle2, Shield, Sparkles, Trophy } from 'lucide-react';

interface FooterProps {
  users: Record<UserId, UserProfile>;
  weeks?: Record<number, WeekState>;
  currentWeekId?: number;
  onOpenIntro: () => void;
  onOpenPotModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  users,
  weeks = {},
  currentWeekId = 1,
  onOpenIntro,
  onOpenPotModal,
}) => {
  const cumulativeStats = calculateCumulativeUserStats(users, weeks, currentWeekId);
  const maxWins = Math.max(...cumulativeStats.map((s) => s.cumulativeWeeksWon), 0);

  return (
    <footer className="mt-16 w-full border-t border-slate-800 bg-[#060D18]/95 text-slate-400 py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Cumulative Weeks Won Historical Tracker Section */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-32 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-condensed font-black text-lg sm:text-xl text-white tracking-wide uppercase flex items-center gap-2">
                  <span>Historial Acumulado • Semanas Ganadas</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                    Temporada 2026-27
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conteo oficial acumulativo que se suma y arrastra semana a semana para Enrique, Diego, Adrián, Alejandro y Andrés.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Puntajes y semanas consolidadas automáticamente</span>
            </div>
          </div>

          {/* 5 Contenders Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {cumulativeStats.map((stat) => {
              const isHistoricalLeader = maxWins > 0 && stat.cumulativeWeeksWon === maxWins;
              const hasWon = stat.cumulativeWeeksWon > 0;

              return (
                <div
                  key={stat.userId}
                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                    isHistoricalLeader
                      ? 'bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 border-amber-400/50 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Top user header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{stat.avatar}</span>
                        <div className="min-w-0">
                          <div className="font-condensed font-extrabold text-base text-white truncate leading-tight">
                            {stat.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            NFL: <span className="text-slate-300 font-semibold">{stat.favoriteTeam}</span>
                          </div>
                        </div>
                      </div>

                      {isHistoricalLeader && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow">
                          Líder
                        </span>
                      )}
                    </div>

                    {/* Big Cumulative Wins Highlight */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                        Semanas Ganadas
                      </span>
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className={`font-teko text-3xl sm:text-4xl font-extrabold leading-none ${
                            hasWon ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          {stat.cumulativeWeeksWon}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {stat.cumulativeWeeksWon === 1 ? 'Victoria' : 'Victorias'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Stats & Weeks Breakdown */}
                  <div className="mt-3 pt-3 border-t border-slate-800/70 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Semanas ganadas:</span>
                      <span className="font-bold text-white">
                        {stat.wonWeeksList && stat.wonWeeksList.length > 0
                          ? stat.wonWeeksList.map((w) => `Sem. ${w}`).join(', ')
                          : hasWon
                          ? `${stat.cumulativeWeeksWon} victorias`
                          : 'En carrera'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Aciertos totales:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {stat.totalPicksCorrect} aciertos
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lower App Branding & Quick Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-2">
          {/* Left branding */}
          <div className="flex items-center gap-3">
            <img
              src={ASSETS.appLogo}
              alt="Logo NFL Apuestas"
              className="w-10 h-10 object-contain drop-shadow-md"
            />
            <div>
              <div className="font-condensed font-extrabold text-white text-base tracking-wider">
                APUESTAS PRIVADAS NFL • TEMPORADA 2026-27
              </div>
              <p className="text-xs text-slate-500">
                Quiniela oficial de amigos: Enrique, Diego, Adrián, Alejandro y Andrés
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={onOpenIntro}
              className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Splash Intro</span>
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={onOpenPotModal}
              className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Reglas & Pozo</span>
            </button>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Base de datos sincronizada</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
