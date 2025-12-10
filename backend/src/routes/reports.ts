import { Router } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { pdfService } from '../services/pdfService';

const router = Router();

router.post('/intervention/:id', authenticateToken, requireRole('master', 'ditta'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { format } = req.body;
    
    let query = `
      SELECT i.*, 
             u.name as technician_name,
             c.name as company_name
      FROM interventions i
      LEFT JOIN users u ON i.technician_id = u.id
      LEFT JOIN companies c ON i.company_id = c.id
      WHERE i.id = $1
    `;
    
    const params: any[] = [id];
    
    if (req.user?.role === 'ditta') {
      query += ' AND i.company_id = $2';
      params.push(req.user.companyId);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Accesso non autorizzato' });
    }
    
    const row = result.rows[0];
    const interventionNumber = `INT-${new Date(row.created_at).getFullYear()}-${String(row.id).padStart(3, '0')}`;
    
    const interventionData = {
      id: String(row.id),
      number: interventionNumber,
      clientName: row.client_name,
      address: row.address,
      civicNumber: row.civic_number,
      city: row.city,
      phone: row.phone,
      email: row.email,
      type: row.type,
      priority: row.priority,
      status: row.status,
      description: row.description,
      notes: row.notes,
      latitude: row.latitude,
      longitude: row.longitude,
      companyName: row.company_name,
      technicianName: row.technician_name,
      scheduledDate: row.scheduled_date,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      photos: row.photos || [],
    };
    
    const pdfBuffer = await pdfService.generatePDF(interventionData);
    
    if (format === 'base64') {
      const base64 = pdfBuffer.toString('base64');
      res.json({
        success: true,
        data: base64,
        filename: `Report_${interventionNumber}.pdf`,
        mimeType: 'application/pdf'
      });
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Report_${interventionNumber}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    }
    
  } catch (error) {
    console.error('[REPORT] Errore generazione report:', error);
    res.status(500).json({ success: false, error: 'Errore generazione report' });
  }
});

export default router;
