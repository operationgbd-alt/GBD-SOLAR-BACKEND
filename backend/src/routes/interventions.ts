import { Router } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    let query = 'SELECT * FROM interventions';
    const params: any[] = [];

    if (req.user?.role === 'tecnico') {
      query += ' WHERE technician_id = $1';
      params.push(req.user.id);
    } else if (req.user?.role === 'ditta') {
      query += ' WHERE company_id = $1';
      params.push(req.user.companyId);
    }

    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    
    const interventions = result.rows.map(row => ({
      id: String(row.id),
      number: `INT-${new Date(row.created_at).getFullYear()}-${String(row.id).padStart(3, '0')}`,
      clientName: row.client_name,
      clientAddress: row.address,
      clientPhone: row.phone,
      clientEmail: row.email,
      category: row.type,
      priority: row.priority,
      description: row.description,
      status: row.status,
      technicianId: row.technician_id ? String(row.technician_id) : null,
      companyId: row.company_id ? String(row.company_id) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      scheduledDate: row.scheduled_date,
      notes: row.notes,
      latitude: row.latitude,
      longitude: row.longitude,
    }));
    
    res.json({ success: true, data: interventions });
  } catch (error) {
    console.error('Errore lista interventi:', error);
    res.status(500).json({ success: false, error: 'Errore nel recupero interventi' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM interventions WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }
    
    const row = result.rows[0];
    const intervention = {
      id: String(row.id),
      number: `INT-${new Date(row.created_at).getFullYear()}-${String(row.id).padStart(3, '0')}`,
      clientName: row.client_name,
      clientAddress: row.address,
      clientCivicNumber: row.civic_number,
      clientCity: row.city,
      clientPhone: row.phone,
      clientEmail: row.email,
      category: row.type,
      priority: row.priority,
      description: row.description,
      status: row.status,
      technicianId: row.technician_id ? String(row.technician_id) : null,
      companyId: row.company_id ? String(row.company_id) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      scheduledDate: row.scheduled_date,
      notes: row.notes,
      latitude: row.latitude,
      longitude: row.longitude,
    };
    
    res.json({ success: true, data: intervention });
  } catch (error) {
    console.error('Errore recupero intervento:', error);
    res.status(500).json({ success: false, error: 'Errore nel recupero intervento' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { 
      clientName, address, phone, email, type, priority, 
      description, technicianId, companyId, scheduledDate 
    } = req.body;

    console.log('[CREATE] Received intervention data:', { clientName, address, type, priority, technicianId, companyId });

    const result = await pool.query(
      `INSERT INTO interventions 
       (client_name, address, phone, email, type, priority, description, 
        technician_id, company_id, scheduled_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'assegnato', $11)
       RETURNING *`,
      [clientName, address, phone, email, type || 'installazione', priority || 'normale', 
       description, technicianId || null, companyId || null, scheduledDate || null, req.user?.id]
    );

    const row = result.rows[0];
    const intervention = {
      id: String(row.id),
      number: `INT-${new Date(row.created_at).getFullYear()}-${String(row.id).padStart(3, '0')}`,
      clientName: row.client_name,
      clientAddress: row.address,
      clientPhone: row.phone,
      clientEmail: row.email,
      category: row.type,
      priority: row.priority,
      description: row.description,
      status: row.status,
      technicianId: row.technician_id ? String(row.technician_id) : null,
      companyId: row.company_id ? String(row.company_id) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    console.log('[CREATE] Intervention created with ID:', intervention.id);
    res.status(201).json({ success: true, data: intervention });
  } catch (error) {
    console.error('Errore creazione intervento:', error);
    res.status(500).json({ success: false, error: 'Errore nella creazione intervento' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { 
      clientName, address, phone, email, type, priority, 
      description, technicianId, status, scheduledDate, notes 
    } = req.body;

    const result = await pool.query(
      `UPDATE interventions SET
       client_name = COALESCE($1, client_name),
       address = COALESCE($2, address),
       phone = COALESCE($3, phone),
       email = COALESCE($4, email),
       type = COALESCE($5, type),
       priority = COALESCE($6, priority),
       description = COALESCE($7, description),
       technician_id = COALESCE($8, technician_id),
       status = COALESCE($9, status),
       scheduled_date = COALESCE($10, scheduled_date),
       notes = COALESCE($11, notes),
       updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [clientName, address, phone, email, type, priority, 
       description, technicianId, status, scheduledDate, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Intervento non trovato' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Errore aggiornamento intervento' });
  }
});

router.delete('/:id', authenticateToken, requireRole('master', 'ditta'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM interventions WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Intervento non trovato' });
    }

    res.json({ message: 'Intervento eliminato' });
  } catch (error) {
    res.status(500).json({ error: 'Errore eliminazione intervento' });
  }
});

export default router;
