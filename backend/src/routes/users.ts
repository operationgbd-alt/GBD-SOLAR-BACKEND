import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole('master', 'ditta'), async (req: AuthRequest, res) => {
  try {
    let query = 'SELECT id, username, email, role, company_id, created_at FROM users';
    const params: any[] = [];

    if (req.user?.role === 'ditta') {
      query += ' WHERE company_id = $1';
      params.push(req.user.companyId);
    }

    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Errore nel recupero utenti' });
  }
});

router.post('/', authenticateToken, requireRole('master', 'ditta'), async (req: AuthRequest, res) => {
  try {
    const { username, password, email, role, companyId, name, phone } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username e password richiesti' });
    }
    
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username già in uso' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let assignedCompanyId = companyId;
    if (req.user?.role === 'ditta') {
      assignedCompanyId = req.user.companyId;
    }
    
    const userRole = req.user?.role === 'ditta' ? 'tecnico' : (role || 'tecnico');
    
    const result = await pool.query(
      `INSERT INTO users (username, password, email, role, company_id, name, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, role, company_id, name, phone, created_at`,
      [username, hashedPassword, email, userRole, assignedCompanyId || null, name || null, phone || null]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Errore creazione utente:', error);
    res.status(500).json({ success: false, error: 'Errore nella creazione utente' });
  }
});

router.get('/technicians', authenticateToken, async (req: AuthRequest, res) => {
  try {
    let query = `SELECT id, username, name, email, phone, company_id, created_at FROM users WHERE role = 'tecnico'`;
    const params: any[] = [];

    if (req.user?.role === 'ditta') {
      query += ' AND company_id = $1';
      params.push(req.user.companyId);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Errore nel recupero tecnici' });
  }
});

router.get('/technicians/locations', authenticateToken, async (req: AuthRequest, res) => {
  try {
    let query = `SELECT id, username, name, email, phone, company_id, latitude, longitude, last_location_update 
                 FROM users WHERE role = 'tecnico'`;
    const params: any[] = [];

    if (req.user?.role === 'ditta') {
      query += ' AND company_id = $1';
      params.push(req.user.companyId);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Errore nel recupero posizioni tecnici' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, username, name, email, phone, role, company_id, created_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Utente non trovato' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Errore nel recupero utente' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { email, password, name, phone } = req.body;

    if (req.user?.id !== parseInt(id) && req.user?.role !== 'master') {
      return res.status(403).json({ success: false, error: 'Non autorizzato' });
    }

    let query = 'UPDATE users SET email = COALESCE($1, email), name = COALESCE($2, name), phone = COALESCE($3, phone)';
    const params: any[] = [email, name, phone];
    let paramIndex = 4;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password = $${paramIndex}`;
      params.push(hashedPassword);
      paramIndex++;
    }

    params.push(id);
    query += ` WHERE id = $${paramIndex} RETURNING id, username, name, email, phone, role, company_id`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Utente non trovato' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Errore aggiornamento utente' });
  }
});

router.delete('/:id', authenticateToken, requireRole('master'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Utente non trovato' });
    }

    res.json({ success: true, message: 'Utente eliminato' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Errore eliminazione utente' });
  }
});

export default router;
