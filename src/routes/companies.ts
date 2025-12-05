import { Router } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero ditte' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ditta non trovata' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero ditta' });
  }
});

router.post('/', authenticateToken, requireRole('master'), async (req: AuthRequest, res) => {
  try {
    const { name, address, phone, email, vatNumber } = req.body;

    const result = await pool.query(
      `INSERT INTO companies (name, address, phone, email, vat_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, address, phone, email, vatNumber]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Errore nella creazione ditta' });
  }
});

router.put('/:id', authenticateToken, requireRole('master', 'ditta'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, email, vatNumber } = req.body;

    const result = await pool.query(
      `UPDATE companies SET
       name = COALESCE($1, name),
       address = COALESCE($2, address),
       phone = COALESCE($3, phone),
       email = COALESCE($4, email),
       vat_number = COALESCE($5, vat_number),
       updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, address, phone, email, vatNumber, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ditta non trovata' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Errore aggiornamento ditta' });
  }
});

router.delete('/:id', authenticateToken, requireRole('master'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ditta non trovata' });
    }

    res.json({ message: 'Ditta eliminata' });
  } catch (error) {
    res.status(500).json({ error: 'Errore eliminazione ditta' });
  }
});

export default router;
