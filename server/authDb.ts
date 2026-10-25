import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type UserId = 'enrique' | 'diego' | 'adrian' | 'alejandro' | 'andres';

export interface StoredUser {
  id: UserId;
  name: string;
  email: string;
  hasPassword: boolean;
  passwordHash: string | null;
  salt: string | null;
  createdAt: string | null;
}

export interface RecoveryRequest {
  id: string;
  userId: UserId;
  userName: string;
  userEmail: string;
  timestamp: string;
  status: 'pending' | 'resolved';
  ip?: string;
}

export interface UserSession {
  token: string;
  userId: UserId;
  createdAt: string;
  expiresAt: string;
}

interface AuthDatabaseSchema {
  users: Record<UserId, StoredUser>;
  recoveryRequests: RecoveryRequest[];
  sessions: Record<string, UserSession>;
}

const DB_FILE = path.join(process.cwd(), 'server', 'auth_database.json');

const INITIAL_USERS: Record<UserId, StoredUser> = {
  enrique: {
    id: 'enrique',
    name: 'Enrique',
    email: 'enriquemillan236@gmail.com',
    hasPassword: false,
    passwordHash: null,
    salt: null,
    createdAt: null,
  },
  diego: {
    id: 'diego',
    name: 'Diego',
    email: 'dmillane369@gmail.com',
    hasPassword: false,
    passwordHash: null,
    salt: null,
    createdAt: null,
  },
  adrian: {
    id: 'adrian',
    name: 'Adrián',
    email: 'ayalamillanadrian@gmail.com',
    hasPassword: false,
    passwordHash: null,
    salt: null,
    createdAt: null,
  },
  alejandro: {
    id: 'alejandro',
    name: 'Alejandro',
    email: 'alejandroamillan@hotmail.com',
    hasPassword: false,
    passwordHash: null,
    salt: null,
    createdAt: null,
  },
  andres: {
    id: 'andres',
    name: 'Andrés',
    email: 'andresayalamillan@gmail.com',
    hasPassword: false,
    passwordHash: null,
    salt: null,
    createdAt: null,
  },
};

// In-memory cache
let dbCache: AuthDatabaseSchema | null = null;

function ensureDirExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadDatabase(): AuthDatabaseSchema {
  if (dbCache) return dbCache;

  ensureDirExists(DB_FILE);

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Merge with initial users to ensure all 5 participants exist
      const mergedUsers = { ...INITIAL_USERS };
      if (parsed.users) {
        for (const [key, user] of Object.entries(parsed.users)) {
          if (mergedUsers[key as UserId]) {
            mergedUsers[key as UserId] = {
              ...mergedUsers[key as UserId],
              ...(user as StoredUser),
            };
          }
        }
      }

      dbCache = {
        users: mergedUsers,
        recoveryRequests: parsed.recoveryRequests || [],
        sessions: parsed.sessions || {},
      };
      return dbCache;
    } catch (err) {
      console.error('Error reading auth database file, reinitializing:', err);
    }
  }

  // If file doesn't exist or is invalid, initialize with defaults
  dbCache = {
    users: { ...INITIAL_USERS },
    recoveryRequests: [],
    sessions: {},
  };
  saveDatabase(dbCache);
  return dbCache;
}

function saveDatabase(db: AuthDatabaseSchema): void {
  try {
    ensureDirExists(DB_FILE);
    // Write atomically via temporary file
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing auth database file:', err);
  }
}

// Password hashing using Node.js crypto (scrypt with 16-byte cryptographically secure salt)
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const candidateHash = hashPassword(password, salt);
    const hashBuffer = Buffer.from(hash, 'hex');
    const candidateBuffer = Buffer.from(candidateHash, 'hex');
    if (hashBuffer.length !== candidateBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
  } catch {
    return false;
  }
}

export const AuthDB = {
  /**
   * Get public status for all users (whether they have a password registered).
   * NEVER returns password hashes or salts.
   */
  getAllUsersStatus() {
    const db = loadDatabase();
    const result: Record<UserId, { id: UserId; name: string; email: string; hasPassword: boolean }> = {} as any;
    for (const [id, user] of Object.entries(db.users)) {
      result[id as UserId] = {
        id: user.id,
        name: user.name,
        email: user.email,
        hasPassword: Boolean(user.hasPassword),
      };
    }
    return result;
  },

  /**
   * Register a user's password for the FIRST and ONLY time.
   * STRICT RULE: If the user already has a password, reject with error.
   */
  registerPassword(userId: UserId, email: string, rawPassword: string) {
    const db = loadDatabase();
    const user = db.users[userId];

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    // STRICT CHECK: Cannot overwrite an existing password!
    if (user.hasPassword) {
      throw new Error('Este usuario ya tiene una contraseña registrada. Ingresa con tu contraseña existente.');
    }

    // Verify email
    if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new Error(`El email ingresado no coincide con el registrado para ${user.name}.`);
    }

    // Verify password minimum length
    if (!rawPassword || rawPassword.trim().length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }

    // Generate salt and secure hash
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(rawPassword.trim(), salt);

    user.hasPassword = true;
    user.passwordHash = hash;
    user.salt = salt;
    user.createdAt = new Date().toISOString();

    saveDatabase(db);

    const sessionToken = this.createSession(user.id);

    return {
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasPassword: true,
      },
    };
  },

  /**
   * Authenticate a user with their existing password.
   */
  login(userId: UserId, email: string, rawPassword: string) {
    const db = loadDatabase();
    const user = db.users[userId];

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    if (!user.hasPassword || !user.passwordHash || !user.salt) {
      throw new Error('Este usuario aún no tiene una contraseña registrada. Debes crear tu contraseña primero.');
    }

    if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new Error(`El correo no coincide con el registrado para ${user.name}.`);
    }

    const isValid = verifyPassword(rawPassword.trim(), user.passwordHash, user.salt);
    if (!isValid) {
      throw new Error('Contraseña incorrecta. Esta cuenta está protegida y ningún otro jugador puede acceder a ella.');
    }

    const sessionToken = this.createSession(user.id);

    return {
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasPassword: true,
      },
    };
  },

  /**
   * Request access recovery through the tournament administrator.
   */
  requestRecovery(userId: UserId, email: string, ip?: string) {
    const db = loadDatabase();
    const user = db.users[userId];

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    const request: RecoveryRequest = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
      status: 'pending',
      ip,
    };

    db.recoveryRequests.push(request);
    saveDatabase(db);

    return {
      success: true,
      request,
      message: `Solicitud de recuperación registrada para el Administrador de la Apuesta (Enrique Millán - enriquemillan236@gmail.com). Por seguridad no se puede crear una nueva contraseña directamente.`,
    };
  },

  /**
   * Admin-only reset (for tournament administrator Enrique Millán).
   */
  adminResetUser(targetUserId: UserId, adminSecret: string) {
    // Basic verification: admin secret check
    if (adminSecret !== 'ADMIN_RESET_ENRIQUE_2026') {
      throw new Error('No autorizado. Solo el Administrador de la Apuesta puede autorizar el restablecimiento.');
    }

    const db = loadDatabase();
    const user = db.users[targetUserId];
    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    user.hasPassword = false;
    user.passwordHash = null;
    user.salt = null;
    user.createdAt = null;

    saveDatabase(db);
    return {
      success: true,
      message: `El acceso para ${user.name} ha sido restablecido por el Administrador. Ahora puede crear su contraseña nuevamente.`,
    };
  },

  /**
   * Reset all users' passwords safely (keeps users and all tournament data).
   */
  resetAllUsersPasswords(adminSecret?: string) {
    if (adminSecret && adminSecret !== 'ADMIN_RESET_ENRIQUE_2026') {
      throw new Error('No autorizado. Clave de administrador incorrecta.');
    }

    const db = loadDatabase();
    for (const user of Object.values(db.users)) {
      user.hasPassword = false;
      user.passwordHash = null;
      user.salt = null;
      user.createdAt = null;
    }
    db.recoveryRequests = [];
    saveDatabase(db);

    return {
      success: true,
      message: 'Todas las contraseñas de los jugadores han sido restablecidas exitosamente. Cada jugador podrá crear su nueva contraseña una sola vez.',
      users: this.getAllUsersStatus(),
    };
  },

  /**
   * Create a session for a user.
   */
  createSession(userId: UserId): string {
    const db = loadDatabase();
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    if (!db.sessions) db.sessions = {};
    db.sessions[token] = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt,
    };
    saveDatabase(db);
    return token;
  },

  /**
   * Verify an existing session token.
   */
  verifySession(token: string) {
    if (!token) return null;
    const db = loadDatabase();
    const session = db.sessions?.[token];
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      delete db.sessions[token];
      saveDatabase(db);
      return null;
    }

    const user = db.users[session.userId];
    if (!user) return null;

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasPassword: Boolean(user.hasPassword),
      },
    };
  },

  /**
   * Revoke session on logout.
   */
  revokeSession(token: string) {
    if (!token) return;
    const db = loadDatabase();
    if (db.sessions && db.sessions[token]) {
      delete db.sessions[token];
      saveDatabase(db);
    }
  },
};
