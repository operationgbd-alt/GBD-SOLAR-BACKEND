import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, name, email, role, companyId } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password e ruolo sono obbligatori' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username già esistente' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, password, name, email, role, company_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, username, name, email, role, company_id`,
      [username, hashedPassword, name || username, email || null, role, companyId || null]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, companyId: user.company_id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      success: true, 
      userId: String(user.id),
      user, 
      token 
    });
  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ success: false, error: 'Errore durante la registrazione' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username e password sono obbligatori' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenziali non valide' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, companyId: user.company_id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name || user.username,
          email: user.email,
          role: user.role,
          companyId: user.company_id
        }
      }
    });
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ success: false, error: 'Errore durante il login' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token non fornito' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    
    const result = await pool.query(
      'SELECT id, username, email, role, company_id FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(403).json({ error: 'Token non valido' });
  }
});

export default router;
