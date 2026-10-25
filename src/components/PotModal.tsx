import React from 'react';
import { QuinielaData, WeekState } from '../types';
import {
  Coins,
  Trophy,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface PotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeek: WeekState;
  quinielaData: QuinielaData;
}

export const PotModal: React.FC<PotModalProps> = ({
  isOpen,
  onClose,
  currentWeek,
  quinielaData,
}) => {
  if (!isOpen) return null;

  const baseFee = quinielaData.baseStakePerUser; // $200
  const totalUsers = 5;
  const basePot = currentWeek.basePot; // $1,000
  const rolledOver = currentWeek.rolledOverPot; // e.g. $1,000
  const totalPot = currentWeek.totalPot; // $2,000

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-slate-900 via-[#0B192C] to-slate-950 border border-amber-500/40 shadow-2xl p-6 sm:p-8 text-white">
        {/* Accent corner glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg font-bold">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-condensed text-3xl font-extrabold uppercase tracking-wide text-white">
              Estado del Pozo y Reglas Oficiales
            </h2>
            <p className="text-xs text-slate-400">
              Estructura financiera y normativa de las Apuestas de los 5 Amigos
            </p>
          </div>
        </div>

        {/* Current Pot Status Highlight Card */}
        <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#122646] to-slate-900 border border-amber-400/50 shadow-xl">
          <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Pozo Activo de la {currentWeek.name}</span>
          </div>

          <div className="mt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div className="font-teko text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 leading-none">
              Bs. {totalPot.toLocaleString()}
            </div>
            <div className="text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              {rolledOver > 0 ? '🔥 Incluye acumulado de empate previo' : 'Pozo base regular'}
            </div>
          </div>

          {/* Breakdown table */}
          <div className="mt-4 pt-4 border-t border-amber-500/20 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-400">Cuota Individual</div>
              <div className="font-bold text-white text-sm mt-0.5">Bs. {baseFee}</div>
              <div className="text-[10px] text-slate-500">5 apostadores</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-400">Base de la Semana</div>
              <div className="font-bold text-white text-sm mt-0.5">Bs. {basePot.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500">Bs. {baseFee} × 5</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-amber-400 font-semibold">Pozo Acumulado</div>
              <div className="font-bold text-amber-300 text-sm mt-0.5">Bs. {rolledOver.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500">Rollover anterior</div>
            </div>
          </div>
        </div>

        {/* Official 3 Rules of Winner Payouts */}
        <div className="mt-6">
          <h3 className="font-condensed font-extrabold text-xl uppercase tracking-wider text-white mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Reglamento Oficial de Ganadores</span>
          </h3>

          <div className="space-y-3">
            {/* Rule 1: Single Winner */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 border border-emerald-500/30">
                1
              </div>
              <div className="text-xs">
                <div className="font-bold text-white text-sm">
                  1 Solo Ganador (o Único Apostador)
                </div>
                <p className="text-slate-300 mt-1">
                  Se lleva directamente el <strong>100% del pozo acumulado</strong> de la semana (Bs. {totalPot.toLocaleString()}). Suma <strong>+1 victoria</strong> en su contador de Semanas Ganadas. El pozo de la semana siguiente vuelve a la base de Bs. {basePot.toLocaleString()}.
                </p>
              </div>
            </div>

            {/* Rule 2: Two Winners */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 border border-blue-500/30">
                2
              </div>
              <div className="text-xs">
                <div className="font-bold text-white text-sm">
                  Empate de 2 Ganadores
                </div>
                <p className="text-slate-300 mt-1">
                  Se reparten el pozo en partes iguales (<strong>50% cada uno</strong>, es decir Bs. {Math.floor(totalPot / 2).toLocaleString()} c/u). <strong>Ambos jugadores suman +1 victoria</strong> a su contador de Semanas Ganadas en la tabla de posiciones.
                </p>
              </div>
            </div>

            {/* Rule 3: 3 or More Winners (The Rollover Rule!) */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-slate-900 border border-amber-500/40 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 border border-amber-500/40">
                3+
              </div>
              <div className="text-xs">
                <div className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                  <span>Empate Múltiple (3 o más Ganadores)</span>
                  <span className="px-2 py-0.2 rounded bg-amber-500/30 text-[10px] uppercase font-black">
                    ROLLOVER
                  </span>
                </div>
                <p className="text-slate-300 mt-1">
                  <strong>El pozo no se reparte</strong> y se <strong>ACUMULA</strong> íntegramente para la semana siguiente. Sin embargo, a <strong>todos los empatados sí se les anota su victoria (+1)</strong> en el panel de Semanas Ganadas para premiar su acierto.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Timing Rules */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Fechas y Cierres Estrictos</span>
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>
                <strong>Apertura de la Semana:</strong> Todos los martes a las 06:00 AM hora local.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>
                <strong>Cierre Estricto de Apuestas:</strong> Exactamente <strong>30 minutos antes</strong> de que inicie el primer partido de la semana.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span>
                <strong>Playoffs y Super Bowl LXI:</strong> Pronóstico por resultado exacto con margen reglamentario de <strong>±7 puntos</strong>.
              </span>
            </li>
          </ul>
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
