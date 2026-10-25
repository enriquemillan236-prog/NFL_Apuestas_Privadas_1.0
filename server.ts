import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { UserId } from './src/types';
import {
  ensureFirestoreInitialized,
  getFirestoreUsers,
  getFirestoreUser,
  registerFirestoreUserPassword,
  loginFirestoreUser,
  verifyFirestoreSession,
  revokeFirestoreSession,
  getFirestoreTournamentState,
  saveFirestorePick,
  submitFirestoreWeekBets,
  syncFirestoreGames,
  resetAllFirestorePasswords,
} from './server/firestoreDb';
import { generateLogoAssetsFromBuffer, checkForUploadedLogoFile } from './server/generateLogoAssets';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with 20mb limit for image payloads
  app.use(express.json({ limit: '20mb' }));

  // ==================== AUTH API ENDPOINTS ====================

  // Health check - fast immediate response for container health monitors
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'firestore', time: new Date().toISOString() });
  });

  // 1. Get all users status (whether they have a password registered in Cloud Firestore)
  app.get('/api/auth/status', async (req, res) => {
    try {
      const users = await getFirestoreUsers();
      const statusMap: Record<string, any> = {};
      for (const [id, user] of Object.entries(users)) {
        statusMap[id] = {
          id: user.id,
          name: user.name,
          email: user.email,
          hasPassword: Boolean(user.hasPassword),
        };
      }
      res.json({ success: true, users: statusMap });
    } catch (err: any) {
      console.error('Error fetching auth status from Firestore:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Register password for the FIRST and ONLY time in Cloud Firestore
  app.post('/api/auth/register-password', async (req, res) => {
    try {
      const { userId, email, password } = req.body;
      if (!userId || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos (userId, email, password).',
        });
      }

      const result = await registerFirestoreUserPassword(userId as UserId, email, password);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.warn('Registration rejected:', err.message);
      // If user already has password, return 409 Conflict with the exact required message
      if (err.alreadyRegistered || err.message.includes('ya tiene una contraseña registrada')) {
        return res.status(409).json({
          success: false,
          error: 'Este usuario ya tiene una contraseña registrada. Ingresa con tu contraseña existente.',
          alreadyRegistered: true,
        });
      }
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 3. Normal login with existing password against Cloud Firestore
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { userId, email, password } = req.body;
      if (!userId || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos (userId, email, password).',
        });
      }

      const result = await loginFirestoreUser(userId as UserId, email, password);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.warn('Login failed:', err.message);
      res.status(401).json({ success: false, error: err.message });
    }
  });

  // 4. Recovery request flow
  app.post('/api/auth/request-recovery', async (req, res) => {
    try {
      const { userId, email } = req.body;
      if (!userId || !email) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos (userId, email).',
        });
      }

      const user = await getFirestoreUser(userId as UserId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado en la liga.' });
      }

      console.log(`[PASSWORD RECOVERY REQUEST] User: ${userId}, Email: ${email}`);
      res.json({
        success: true,
        message: 'Solicitud de recuperación enviada al comisionado Enrique Millán.',
      });
    } catch (err: any) {
      console.warn('Recovery request failed:', err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 5. Admin reset all user passwords (for tournament administrator Enrique Millán)
  app.post('/api/auth/reset-all-passwords', async (req, res) => {
    try {
      const { adminSecret } = req.body;
      await resetAllFirestorePasswords(adminSecret);
      res.json({ success: true, message: 'Todas las contraseñas han sido reiniciadas correctamente en Firestore.' });
    } catch (err: any) {
      res.status(403).json({ success: false, error: err.message });
    }
  });

  // 6. Verify session token in Cloud Firestore
  app.get('/api/auth/session', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
                    (req.headers['x-session-token'] as string) ||
                    (req.query.token as string);

      if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided.' });
      }

      const user = await verifyFirestoreSession(token);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Sesión expirada o inválida.' });
      }

      res.json({ success: true, user, token });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Logout session in Cloud Firestore
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
                    (req.headers['x-session-token'] as string) ||
                    req.body?.token;

      if (token) {
        await revokeFirestoreSession(token);
      }
      res.json({ success: true, message: 'Sesión cerrada correctamente.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== TOURNAMENT & PICKS PERSISTENCE ENDPOINTS ====================

  // Get current canonical tournament state from Cloud Firestore
  app.get('/api/tournament/state', async (req, res) => {
    try {
      const state = await getFirestoreTournamentState();
      res.json({ success: true, data: state });
    } catch (err: any) {
      console.error('Error getting tournament state from Firestore:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Save individual pick to Cloud Firestore
  app.post('/api/picks/save', async (req, res) => {
    try {
      const { userId, weekId, gameId, teamId, homeScore, awayScore } = req.body;
      if (!userId || !weekId || !gameId || !teamId) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos (userId, weekId, gameId, teamId).',
        });
      }

      const result = await saveFirestorePick(
        userId as UserId,
        Number(weekId),
        String(gameId),
        String(teamId),
        homeScore,
        awayScore
      );
      res.json(result);
    } catch (err: any) {
      console.warn('Pick save rejected:', err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Confirm and seal bets for a week ("APOSTAR" button) in Cloud Firestore
  app.post('/api/picks/submit', async (req, res) => {
    try {
      const { userId, weekId } = req.body;
      if (!userId || !weekId) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos (userId, weekId).',
        });
      }

      const result = await submitFirestoreWeekBets(userId as UserId, Number(weekId));
      res.json(result);
    } catch (err: any) {
      console.warn('Week submission rejected:', err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Sync live NFL games and scores into Cloud Firestore
  app.post('/api/tournament/sync-games', async (req, res) => {
    try {
      const { weekId, games } = req.body;
      if (!weekId || !Array.isArray(games)) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos (weekId, games array).',
        });
      }

      await syncFirestoreGames(Number(weekId), games);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== LOGO ASSET GENERATION ENDPOINTS ====================

  // Upload original logo directly from UI (base64) and automatically generate all required assets
  app.post('/api/upload-logo', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'No image data provided.' });
      }

      // Strip data URL prefix if present (e.g. data:image/png;base64,...)
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const result = await generateLogoAssetsFromBuffer(buffer);
      res.json(result);
    } catch (err: any) {
      console.error('Error generating logo assets:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Check if a file was uploaded via file explorer and process it
  app.get('/api/check-logo-file', async (req, res) => {
    try {
      const result = await checkForUploadedLogoFile();
      if (result) {
        res.json({ success: true, processed: true, ...result });
      } else {
        res.json({ success: true, processed: false, message: 'No new logo file found in workspace.' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Initial check on server startup
  checkForUploadedLogoFile().catch((err) => {
    console.warn('Initial logo check error:', err);
  });

  // ==================== VITE & STATIC FILES ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Asynchronously pre-warm Firestore connection without blocking server boot
    ensureFirestoreInitialized()
      .then(() => console.log('✅ Remote Cloud Firestore initialized and ready'))
      .catch((err) => console.error('Warning: Cloud Firestore initial check error:', err));
  });
}

startServer();
