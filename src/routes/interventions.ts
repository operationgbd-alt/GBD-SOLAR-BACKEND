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
      locationCapturedAt: row.location_captured_at,
    };
    
    res.json({ success: true, data: intervention });
  } catch (error) {
    console.error('Error getting intervention:', error);
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
      description, technicianId, companyId, status, scheduledDate, notes 
    } = req.body;

    console.log('[UPDATE] Full body received:', JSON.stringify(req.body));
    console.log('[UPDATE] Intervention', id, 'by user role:', req.user?.role);
    
    if (req.user?.role === 'ditta') {
      const checkResult = await pool.query('SELECT company_id FROM interventions WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Intervento non trovato' });
      }
      if (checkResult.rows[0].company_id !== req.user.companyId) {
        return res.status(403).json({ error: 'Non autorizzato a modificare questo intervento' });
      }
    }
    
    if (req.user?.role === 'tecnico') {
      const checkResult = await pool.query('SELECT technician_id FROM interventions WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Intervento non trovato' });
      }
      const dbTechnicianId = checkResult.rows[0].technician_id;
      const userTechnicianId = req.user.id;
      console.log('[UPDATE] Checking technician permission - DB technician_id:', dbTechnicianId, '(type:', typeof dbTechnicianId, '), user.id:', userTechnicianId, '(type:', typeof userTechnicianId, ')');
      
      if (String(dbTechnicianId) !== String(userTechnicianId)) {
        console.log('[UPDATE] Permission denied for technician');
        return res.status(403).json({ error: 'Non autorizzato a modificare questo intervento' });
      }
      console.log('[UPDATE] Tecnico', req.user.id, 'updating intervention', id);
    }
    
    // Converti companyId in numero se presente
    const companyIdValue = companyId !== undefined ? (companyId === null ? null : Number(companyId)) : undefined;
    const technicianIdValue = technicianId !== undefined ? (technicianId === null ? null : Number(technicianId)) : undefined;
    
    console.log('[UPDATE] companyIdValue:', companyIdValue, 'technicianIdValue:', technicianIdValue);

    // Se companyId è undefined, non lo aggiorniamo (usa COALESCE)
    const result = await pool.query(
      `UPDATE interventions SET
       client_name = COALESCE($1, client_name),
       address = COALESCE($2, address),
       phone = COALESCE($3, phone),
       email = COALESCE($4, email),
       type = COALESCE($5, type),
       priority = COALESCE($6, priority),
       description = COALESCE($7, description),
       technician_id = CASE WHEN $8::text = 'KEEP' THEN technician_id ELSE $9::integer END,
       company_id = CASE WHEN $10::text = 'KEEP' THEN company_id ELSE $11::integer END,
       status = COALESCE($12, status),
       scheduled_date = COALESCE($13, scheduled_date),
       notes = COALESCE($14, notes),
       updated_at = NOW()
       WHERE id = $15 RETURNING *`,
      [
        clientName, address, phone, email, type, priority, description,
        technicianIdValue === undefined ? 'KEEP' : 'SET',
        technicianIdValue === undefined ? null : technicianIdValue,
        companyIdValue === undefined ? 'KEEP' : 'SET',
        companyIdValue === undefined ? null : companyIdValue,
        status, scheduledDate, notes, id
      ]
    );
    
    console.log('[UPDATE] Result row:', result.rows[0]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Intervento non trovato' });
    }

    const row = result.rows[0];
    res.json({ 
      success: true, 
      data: {
        id: String(row.id),
        companyId: row.company_id ? String(row.company_id) : null,
        status: row.status,
      }
    });
  } catch (error) {
    console.error('[UPDATE] Error:', error);
    res.status(500).json({ error: 'Errore aggiornamento intervento' });
  }
});

router.put('/:id/gps', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'Coordinate GPS mancanti' });
    }

    const checkResult = await pool.query('SELECT technician_id, company_id FROM interventions WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }

    const intervention = checkResult.rows[0];
    const userRole = req.user?.role?.toLowerCase();

    if (userRole === 'tecnico') {
      if (intervention.technician_id !== req.user?.id) {
        return res.status(403).json({ success: false, error: 'Non autorizzato a modificare questo intervento' });
      }
    } else if (userRole === 'ditta') {
      if (intervention.company_id !== req.user?.companyId) {
        return res.status(403).json({ success: false, error: 'Non autorizzato a modificare questo intervento' });
      }
    }

    const result = await pool.query(
      `UPDATE interventions SET
       latitude = $1,
       longitude = $2,
       location_captured_at = NOW(),
       updated_at = NOW()
       WHERE id = $3 RETURNING id, latitude, longitude, location_captured_at`,
      [latitude, longitude, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }

    const row = result.rows[0];
    console.log('[GPS] Posizione salvata per intervento', id, ':', latitude, longitude);
    
    res.json({ 
      success: true, 
      data: {
        id: String(row.id),
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        locationCapturedAt: row.location_captured_at
      }
    });
  } catch (error) {
    console.error('[GPS] Errore salvataggio posizione:', error);
    res.status(500).json({ success: false, error: 'Errore nel salvataggio della posizione' });
  }
});

router.delete('/:id', authenticateToken, requireRole('master', 'ditta'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    if (req.user?.role === 'ditta') {
      const checkResult = await pool.query('SELECT company_id FROM interventions WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Intervento non trovato' });
      }
      if (checkResult.rows[0].company_id !== req.user.companyId) {
        return res.status(403).json({ error: 'Non autorizzato a eliminare questo intervento' });
      }
    }
    
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
