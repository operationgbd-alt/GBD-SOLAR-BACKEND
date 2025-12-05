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
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero utenti' });
  }
});

router.get('/technicians', authenticateToken, async (req: AuthRequest, res) => {
  try {
    let query = `SELECT id, username, email, company_id, created_at FROM users WHERE role = 'tecnico'`;
    const params: any[] = [];

    if (req.user?.role === 'ditta') {
      query += ' AND company_id = $1';
      params.push(req.user.companyId);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero tecnici' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, username, email, role, company_id, created_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero utente' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { email, password } = req.body;

    if (req.user?.id !== parseInt(id) && req.user?.role !== 'master') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    let query = 'UPDATE users SET email = COALESCE($1, email)';
    const params: any[] = [email];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = $2';
      params.push(hashedPassword);
    }

    params.push(id);
    query += ` WHERE id = $${params.length} RETURNING id, username, email, role, company_id`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Errore aggiornamento utente' });
  }
});

router.delete('/:id', authenticateToken, requireRole('master'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    res.json({ message: 'Utente eliminato' });
  } catch (error) {
    res.status(500).json({ error: 'Errore eliminazione utente' });
  }
});

router.post('/:id/reset-password', authenticateToken, requireRole('master', 'ditta'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const userResult = await pool.query('SELECT id, role, company_id FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    const targetUser = userResult.rows[0];
    
    if (req.user?.role === 'ditta') {
      if (targetUser.company_id !== req.user.companyId) {
        return res.status(403).json({ error: 'Non autorizzato a resettare la password di questo utente' });
      }
      if (targetUser.role !== 'tecnico') {
        return res.status(403).json({ error: 'Puoi resettare solo le password dei tecnici' });
      }
    }
    
    const generatePassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let password = '';
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
    
    res.json({ 
      success: true, 
      message: 'Password resettata con successo',
      newPassword: newPassword
    });
  } catch (error) {
    console.error('Errore reset password:', error);
    res.status(500).json({ error: 'Errore nel reset della password' });
  }
});

export default router;
