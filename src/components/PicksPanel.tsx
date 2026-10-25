import React, { useState, useEffect } from 'react';
import { NFLGame, UserId, UserPick, UserProfile, WeekState } from '../types';
import { getBetLockStatus } from '../utils/bettingRules';
import { formatETDate, formatETTime } from '../utils/timeUtils';
import {
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  UserCheck,
  Zap,
  HelpCircle,
  Clock,
  Sparkles,
  Award,
  Send,
  ShieldCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Calendar,
} from 'lucide-react';

interface PicksPanelProps {
  currentWeek: WeekState;
  allWeeks?: Record<number, WeekState>;
  activeUser: UserProfile | null;
  onOpenAuth: () => void;
  onSavePick: (gameId: string, teamId: string, homeScore?: number, awayScore?: number, weekId?: number) => void;
  onConfirmBets: (weekId: number, userId: UserId) => void;
  onSelectWeek?: (weekId: number) => void;
  onSyncWeek?: (weekId: number) => void;
  isSyncing?: boolean;
}

export const PicksPanel: React.FC<PicksPanelProps> = ({
  currentWeek,
  allWeeks,
  activeUser,
  onOpenAuth,
  onSavePick,
  onConfirmBets,
  onSelectWeek,
  onSyncWeek,
  isSyncing = false,
}) => {
  const lockStatus = getBetLockStatus(currentWeek);
  const isGlobalWeekLocked = lockStatus.isLocked;
  const isUserSubmitted = Boolean(activeUser && currentWeek.submittedUsers?.[activeUser.id]);
  const submittedTimestamp = activeUser && currentWeek.submittedAt?.[activeUser.id];

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-fetch week schedule if games array is empty
  useEffect(() => {
    if (currentWeek && currentWeek.games.length === 0 && onSyncWeek && !isSyncing) {
      onSyncWeek(currentWeek.weekNumber);
    }
  }, [currentWeek?.weekNumber, currentWeek?.games?.length, onSyncWeek, isSyncing]);

  const isGameLocked = (game: NFLGame) => {
    return (
      isUserSubmitted ||
      isGlobalWeekLocked ||
      game.status === 'final' ||
      game.status === 'in_progress'
    );
  };

  const isPlayoffsOrSuperBowl =
    currentWeek.weekType === 'playoff' || currentWeek.weekType === 'superbowl';

  const userPicks = activeUser ? currentWeek.userPicks[activeUser.id] || {} : {};
  const totalGames = currentWeek.games.length;
  const picksCount = Object.keys(userPicks).length;
  const progressPercent = totalGames > 0 ? Math.round((picksCount / totalGames) * 100) : 0;
  const isAllPicked = picksCount >= totalGames && totalGames > 0;

  const triggerFeedback = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePickWinner = (game: NFLGame, teamId: string, teamName: string) => {
    if (!activeUser) {
      onOpenAuth();
      return;
    }
    if (isGameLocked(game)) return;

    const currentPick = userPicks[game.id];
    onSavePick(
      game.id,
      teamId,
      currentPick?.predictedHomeScore,
      currentPick?.predictedAwayScore,
      currentWeek.weekNumber
    );
    triggerFeedback(`✓ Seleccionado: ${teamName}`);
  };

  const handleScoreChange = (
    game: NFLGame,
    teamId: string,
    homeScore: number | undefined,
    awayScore: number | undefined
  ) => {
    if (!activeUser || isGameLocked(game)) return;
    onSavePick(game.id, teamId, homeScore, awayScore, currentWeek.weekNumber);
  };

  const handleApostarClick = () => {
    if (!activeUser) {
      onOpenAuth();
      return;
    }
    if (isUserSubmitted) return;
    if (picksCount === 0) {
      triggerFeedback('⚠️ Debes seleccionar al menos un ganador antes de apostar.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    if (!activeUser) return;
    onConfirmBets(currentWeek.weekNumber, activeUser.id);
    setShowConfirmModal(false);
    triggerFeedback(`🎉 ¡Tus apuestas para la ${currentWeek.name} han sido selladas exitosamente!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl shadow-emerald-950 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Confirmation Modal for APOSTAR */}
      {showConfirmModal && activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-900 via-[#0B192C] to-slate-950 border border-amber-500/50 shadow-2xl p-6 text-white">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg font-bold">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-condensed text-2xl font-bold uppercase tracking-wide text-white">
                  Subir y Sellar Apuestas
                </h3>
                <p className="text-xs text-slate-400">
                  {currentWeek.name} • Jugador: <span className="text-white font-semibold">{activeUser.name}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span>Pronósticos seleccionados:</span>
                <span className="font-bold text-amber-400 text-sm">
                  {picksCount} de {totalGames} partidos
                </span>
              </div>

              {!isAllPicked && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Aviso: Te faltan {totalGames - picksCount} partidos por seleccionar. Si decides apostar ahora, la semana quedará bloqueada y ya no podrás agregar los pronósticos restantes.
                  </span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-rose-950/60 border-2 border-rose-500/60 text-rose-100">
                <p className="font-black text-sm text-rose-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>BLOQUEO DEFINITIVO DE LA SEMANA:</span>
                </p>
                <p className="leading-relaxed">
                  Al presionar <strong>"APOSTAR"</strong>, tus selecciones se subirán al sistema y quedarán <strong>selladas permanentemente</strong>. Esta semana quedará <strong>TOTALMENTE BLOQUEADA</strong> para ti y ya no podrás modificar ninguna apuesta de ninguna forma.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Volver a revisar
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-condensed text-lg font-bold uppercase tracking-wider shadow-xl shadow-red-950/60 border border-red-400/40 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>APOSTAR Y BLOQUEAR SEMANA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Week Navigation Bar for Switching to Future Weeks */}
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

        {/* Center: Week Selector & Quick Pills */}
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
              title="Actualizar partidos oficiales de esta semana con NFL.com"
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

      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0B192C] to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-condensed text-3xl font-extrabold uppercase tracking-wide text-white">
              Panel de Apuestas
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase">
              {currentWeek.name}
            </span>
            {isUserSubmitted && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apuestas Selladas</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {isPlayoffsOrSuperBowl
              ? 'Fase de Eliminatorias / Super Bowl: Apuestas con marcador exacto y margen reglamentario de ±7 puntos.'
              : 'Selecciona al equipo ganador para cada encuentro. Cuando termines, pulsa el botón APOSTAR para registrar tus elecciones de forma definitiva.'}
          </p>
        </div>

        {/* User Status / APOSTAR CTA */}
        <div className="flex flex-wrap items-center gap-3">
          {activeUser ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="text-left sm:text-right">
                <div className="text-xs text-slate-400">
                  Apostando como: <span className="font-bold text-white">{activeUser.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-28 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-amber-400">
                    {picksCount}/{totalGames}
                  </span>
                </div>
              </div>

              {/* Top APOSTAR Button */}
              {isUserSubmitted ? (
                <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-condensed text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 shadow">
                  <Lock className="w-4 h-4" />
                  <span>Apuestas Registradas</span>
                </div>
              ) : (
                <button
                  onClick={handleApostarClick}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-condensed text-base font-bold tracking-wider uppercase shadow-xl shadow-red-950/60 border border-red-400/40 transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Send className="w-4 h-4" />
                  <span>Apostar ({picksCount}/{totalGames})</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <UserCheck className="w-4 h-4" />
              <span>Ingresar con Email para Apostar</span>
            </button>
          )}
        </div>
      </div>

      {/* Lock Notice or Sealed Notice */}
      {isUserSubmitted ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-950 border border-emerald-500/50 flex items-center justify-between gap-4 text-emerald-200 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                ✓ Tus apuestas de la {currentWeek.name} están selladas y registradas
              </span>
              <span className="text-slate-300">
                Pulsaste el botón "APOSTAR". Por reglamento, ya no puedes modificar tus selecciones para esta semana.
                {submittedTimestamp && (
                  <span className="ml-1 text-slate-400">
                    (Registrado: {new Date(submittedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold shrink-0">
            SEMANA BLOQUEADA PARA TI
          </div>
        </div>
      ) : isGlobalWeekLocked ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/40 flex items-center gap-3 text-rose-200 text-xs">
          <Lock className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <span className="font-bold uppercase">Semana Bloqueada:</span> El tiempo límite para
            modificar pronósticos (30 minutos antes del kickoff) ha expirado. Tus selecciones son
            definitivas e inmutables.
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Paso final:</strong> Cuando completes tus predicciones, haz clic en el botón rojo <strong>"APOSTAR"</strong> para sellarlas oficialmente.
            </span>
          </div>
          <span className="font-bold text-amber-400 shrink-0">
            {lockStatus.formattedCountdown}
          </span>
        </div>
      )}

      {/* Playoff Margin Rules Banner */}
      {isPlayoffsOrSuperBowl && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-300 text-sm">
              Regla de Margen ±7 Puntos (Playoffs & Super Bowl)
            </div>
            <p className="mt-0.5 text-slate-300">
              Para estos encuentros de alta tensión, ingresa los puntos estimados para cada equipo. Si
              el marcador real queda dentro del margen de <strong>±7 puntos</strong> de tu predicción,
              recibes puntuación de precisión clasificatoria.
            </p>
          </div>
        </div>
      )}

      {/* Picks Matchups Cards */}
      {currentWeek.games.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white uppercase tracking-wide">
              {currentWeek.name} lista para pronósticos
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              Haz clic abajo para sincronizar el calendario oficial de partidos y horarios en horario ET desde la API de la NFL.
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
        <div className="space-y-4">
          {currentWeek.games.map((game, idx) => {
            const userPick = userPicks[game.id];
            const isAwaySelected = userPick?.selectedTeamId === game.awayTeam.id;
            const isHomeSelected = userPick?.selectedTeamId === game.homeTeam.id;
            const gameLocked = isGameLocked(game);
            const etTime = formatETTime(game.time, game.dateIso);
            const etDate = formatETDate(game.date);

            return (
              <div
                key={game.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isAwaySelected || isHomeSelected
                    ? 'bg-gradient-to-r from-slate-900 via-[#0D1D35] to-slate-900 border-slate-700/80 shadow-md'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Match header */}
                <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800/80 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400">Partido #{idx + 1}</span>
                    <span>•</span>
                    <span className="text-slate-200 font-medium">{etDate} a las <strong className="text-amber-300 font-bold">{etTime}</strong></span>
                    {game.tvNetwork && <span className="hidden sm:inline">({game.tvNetwork})</span>}
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    {game.spread && <span className="text-slate-400">Línea: {game.spread}</span>}
                    {game.status === 'final' && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        Marcador: {game.awayScore} - {game.homeScore}
                      </span>
                    )}
                    {game.status === 'in_progress' && (
                      <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 font-bold animate-pulse">
                        En Vivo: {game.awayScore} - {game.homeScore}
                      </span>
                    )}
                  </div>
                </div>

              {/* Selection Team Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Away Team Pick Button */}
                <button
                  type="button"
                  disabled={gameLocked || !activeUser}
                  onClick={() => handlePickWinner(game, game.awayTeam.id, `${game.awayTeam.city} ${game.awayTeam.name}`)}
                  className={`group relative p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isAwaySelected
                      ? isUserSubmitted
                        ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg'
                        : 'bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-blue-950/60'
                      : isUserSubmitted
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-40 cursor-not-allowed'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-800/60'
                  } ${gameLocked ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-14 h-14 rounded-xl p-2 bg-slate-950/80 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                      style={{ borderColor: isAwaySelected ? (isUserSubmitted ? '#10B981' : '#F59E0B') : undefined }}
                    >
                      <img
                        src={game.awayTeam.logoUrl}
                        alt={game.awayTeam.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Visitante
                      </div>
                      <div className="font-condensed font-extrabold text-xl text-white uppercase leading-tight">
                        {game.awayTeam.city} {game.awayTeam.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Récord: {game.awayTeam.record}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    {isAwaySelected ? (
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs shadow ${
                          isUserSubmitted
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-400 text-slate-950'
                        }`}
                      >
                        {isUserSubmitted ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>{isUserSubmitted ? 'SELLADO' : 'ELEGIDO'}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 group-hover:text-slate-300">
                        {isUserSubmitted ? 'No elegido' : gameLocked ? 'Bloqueado' : 'Seleccionar'}
                      </span>
                    )}
                  </div>
                </button>

                {/* Home Team Pick Button */}
                <button
                  type="button"
                  disabled={gameLocked || !activeUser}
                  onClick={() => handlePickWinner(game, game.homeTeam.id, `${game.homeTeam.city} ${game.homeTeam.name}`)}
                  className={`group relative p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isHomeSelected
                      ? isUserSubmitted
                        ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg'
                        : 'bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-blue-950/60'
                      : isUserSubmitted
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-40 cursor-not-allowed'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-800/60'
                  } ${gameLocked ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-14 h-14 rounded-xl p-2 bg-slate-950/80 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                      style={{ borderColor: isHomeSelected ? (isUserSubmitted ? '#10B981' : '#F59E0B') : undefined }}
                    >
                      <img
                        src={game.homeTeam.logoUrl}
                        alt={game.homeTeam.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Local
                      </div>
                      <div className="font-condensed font-extrabold text-xl text-white uppercase leading-tight">
                        {game.homeTeam.city} {game.homeTeam.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Récord: {game.homeTeam.record}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    {isHomeSelected ? (
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs shadow ${
                          isUserSubmitted
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-400 text-slate-950'
                        }`}
                      >
                        {isUserSubmitted ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>{isUserSubmitted ? 'SELLADO' : 'ELEGIDO'}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 group-hover:text-slate-300">
                        {isUserSubmitted ? 'No elegido' : gameLocked ? 'Bloqueado' : 'Seleccionar'}
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Exact Score inputs for Playoffs & Super Bowl (+- 7 pts margin) */}
              {isPlayoffsOrSuperBowl && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 p-3 rounded-xl bg-slate-950/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-amber-400">Pronóstico de Marcador Exacto:</span>
                      <span className="text-slate-400 block sm:inline sm:ml-2">
                        Evaluación con margen de ±7 puntos
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Away score */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300">
                          {game.awayTeam.abbreviation}:
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          disabled={gameLocked || !activeUser}
                          value={userPick?.predictedAwayScore ?? ''}
                          onChange={(e) =>
                            handleScoreChange(
                              game,
                              userPick?.selectedTeamId || game.awayTeam.id,
                              userPick?.predictedHomeScore,
                              e.target.value === '' ? undefined : Number(e.target.value)
                            )
                          }
                          placeholder="pts"
                          className="w-16 px-2.5 py-1 text-center rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <span className="text-slate-500 font-bold">-</span>

                      {/* Home score */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300">
                          {game.homeTeam.abbreviation}:
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          disabled={gameLocked || !activeUser}
                          value={userPick?.predictedHomeScore ?? ''}
                          onChange={(e) =>
                            handleScoreChange(
                              game,
                              userPick?.selectedTeamId || game.homeTeam.id,
                              e.target.value === '' ? undefined : Number(e.target.value),
                              userPick?.predictedAwayScore
                            )
                          }
                          placeholder="pts"
                          className="w-16 px-2.5 py-1 text-center rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Bottom APOSTAR Action Bar */}
      {activeUser && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0B192C] to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-bold text-white text-base">
              {isUserSubmitted
                ? `Semana Bloqueada para ${activeUser.name}`
                : `¿Listo para subir tus apuestas de la ${currentWeek.name}?`}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {isUserSubmitted
                ? 'Tus apuestas fueron subidas con el botón APOSTAR y han quedado selladas de forma definitiva.'
                : `Has seleccionado ${picksCount} de ${totalGames} partidos posibles. Al apostar, la semana quedará bloqueada.`}
            </div>
          </div>

          <div>
            {isUserSubmitted ? (
              <div className="px-6 py-3 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 font-condensed text-lg font-bold uppercase tracking-wider flex items-center gap-2 shadow">
                <Lock className="w-5 h-5 text-emerald-400" />
                <span>Semana Bloqueada • Apuestas Selladas</span>
              </div>
            ) : (
              <button
                onClick={handleApostarClick}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-condensed text-xl font-bold tracking-wider uppercase shadow-2xl shadow-red-950/70 border border-red-400/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 ${
                  isAllPicked ? 'animate-pulse ring-2 ring-amber-400/60' : ''
                }`}
              >
                <Zap className="w-5 h-5 text-amber-300" />
                <span>APOSTAR ({picksCount}/{totalGames})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
