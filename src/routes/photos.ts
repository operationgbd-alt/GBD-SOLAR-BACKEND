import { Router } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/intervention/:interventionId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { interventionId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM photos WHERE intervention_id = $1 ORDER BY created_at DESC',
      [interventionId]
    );
    
    const photos = result.rows.map(row => ({
      id: String(row.id),
      interventionId: String(row.intervention_id),
      photoUrl: row.photo_data ? `data:${row.mime_type};base64,${row.photo_data}` : row.photo_url,
      url: row.photo_data ? `data:${row.mime_type};base64,${row.photo_data}` : row.photo_url,
      photo_url: row.photo_data ? `data:${row.mime_type};base64,${row.photo_data}` : row.photo_url,
      mimeType: row.mime_type,
      description: row.description,
      createdAt: row.created_at,
    }));
    
    res.json({ success: true, data: photos });
  } catch (error) {
    console.error('Error getting photos:', error);
    res.status(500).json({ success: false, error: 'Errore nel recupero foto' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM photos WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Foto non trovata' });
    }
    
    const row = result.rows[0];
    const photo = {
      id: String(row.id),
      interventionId: String(row.intervention_id),
      photoUrl: row.photo_data ? `data:${row.mime_type};base64,${row.photo_data}` : row.photo_url,
      url: row.photo_data ? `data:${row.mime_type};base64,${row.photo_data}` : row.photo_url,
      mimeType: row.mime_type,
      description: row.description,
      createdAt: row.created_at,
    };
    
    res.json({ success: true, data: photo });
  } catch (error) {
    console.error('Error getting photo:', error);
    res.status(500).json({ success: false, error: 'Errore nel recupero foto' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { intervention_id, photo_data, photo_url, mime_type, description } = req.body;
    
    if (!intervention_id) {
      return res.status(400).json({ success: false, error: 'intervention_id richiesto' });
    }
    
    if (!photo_data && !photo_url) {
      return res.status(400).json({ success: false, error: 'photo_data o photo_url richiesto' });
    }
    
    const interventionCheck = await pool.query('SELECT id FROM interventions WHERE id = $1', [intervention_id]);
    if (interventionCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }
    
    const result = await pool.query(
      `INSERT INTO photos (intervention_id, photo_data, photo_url, mime_type, description, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [intervention_id, photo_data || null, photo_url || null, mime_type || 'image/jpeg', description || null, req.user?.id]
    );
    
    const row = result.rows[0];
    const photo = {
      id: String(row.id),
      interventionId: String(row.intervention_id),
      photoUrl: row.photo_data ? `data:${row.mime_type};base64,${row.photo_data}` : row.photo_url,
      url: row.photo_data ? `data:${row.mime_type};base64,${row.photo_data}` : row.photo_url,
      mimeType: row.mime_type,
      description: row.description,
      createdAt: row.created_at,
    };
    
    console.log('[PHOTOS] Photo uploaded for intervention', intervention_id);
    res.status(201).json({ success: true, data: photo });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ success: false, error: 'Errore nel caricamento foto' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const photoCheck = await pool.query('SELECT * FROM photos WHERE id = $1', [id]);
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Foto non trovata' });
    }
    
    if (req.user?.role === 'tecnico' && photoCheck.rows[0].uploaded_by !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Non autorizzato a eliminare questa foto' });
    }
    
    await pool.query('DELETE FROM photos WHERE id = $1', [id]);
    
    console.log('[PHOTOS] Photo deleted:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ success: false, error: 'Errore nell\'eliminazione foto' });
  }
});

export default router;
