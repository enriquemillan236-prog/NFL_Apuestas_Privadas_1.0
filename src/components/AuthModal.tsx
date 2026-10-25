import React, { useState, useEffect } from 'react';
import { UserId, UserProfile } from '../types';
import { NFL_TEAMS } from '../data/nflTeams';
import { ASSETS } from '../assets';
import { authService } from '../services/authService';
import {
  Lock,
  ShieldCheck,
  Check,
  Sparkles,
  AlertCircle,
  Mail,
  Eye,
  EyeOff,
  LogOut,
  Info,
  HelpCircle,
  Send,
  Loader2,
  ArrowLeft
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: Record<UserId, UserProfile>;
  activeUserId: UserId | null;
  onSelectUser: (userId: UserId, remember: boolean) => void;
  onSetPassword: (userId: UserId, password: string) => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  activeUserId,
  onSelectUser,
  onSetPassword,
  onLogout,
}) => {
  const [selectedId, setSelectedId] = useState<UserId>(activeUserId || 'enrique');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  const [recoverySent, setRecoverySent] = useState<boolean>(false);

  // Server authoritative status of registered passwords (permanent across reload and devices)
  const [serverAuthStatus, setServerAuthStatus] = useState<Record<UserId, boolean>>({
    enrique: false,
    diego: false,
    adrian: false,
    alejandro: false,
    andres: false,
  });

  const userList = Object.values(users) as UserProfile[];
  const selectedUser = users[selectedId];

  // Fetch server status on mount and when modal opens
  useEffect(() => {
    authService
      .getStatus()
      .then((statusMap) => {
        const mapped: Record<UserId, boolean> = {
          enrique: Boolean(statusMap.enrique?.hasPassword),
          diego: Boolean(statusMap.diego?.hasPassword),
          adrian: Boolean(statusMap.adrian?.hasPassword),
          alejandro: Boolean(statusMap.alejandro?.hasPassword),
          andres: Boolean(statusMap.andres?.hasPassword),
        };
        setServerAuthStatus(mapped);
      })
      .catch((err) => {
        console.warn('Could not sync auth status with server:', err);
      });
  }, [isOpen]);

  useEffect(() => {
    if (activeUserId) {
      setSelectedId(activeUserId);
      setEmailInput(users[activeUserId]?.email || '');
    } else if (selectedUser) {
      setEmailInput(selectedUser.email);
    }
  }, [activeUserId, isOpen]);

  if (!isOpen) return null;

  // Determine if selected user already has a password registered (Server authoritative)
  const userHasPassword = Boolean(serverAuthStatus[selectedId]);

  const handleSelectCard = (id: UserId) => {
    setSelectedId(id);
    setEmailInput(users[id].email);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setErrorMsg('');
    setSuccessMsg('');
    setIsRecoveryMode(false);
    setRecoverySent(false);
  };

  const handleEmailChange = (val: string) => {
    setEmailInput(val);
    setErrorMsg('');
    setSuccessMsg('');
    const trimmed = val.trim().toLowerCase();
    const matched = userList.find((u) => u.email.toLowerCase() === trimmed);
    if (matched) {
      setSelectedId(matched.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const targetUser = users[selectedId];
    if (!targetUser) {
      setErrorMsg('Por favor selecciona un participante válido.');
      return;
    }

    // Verify email matches the user
    if (emailInput.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
      setErrorMsg(`El email ingresado no coincide con el registrado para ${targetUser.name} (${targetUser.email}).`);
      return;
    }

    // MANDATORY CHECK: If user already has a password, reject creation attempt immediately
    if (userHasPassword) {
      // 1. Normal login flow
      if (!passwordInput || passwordInput.trim() === '') {
        setErrorMsg('Por favor ingresa tu contraseña.');
        return;
      }

      setIsLoading(true);
      try {
        // Authenticate against backend secure hash
        await authService.login(targetUser.id, targetUser.email, passwordInput.trim());

        onSelectUser(targetUser.id, rememberMe);
        setSuccessMsg(`¡Identificación correcta! Bienvenido, ${targetUser.name}.`);
        setTimeout(() => {
          onClose();
        }, 500);
      } catch (err: any) {
        setErrorMsg(err.message || 'Contraseña incorrecta. Esta cuenta está protegida.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // 2. Initial password creation flow (ONE TIME ONLY)
      // Double-check validation rule:
      if (serverAuthStatus[selectedId]) {
        setErrorMsg('Este usuario ya tiene una contraseña registrada. Ingresa con tu contraseña existente.');
        return;
      }

      if (!passwordInput || passwordInput.trim().length < 4) {
        setErrorMsg('La contraseña debe contener al menos 4 caracteres.');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
        return;
      }

      setIsLoading(true);
      try {
        // Register in the backend database (safely hashed, never plain text)
        await authService.registerPassword(targetUser.id, targetUser.email, passwordInput.trim());

        // Update local server status so it immediately locks
        setServerAuthStatus((prev) => ({ ...prev, [selectedId]: true }));
        onSetPassword(targetUser.id, passwordInput.trim());
        onSelectUser(targetUser.id, rememberMe);

        setSuccessMsg(
          `¡Contraseña creada y guardada con éxito para ${targetUser.name}! Tu cuenta ahora está protegida permanentemente.`
        );
        setTimeout(() => {
          onClose();
        }, 800);
      } catch (err: any) {
        // If the backend indicates it already exists, display exact required text
        if (err.message?.includes('ya tiene una contraseña registrada')) {
          setServerAuthStatus((prev) => ({ ...prev, [selectedId]: true }));
          setErrorMsg('Este usuario ya tiene una contraseña registrada. Ingresa con tu contraseña existente.');
        } else {
          setErrorMsg(err.message || 'Error al guardar la contraseña.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Dedicated recovery request flow
  const handleRequestRecovery = async () => {
    const targetUser = users[selectedId];
    if (!targetUser) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      await authService.requestRecovery(targetUser.id, targetUser.email);
      setRecoverySent(true);
      setSuccessMsg(
        `Solicitud enviada al Administrador de la Apuesta (Enrique Millán). Por seguridad, el administrador verificará tu identidad para restablecer tu acceso.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo enviar la solicitud de recuperación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[95vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-slate-900 via-[#0B192C] to-slate-950 border border-slate-700/80 shadow-2xl shadow-blue-950/80 p-6 sm:p-8 text-white">
        {/* Accent glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src={ASSETS.appLogo}
              alt="Logo NFL Apuestas"
              className="w-11 h-11 object-contain drop-shadow"
            />
            <div>
              <h2 className="font-condensed text-2xl font-extrabold uppercase tracking-wide text-white">
                Acceso de Jugadores
              </h2>
              <p className="text-xs text-slate-400">
                Sistema privado con autenticación segura e inviolable
              </p>
            </div>
          </div>
          {activeUserId && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-slate-800/80 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Informative Security Callout */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong>Regla de Seguridad:</strong> Cada jugador puede crear su contraseña una sola vez. Una vez registrada, nadie más puede acceder ni cambiar la contraseña sin autorización.
          </p>
        </div>

        {/* 5 Participants Selector Cards */}
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            1. Selecciona tu perfil de jugador
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {userList.map((user) => {
              const isSelected = selectedId === user.id;
              const hasPw = Boolean(serverAuthStatus[user.id]);

              return (
                <button
                  type="button"
                  key={user.id}
                  onClick={() => handleSelectCard(user.id)}
                  className={`relative flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-950/90 to-slate-900 border-amber-400/80 ring-2 ring-amber-400/40 shadow-lg shadow-amber-950/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0"
                      style={{ backgroundColor: `${user.color}30`, border: `1px solid ${user.color}` }}
                    >
                      <span>{user.avatar}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white flex items-center gap-1">
                        <span className="truncate">{user.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  {hasPw ? (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Protegido</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Crear clave</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected User Form or Recovery Flow */}
        {selectedUser && (
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            {isRecoveryMode ? (
              /* DEDICATED RECOVERY FLOW: Cannot create or replace password directly */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-condensed text-lg font-bold uppercase">
                    <HelpCircle className="w-5 h-5" />
                    <span>Recuperación de Acceso • {selectedUser.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoveryMode(false);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver al inicio</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/40 text-xs text-slate-300 space-y-2">
                  <p className="font-bold text-white text-sm">
                    🔒 Protección de Integridad de la Liga
                  </p>
                  <p>
                    Por seguridad e inviolabilidad de las apuestas, <strong>ningún usuario puede crear o reemplazar directamente una contraseña ya registrada</strong>.
                  </p>
                  <p>
                    Para restablecer tu acceso, debes enviar una solicitud al <strong>Administrador de la Apuesta (Enrique Millán)</strong>, quien verificará tu identidad antes de habilitar el restablecimiento.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="text-slate-400">Administrador de la Apuesta:</div>
                  <div className="font-bold text-white mt-0.5">Enrique Millán</div>
                  <div className="text-slate-400 text-[11px]">enriquemillan236@gmail.com</div>
                </div>

                {recoverySent ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>
                      Solicitud registrada exitosamente. Contacta al administrador para coordinar tu restablecimiento.
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestRecovery}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-condensed text-base font-bold uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Solicitar Restablecimiento al Administrador</span>
                  </button>
                )}
              </div>
            ) : (
              /* MAIN AUTH FORM */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    2. Credenciales de {selectedUser.name}
                  </label>
                  {userHasPassword && (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Cuenta ya registrada</span>
                    </span>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Correo Electrónico Oficial</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder={selectedUser.email}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <div>
                  {!userHasPassword ? (
                    /* Initial password creation (FIRST AND ONLY TIME) */
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-500/40 text-blue-200 text-xs flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-white mb-0.5">Creación de Contraseña Única</strong>
                          Solo puedes registrar tu contraseña una sola vez. Una vez guardada de forma segura, el sistema bloqueará cualquier intento de sobrescribirla o crear otra.
                        </div>
                      </div>

                      <label className="block text-xs text-slate-300 font-medium flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Nueva Contraseña Privada (mínimo 4 caracteres)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Crea una contraseña segura"
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <label className="block text-xs text-slate-300 font-medium flex items-center gap-1.5 pt-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Confirmar Contraseña</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Repite tu contraseña para confirmar"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  ) : (
                    /* Normal Login for password-protected account */
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Contraseña de {selectedUser.name}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setIsRecoveryMode(true);
                            setErrorMsg('');
                            setSuccessMsg('');
                          }}
                          className="text-[11px] text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>¿Olvidaste tu contraseña?</span>
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Ingresa tu contraseña para ingresar"
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Contraseña protegida por hash en el servidor. Solo tú puedes acceder.</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Messages */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Remember Me checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-rose-600 focus:ring-0"
                    />
                    <span>Recordar sesión en este dispositivo</span>
                  </label>
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-condensed text-lg font-bold tracking-wider uppercase shadow-xl shadow-red-950/60 border border-red-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : userHasPassword ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>
                      {isLoading
                        ? 'Verificando...'
                        : userHasPassword
                        ? `Ingresar como ${selectedUser.name}`
                        : 'Guardar Contraseña y Acceder'}
                    </span>
                  </button>

                  {/* Logout button if this user is active */}
                  {activeUserId && onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Cerrar Sesión</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
