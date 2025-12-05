import { Router } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    let query = 'SELECT * FROM appointments';
    const params: any[] = [];

    if (req.user?.role === 'tecnico') {
      query += ' WHERE user_id = $1';
      params.push(req.user.id);
    }

    query += ' ORDER BY date ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero appuntamenti' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { type, clientName, address, date, notes, notifyBefore } = req.body;

    const result = await pool.query(
      `INSERT INTO appointments 
       (type, client_name, address, date, notes, notify_before, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [type, clientName, address, date, notes, notifyBefore, req.user?.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Errore nella creazione appuntamento' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { type, clientName, address, date, notes, notifyBefore } = req.body;

    const result = await pool.query(
      `UPDATE appointments SET
       type = COALESCE($1, type),
       client_name = COALESCE($2, client_name),
       address = COALESCE($3, address),
       date = COALESCE($4, date),
       notes = COALESCE($5, notes),
       notify_before = COALESCE($6, notify_before)
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [type, clientName, address, date, notes, notifyBefore, id, req.user?.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appuntamento non trovato' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Errore aggiornamento appuntamento' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM appointments WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user?.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appuntamento non trovato' });
    }

    res.json({ message: 'Appuntamento eliminato' });
  } catch (error) {
    res.status(500).json({ error: 'Errore eliminazione appuntamento' });
  }
});

export default router;
