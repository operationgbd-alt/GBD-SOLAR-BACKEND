import { Router } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user?.id;
    
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token richiesto' });
    }
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        platform VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(
      `INSERT INTO push_tokens (user_id, token, platform) 
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET user_id = $1, platform = $3`,
      [userId, token, platform || 'unknown']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Errore registrazione push token:', error);
    res.status(500).json({ success: false, error: 'Errore registrazione token' });
  }
});

router.post('/unregister', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token richiesto' });
    }
    
    await pool.query('DELETE FROM push_tokens WHERE token = $1', [token]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Errore rimozione push token:', error);
    res.status(500).json({ success: false, error: 'Errore rimozione token' });
  }
});

router.post('/notify-report', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { interventionId, interventionNumber, clientName } = req.body;
    
    console.log('[PUSH] Notifica report inviata:', { interventionId, interventionNumber, clientName });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Errore invio notifica:', error);
    res.status(500).json({ success: false, error: 'Errore invio notifica' });
  }
});

export default router;
