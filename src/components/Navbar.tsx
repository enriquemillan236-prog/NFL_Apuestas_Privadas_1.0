import React from 'react';
import { UserId, UserProfile, WeekState } from '../types';
import { getBetLockStatus } from '../utils/bettingRules';
import { ASSETS } from '../assets';
import {
  Trophy,
  Lock,
  Unlock,
  Coins,
  Calendar,
  Layers,
  BarChart3,
  UserCheck,
  ChevronDown,
  Sparkles,
  LogOut,
} from 'lucide-react';

export type NavTab = 'matches' | 'picks' | 'leaderboard' | 'matrix' | 'pot';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeUser: UserProfile | null;
  onOpenAuth: () => void;
  currentWeek: WeekState;
  allWeeks: Record<number, WeekState>;
  onSelectWeek: (weekId: number) => void;
  onOpenPotModal: () => void;
  onOpenIntro: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeUser,
  onOpenAuth,
  currentWeek,
  allWeeks,
  onSelectWeek,
  onOpenPotModal,
  onOpenIntro,
  onLogout,
}) => {
  const lockStatus = getBetLockStatus(currentWeek);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'matches', label: 'Partidos', icon: <Calendar className="w-4 h-4" /> },
    { id: 'picks', label: 'Mis Apuestas', icon: <Layers className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Semanas Ganadas', icon: <Trophy className="w-4 h-4" /> },
    { id: 'matrix', label: 'Comparativa', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'pot', label: 'Reglas & Pozo', icon: <Coins className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#08101E]/95 backdrop-blur-xl border-b border-slate-800/80 shadow-xl shadow-black/40">
      {/* Top Banner / Ticker */}
      <div className="w-full bg-gradient-to-r from-[#0B192C] via-[#0D2447] to-[#0B192C] border-b border-white/5 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-rose-600 font-extrabold text-[10px] text-white tracking-widest uppercase">
              NFL 2026-27
            </span>
            <span className="text-slate-300 font-medium truncate text-[11px]">
              {currentWeek.name} • {currentWeek.weekType === 'superbowl' ? 'Super Bowl LXI en SoFi Stadium' : 'Temporada Regular'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Lock status banner */}
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${lockStatus.badgeColor}`}>
              {lockStatus.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{lockStatus.statusLabel}</span>
              <span className="hidden sm:inline font-normal">({lockStatus.formattedCountdown})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Super Bowl Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectTab('matches')}>
              <img
                src={ASSETS.appLogo}
                alt="Logo NFL Apuestas"
                className="w-10 h-10 object-contain drop-shadow-md"
              />
              <div className="hidden md:block">
                <div className="font-condensed font-extrabold text-lg text-white leading-tight flex items-center gap-1.5">
                  <span>APUESTAS PRO</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    LXI
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Enrique • Diego • Adrián • Alejandro • Andrés</div>
              </div>
            </div>

            {/* Super Bowl LXI mini emblem */}
            <div
              onClick={() => onSelectWeek(22)}
              title="Ir al Super Bowl LXI"
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 cursor-pointer transition-colors"
            >
              <img
                src={ASSETS.superBowlLxi}
                alt="Super Bowl LXI"
                className="w-6 h-6 object-contain rounded"
              />
              <span className="font-condensed font-bold text-xs text-amber-300">SB LXI</span>
            </div>
          </div>

          {/* Week Selector Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={currentWeek.weekNumber}
                onChange={(e) => onSelectWeek(Number(e.target.value))}
                className="appearance-none bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2 pr-8 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer transition-colors shadow-inner"
              >
                {(Object.values(allWeeks) as WeekState[]).map((w) => (
                  <option key={w.weekNumber} value={w.weekNumber} className="bg-slate-900 text-white">
                    {w.name} {w.isFinished ? '✓ (Finalizada)' : w.isLocked ? '🔒 (Bloqueada)' : '⚡ (Activa)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Pot Status Button / Pill */}
            <button
              onClick={onOpenPotModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 border border-amber-400/40 hover:border-amber-400 text-amber-300 text-xs sm:text-sm font-bold shadow-lg shadow-amber-950/20 transition-all cursor-pointer group"
            >
              <Coins className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <div className="text-left leading-tight">
                <span className="text-[10px] uppercase text-amber-200/80 block font-medium">Pozo</span>
                <span>Bs. {currentWeek.totalPot.toLocaleString()}</span>
              </div>
            </button>
          </div>

          {/* Active User Selector / Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {activeUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer text-left"
                  title="Cambiar usuario o gestionar contraseña"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-inner"
                    style={{ backgroundColor: `${activeUser.color}35`, border: `1px solid ${activeUser.color}` }}
                  >
                    {activeUser.avatar}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                      <span>{activeUser.name}</span>
                      <span className="text-[10px] text-amber-400 font-extrabold">★{activeUser.weeksWon}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Perfil seguro</div>
                  </div>
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    title={`Cerrar sesión de ${activeUser.name}`}
                    className="p-2 rounded-xl bg-slate-900/90 hover:bg-rose-950/60 border border-slate-700/80 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition-all cursor-pointer flex items-center gap-1 text-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden md:inline font-semibold">Salir</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Identificarse</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/60">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-condensed font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-950/40 border border-red-400/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
