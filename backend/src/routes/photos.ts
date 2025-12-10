import { Router } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/intervention/:interventionId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { interventionId } = req.params;
    
    const interventionResult = await pool.query(
      'SELECT photos FROM interventions WHERE id = $1',
      [interventionId]
    );
    
    if (interventionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }
    
    const photos = interventionResult.rows[0].photos || [];
    
    const photoData = photos.map((url: string, index: number) => ({
      id: `${interventionId}-${index}`,
      url: url,
      interventionId: interventionId,
      createdAt: new Date().toISOString()
    }));
    
    res.json({ success: true, data: photoData });
  } catch (error) {
    console.error('Errore recupero foto:', error);
    res.status(500).json({ success: false, error: 'Errore recupero foto' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { intervention_id, photo_data, mime_type, description } = req.body;
    
    if (!intervention_id || !photo_data) {
      return res.status(400).json({ success: false, error: 'Dati mancanti' });
    }
    
    const photoUrl = photo_data.startsWith('data:') ? photo_data : `data:${mime_type || 'image/jpeg'};base64,${photo_data}`;
    
    const result = await pool.query(
      `UPDATE interventions 
       SET photos = array_append(COALESCE(photos, ARRAY[]::TEXT[]), $1),
           updated_at = NOW()
       WHERE id = $2
       RETURNING photos`,
      [photoUrl, intervention_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }
    
    const photos = result.rows[0].photos;
    const newPhotoIndex = photos.length - 1;
    
    res.json({ 
      success: true, 
      data: {
        id: `${intervention_id}-${newPhotoIndex}`,
        url: photoUrl,
        interventionId: intervention_id,
        description: description || null,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Errore upload foto:', error);
    res.status(500).json({ success: false, error: 'Errore upload foto' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const [interventionId, photoIndex] = id.split('-');
    
    const result = await pool.query(
      'SELECT photos FROM interventions WHERE id = $1',
      [interventionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Foto non trovata' });
    }
    
    const photos = result.rows[0].photos || [];
    const index = parseInt(photoIndex);
    
    if (index < 0 || index >= photos.length) {
      return res.status(404).json({ success: false, error: 'Foto non trovata' });
    }
    
    res.json({ 
      success: true, 
      data: { 
        id: id,
        data: photos[index],
        url: photos[index]
      }
    });
  } catch (error) {
    console.error('Errore recupero foto:', error);
    res.status(500).json({ success: false, error: 'Errore recupero foto' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const [interventionId, photoIndex] = id.split('-');
    
    const result = await pool.query(
      'SELECT photos FROM interventions WHERE id = $1',
      [interventionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }
    
    const photos = result.rows[0].photos || [];
    const index = parseInt(photoIndex);
    
    if (index < 0 || index >= photos.length) {
      return res.status(404).json({ success: false, error: 'Foto non trovata' });
    }
    
    photos.splice(index, 1);
    
    await pool.query(
      'UPDATE interventions SET photos = $1, updated_at = NOW() WHERE id = $2',
      [photos, interventionId]
    );
    
    res.json({ success: true, message: 'Foto eliminata' });
  } catch (error) {
    console.error('Errore eliminazione foto:', error);
    res.status(500).json({ success: false, error: 'Errore eliminazione foto' });
  }
});

export default router;
