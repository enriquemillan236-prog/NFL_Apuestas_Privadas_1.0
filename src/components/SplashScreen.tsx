import React, { useState, useEffect } from 'react';
import { ALL_TEAMS_LIST } from '../data/nflTeams';
import { ASSETS } from '../assets';
import { ArrowRight, Trophy, Shield, Flame, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

interface SplashScreenProps {
  onEnter: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);

  // Rotate through highlighted team shields dynamically
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTeamIndex((prev) => (prev + 1) % ALL_TEAMS_LIST.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  const featuredTeam = ALL_TEAMS_LIST[activeTeamIndex];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#060d18] text-white flex flex-col justify-between select-none">
      {/* Dynamic Background matching reference image */}
      <div className="absolute inset-0 z-0">
        <img
          src={ASSETS.stadiumBg}
          alt="NFL Stadium Night"
          className="w-full h-full object-cover object-center brightness-75 scale-105 transition-transform duration-1000 ease-out"
        />
        {/* Deep atmospheric sports gradient overlay: Navy #0B192C, Dark turf green #064E3B, Black shade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060d18] via-[#091528]/85 to-[#060d18]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060d18]/95 via-transparent to-[#060d18]/90" />
        
        {/* Stadium lighting spotlights effect */}
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top Bar / League branding */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={ASSETS.appLogo}
            alt="Logo NFL Apuestas"
            className="w-12 h-12 object-contain drop-shadow-xl"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-condensed font-extrabold text-xl tracking-wider text-white">APUESTAS PRIVADAS</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-600 text-white tracking-widest uppercase">
                OFICIAL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Liga Privada de 5 Jugadores</p>
          </div>
        </div>

        {/* Official League Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-300 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Semana 2 Activa • Pozo Bs. 250</span>
        </div>
      </header>

      {/* Hero Center Content */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 my-auto flex flex-col lg:flex-row items-center justify-between gap-10">
        {/* Left column: Title & Pitch */}
        <div className="flex-1 text-center lg:text-left">
          {/* Official Super Bowl LXI Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-semibold mb-5 backdrop-blur-md shadow-lg shadow-amber-950/20">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="tracking-wide">CAMINO AL SUPER BOWL LXI • SOFI STADIUM</span>
          </div>

          <h1 className="font-condensed text-5xl sm:text-6xl md:text-7xl font-extrabold uppercase tracking-tight text-white leading-none">
            Sistema Oficial de <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-red-600">
              Apuestas NFL
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-xl font-medium leading-relaxed">
            Plataforma exclusiva optimizada para los 5 contendientes:{' '}
            <span className="text-white font-bold">Enrique</span>,{' '}
            <span className="text-white font-bold">Diego</span>,{' '}
            <span className="text-white font-bold">Adrián</span>,{' '}
            <span className="text-white font-bold">Alejandro</span> y{' '}
            <span className="text-white font-bold">Andrés</span>.
          </p>

          {/* Key Rule Highlights */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">Cierre Estricto</div>
                <div className="text-[11px] text-slate-400">30 min antes de kickoff</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">Pozo Acumulado</div>
                <div className="text-[11px] text-slate-400">Rollover con 3+ empates</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">Playoffs & SB</div>
                <div className="text-[11px] text-slate-400">Margen de ±7 pts</div>
              </div>
            </div>
          </div>

          {/* The Big Red / Gold CTA Button */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button
              onClick={onEnter}
              className="w-full sm:w-auto px-9 py-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-condensed text-2xl font-bold tracking-wider uppercase shadow-2xl shadow-red-900/60 hover:shadow-red-600/40 border border-red-400/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 cursor-pointer"
            >
              <span>Entrar a las Apuestas</span>
              <ArrowRight className="w-6 h-6 animate-pulse" />
            </button>
            
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Semana 2 Activa • Pozo Bs. 250</span>
            </div>
          </div>
        </div>

        {/* Right column: Super Bowl LXI Emblem & Rotating NFL Team Showcase */}
        <div className="w-full lg:w-auto flex flex-col items-center gap-6">
          {/* Official Super Bowl LXI Display Card */}
          <div className="relative group w-72 sm:w-80 p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 via-[#0B192C]/90 to-slate-950/95 border border-amber-500/30 shadow-2xl shadow-blue-950/80 backdrop-blur-xl flex flex-col items-center text-center">
            <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black tracking-widest uppercase shadow">
              OFICIAL DE LA TEMPORADA
            </div>

            {/* Official Super Bowl LXI Emblem Graphic */}
            <div className="relative mt-2 w-40 h-40 rounded-xl overflow-hidden shadow-2xl border border-amber-400/20 bg-slate-950 p-2 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
              <img
                src={ASSETS.superBowlLxi}
                alt="Super Bowl LXI Emblem"
                className="w-full h-full object-contain rounded-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="mt-4">
              <div className="font-teko text-3xl font-bold tracking-wider text-amber-400 leading-none">
                SUPER BOWL LXI
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">SoFi Stadium • Los Ángeles, CA</p>
              <div className="mt-2 text-[11px] text-slate-400 px-3 py-1 rounded-md bg-slate-800/60 border border-slate-700/40">
                Regla especial: Apuesta por marcador exacto (Margen ±7 pts)
              </div>
            </div>

            {/* Active Featured Team Spotlight */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Franquicia en foco:</span>
              <div className="flex items-center gap-1.5 font-bold text-white">
                <img
                  src={featuredTeam.logoUrl}
                  alt={featuredTeam.name}
                  className="w-5 h-5 object-contain"
                />
                <span>{featuredTeam.city} {featuredTeam.name}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dynamic 32 NFL Teams Logo Ribbon / Showcase at Bottom */}
      <footer className="relative z-10 w-full bg-slate-950/80 border-t border-slate-800/80 backdrop-blur-xl py-3 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-2 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Las 32 Franquicias de la NFL
            </span>
          </div>
          <span className="hidden sm:inline text-[11px] text-slate-500">
            AFC • NFC • Selecciona tu ganador semana a semana
          </span>
        </div>

        {/* Animated Marquee of all 32 NFL Teams with official ESPN Logos */}
        <div className="flex gap-4 items-center overflow-x-auto no-scrollbar px-4 py-1">
          {ALL_TEAMS_LIST.map((team, idx) => (
            <div
              key={team.id}
              className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                idx === activeTeamIndex
                  ? 'bg-amber-500/20 border-amber-400/60 text-white scale-105'
                  : 'bg-slate-900/60 border-slate-800/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-5 h-5 object-contain"
                loading="lazy"
              />
              <span className="font-condensed font-bold text-xs uppercase tracking-wide">
                {team.abbreviation}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
};
