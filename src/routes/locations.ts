import { Router } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

router.post('/update', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Non autenticato' });
    }

    if (userRole !== 'tecnico') {
      return res.status(403).json({ success: false, error: 'Solo i tecnici possono aggiornare la posizione' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Coordinate mancanti' });
    }

    await pool.query(`
      INSERT INTO technician_locations (user_id, latitude, longitude, accuracy, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        accuracy = EXCLUDED.accuracy,
        updated_at = NOW()
    `, [userId, latitude, longitude, accuracy || null]);

    res.json({ success: true, message: 'Posizione aggiornata' });
  } catch (error) {
    console.error('Errore aggiornamento posizione:', error);
    res.status(500).json({ success: false, error: 'Errore salvataggio posizione' });
  }
});

router.get('/technicians', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.role;
    const companyId = req.user?.companyId;

    let query = `
      SELECT 
        u.id,
        u.name,
        u.phone,
        u.company_id,
        c.name as company_name,
        tl.latitude,
        tl.longitude,
        tl.accuracy,
        tl.updated_at,
        CASE 
          WHEN tl.updated_at > NOW() - INTERVAL '5 minutes' THEN true
          ELSE false
        END as is_online
      FROM users u
      LEFT JOIN technician_locations tl ON u.id = tl.user_id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.role = 'tecnico'
    `;
    const params: any[] = [];

    if (userRole === 'ditta') {
      query += ' AND u.company_id = $1';
      params.push(companyId);
    }

    query += ' ORDER BY tl.updated_at DESC NULLS LAST';

    const result = await pool.query(query, params);

    const technicians = result.rows.map(row => ({
      id: String(row.id),
      name: row.name,
      phone: row.phone,
      companyId: row.company_id ? String(row.company_id) : null,
      companyName: row.company_name,
      lastLocation: row.latitude ? {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        accuracy: row.accuracy ? parseFloat(row.accuracy) : null,
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
      } : null,
      isOnline: row.is_online || false,
    }));

    res.json({ success: true, data: technicians });
  } catch (error) {
    console.error('Errore lista posizioni tecnici:', error);
    res.status(500).json({ success: false, error: 'Errore recupero posizioni' });
  }
});

router.delete('/clear', authenticateToken, requireRole('master'), async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM technician_locations WHERE updated_at < NOW() - INTERVAL $1', ['30 days']);
    res.json({ success: true, message: 'Posizioni vecchie eliminate' });
  } catch (error) {
    console.error('Errore pulizia posizioni:', error);
    res.status(500).json({ success: false, error: 'Errore pulizia' });
  }
});

export default router;
