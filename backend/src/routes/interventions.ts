import { Router } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { pdfService } from '../services/pdfService';
import { emailService } from '../services/emailService';

const router = Router();

const LOGO_PATH = path.join(__dirname, '../../assets/logo-gbd.png');

const PRIMARY_COLOR = '#1B8C3A';
const DARK_COLOR = '#1a1a2e';
const GRAY_COLOR = '#666666';
const LIGHT_GRAY = '#f5f5f5';

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
      description, technicianId, companyId, status, scheduledDate, notes 
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
       company_id = COALESCE($12, company_id),
       updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [clientName, address, phone, email, type, priority, 
       description, technicianId, status, scheduledDate, notes, companyId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
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
      }
    });
  } catch (error) {
    console.error('Errore aggiornamento intervento:', error);
    res.status(500).json({ success: false, error: 'Errore aggiornamento intervento' });
  }
});

router.delete('/:id', authenticateToken, requireRole('master', 'ditta'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM interventions WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Intervento non trovato' });
    }

    res.json({ success: true, message: 'Intervento eliminato' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Errore eliminazione intervento' });
  }
});

router.put('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status richiesto' });
    }

    const updateFields = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = [status];
    let paramIndex = 2;

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    if (status === 'completato') {
      updateFields.push(`completed_date = NOW()`);
    }

    params.push(id);
    const query = `UPDATE interventions SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: String(row.id),
        status: row.status,
        notes: row.notes,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Errore aggiornamento status:', error);
    res.status(500).json({ success: false, error: 'Errore aggiornamento status' });
  }
});

router.put('/:id/notes', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await pool.query(
      'UPDATE interventions SET notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: String(row.id),
        notes: row.notes,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Errore aggiornamento note:', error);
    res.status(500).json({ success: false, error: 'Errore aggiornamento note' });
  }
});

router.put('/:id/gps', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'Coordinate GPS richieste' });
    }

    const result = await pool.query(
      'UPDATE interventions SET latitude = $1, longitude = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [latitude, longitude, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: String(row.id),
        latitude: row.latitude,
        longitude: row.longitude,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Errore aggiornamento GPS:', error);
    res.status(500).json({ success: false, error: 'Errore aggiornamento GPS' });
  }
});

router.post('/:id/appointment', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { date, notes } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, error: 'Data appuntamento richiesta' });
    }

    const result = await pool.query(
      `UPDATE interventions 
       SET scheduled_date = $1, 
           status = 'appuntamento_fissato',
           notes = COALESCE($2, notes),
           updated_at = NOW() 
       WHERE id = $3 RETURNING *`,
      [date, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: String(row.id),
        scheduledDate: row.scheduled_date,
        status: row.status,
        notes: row.notes,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Errore impostazione appuntamento:', error);
    res.status(500).json({ success: false, error: 'Errore impostazione appuntamento' });
  }
});

router.put('/:id/assign', authenticateToken, requireRole('master'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { companyId, technicianId } = req.body;

    const updateFields = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (companyId !== undefined) {
      updateFields.push(`company_id = $${paramIndex}`);
      params.push(companyId || null);
      paramIndex++;
    }

    if (technicianId !== undefined) {
      updateFields.push(`technician_id = $${paramIndex}`);
      params.push(technicianId || null);
      paramIndex++;
    }

    if (companyId || technicianId) {
      updateFields.push(`status = 'assegnato'`);
    }

    params.push(id);
    const query = `UPDATE interventions SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: String(row.id),
        companyId: row.company_id ? String(row.company_id) : null,
        technicianId: row.technician_id ? String(row.technician_id) : null,
        status: row.status,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Errore assegnazione intervento:', error);
    res.status(500).json({ success: false, error: 'Errore assegnazione intervento' });
  }
});

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location!).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'assegnato': 'Assegnato',
    'in_corso': 'In Corso',
    'completato': 'Completato',
    'appuntamento_fissato': 'Appuntamento Fissato',
    'sospeso': 'Sospeso',
    'annullato': 'Annullato'
  };
  return statusMap[status] || status;
}

function formatPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    'bassa': 'Bassa',
    'normale': 'Normale',
    'alta': 'Alta',
    'urgente': 'Urgente'
  };
  return priorityMap[priority] || priority;
}

function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'installazione': 'Installazione',
    'sopralluogo': 'Sopralluogo',
    'manutenzione': 'Manutenzione',
    'riparazione': 'Riparazione'
  };
  return categoryMap[category] || category;
}

router.get('/:id/pdf', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
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
    
    if (req.user?.role === 'tecnico') {
      query += ' AND i.technician_id = $2';
      params.push(req.user.id);
    } else if (req.user?.role === 'ditta') {
      query += ' AND i.company_id = $2';
      params.push(req.user.companyId);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Accesso non autorizzato a questo intervento' });
    }
    
    const intervention = result.rows[0];
    const interventionNumber = `INT-${new Date(intervention.created_at).getFullYear()}-${String(intervention.id).padStart(3, '0')}`;
    
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      info: {
        Title: `Rapporto Intervento ${interventionNumber}`,
        Author: 'GBD Energy SRL',
        Subject: 'Rapporto Intervento Fotovoltaico'
      }
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Intervento_${interventionNumber}.pdf`);
    doc.pipe(res);
    
    const pageWidth = doc.page.width - 100;
    let y = 50;
    
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, 50, y, { width: 120 });
      y += 90;
    } else {
      doc.fillColor(PRIMARY_COLOR)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('GBD ENERGY SRL', 50, y);
      doc.fillColor(GRAY_COLOR)
         .fontSize(10)
         .font('Helvetica')
         .text('Il risparmio di oggi, il vantaggio di domani', 50, y + 28);
      y += 60;
    }
    
    doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor(PRIMARY_COLOR).lineWidth(2).stroke();
    y += 20;
    
    doc.fillColor(DARK_COLOR)
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('RAPPORTO INTERVENTO', 50, y, { align: 'center', width: pageWidth });
    y += 35;
    
    doc.fillColor(PRIMARY_COLOR)
       .fontSize(14)
       .text(interventionNumber, 50, y, { align: 'center', width: pageWidth });
    y += 40;
    
    function drawSection(title: string, startY: number): number {
      doc.fillColor(PRIMARY_COLOR)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(title, 50, startY);
      doc.moveTo(50, startY + 18).lineTo(50 + pageWidth, startY + 18).strokeColor('#cccccc').lineWidth(1).stroke();
      return startY + 30;
    }
    
    function drawField(label: string, value: string, startY: number, indent: number = 50): number {
      doc.fillColor(GRAY_COLOR)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(label + ':', indent, startY);
      doc.fillColor(DARK_COLOR)
         .fontSize(10)
         .font('Helvetica')
         .text(value || '-', indent + 120, startY, { width: pageWidth - 120 });
      return startY + 18;
    }
    
    y = drawSection('DATI CLIENTE', y);
    y = drawField('Nome', intervention.client_name, y);
    y = drawField('Indirizzo', intervention.address, y);
    if (intervention.civic_number) {
      y = drawField('Civico', intervention.civic_number, y);
    }
    if (intervention.city) {
      y = drawField('Città', intervention.city, y);
    }
    y = drawField('Telefono', intervention.phone, y);
    y = drawField('Email', intervention.email, y);
    y += 15;
    
    y = drawSection('DETTAGLI INTERVENTO', y);
    y = drawField('Tipo', formatCategory(intervention.type), y);
    y = drawField('Priorità', formatPriority(intervention.priority), y);
    y = drawField('Stato', formatStatus(intervention.status), y);
    if (intervention.scheduled_date) {
      const schedDate = new Date(intervention.scheduled_date);
      y = drawField('Data Programmata', schedDate.toLocaleDateString('it-IT', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      }), y);
    }
    y = drawField('Ditta', intervention.company_name || '-', y);
    y = drawField('Tecnico', intervention.technician_name || '-', y);
    if (intervention.description) {
      y += 5;
      doc.fillColor(GRAY_COLOR)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Descrizione:', 50, y);
      y += 15;
      doc.fillColor(DARK_COLOR)
         .fontSize(10)
         .font('Helvetica')
         .text(intervention.description, 50, y, { width: pageWidth });
      y += doc.heightOfString(intervention.description, { width: pageWidth }) + 10;
    }
    y += 15;
    
    if (intervention.latitude && intervention.longitude) {
      y = drawSection('POSIZIONE GPS', y);
      y = drawField('Latitudine', intervention.latitude, y);
      y = drawField('Longitudine', intervention.longitude, y);
      const mapsUrl = `https://maps.google.com/?q=${intervention.latitude},${intervention.longitude}`;
      doc.fillColor(PRIMARY_COLOR)
         .fontSize(9)
         .text('Apri in Google Maps', 170, y, { link: mapsUrl, underline: true });
      y += 25;
    }
    
    if (intervention.notes) {
      y = drawSection('NOTE', y);
      doc.fillColor(DARK_COLOR)
         .fontSize(10)
         .font('Helvetica')
         .text(intervention.notes, 50, y, { width: pageWidth });
      y += doc.heightOfString(intervention.notes, { width: pageWidth }) + 20;
    }
    
    const photos = intervention.photos || [];
    if (photos.length > 0) {
      doc.addPage();
      y = 50;
      
      doc.fillColor(PRIMARY_COLOR)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('DOCUMENTAZIONE FOTOGRAFICA', 50, y, { align: 'center', width: pageWidth });
      y += 40;
      
      const photoWidth = (pageWidth - 20) / 2;
      const photoHeight = 200;
      let col = 0;
      
      for (let i = 0; i < photos.length; i++) {
        try {
          const photoUrl = photos[i];
          const imageBuffer = await downloadImage(photoUrl);
          
          const x = 50 + col * (photoWidth + 20);
          
          if (y + photoHeight + 30 > doc.page.height - 50) {
            doc.addPage();
            y = 50;
          }
          
          doc.image(imageBuffer, x, y, { 
            fit: [photoWidth, photoHeight],
            align: 'center',
            valign: 'center'
          });
          
          doc.fillColor(GRAY_COLOR)
             .fontSize(8)
             .text(`Foto ${i + 1}`, x, y + photoHeight + 5, { width: photoWidth, align: 'center' });
          
          col++;
          if (col >= 2) {
            col = 0;
            y += photoHeight + 30;
          }
        } catch (err) {
          console.error('Errore download foto:', err);
        }
      }
    }
    
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fillColor(GRAY_COLOR)
         .fontSize(8)
         .text(
           `Generato il ${new Date().toLocaleDateString('it-IT')} - Pagina ${i + 1} di ${totalPages}`,
           50,
           doc.page.height - 30,
           { align: 'center', width: pageWidth }
         );
    }
    
    doc.end();
    
  } catch (error) {
    console.error('Errore generazione PDF:', error);
    res.status(500).json({ error: 'Errore generazione PDF' });
  }
});

router.post('/:id/send-report', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (userRole !== 'master' && userRole !== 'ditta') {
      return res.status(403).json({ 
        success: false, 
        error: 'Solo MASTER e DITTA possono inviare report' 
      });
    }
    
    const { id } = req.params;
    
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
    
    if (req.user?.role === 'tecnico') {
      query += ' AND i.technician_id = $2';
      params.push(req.user.id);
    } else if (req.user?.role === 'ditta') {
      query += ' AND i.company_id = $2';
      params.push(req.user.companyId);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Accesso non autorizzato a questo intervento' });
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
    
    console.log('[REPORT] Generazione PDF per intervento:', interventionNumber);
    const pdfBuffer = await pdfService.generatePDF(interventionData);
    console.log('[REPORT] PDF generato, dimensione:', pdfBuffer.length, 'bytes');
    
    console.log('[REPORT] Invio email a operation.gbd@gruppo-phoenix.com');
    const emailResult = await emailService.sendInterventionReport(
      pdfBuffer,
      interventionNumber,
      row.client_name,
      row.status
    );
    
    if (emailResult.success) {
      console.log('[REPORT] Email inviata con successo');
      res.json({ 
        success: true, 
        message: 'Report generato e inviato via email a operation.gbd@gruppo-phoenix.com',
        pdfSize: pdfBuffer.length
      });
    } else {
      console.error('[REPORT] Errore invio email:', emailResult.error);
      res.status(500).json({ 
        success: false, 
        error: emailResult.error || 'Errore invio email'
      });
    }
    
  } catch (error) {
    console.error('[REPORT] Errore generazione report:', error);
    res.status(500).json({ success: false, error: 'Errore generazione report' });
  }
});

router.get('/:id/download-report', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (userRole !== 'master' && userRole !== 'ditta') {
      return res.status(403).json({ 
        success: false, 
        error: 'Solo MASTER e DITTA possono scaricare report' 
      });
    }
    
    const { id } = req.params;
    
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
    
    if (userRole === 'ditta') {
      query += ' AND i.company_id = $2';
      params.push(req.user?.companyId);
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
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Report_${interventionNumber}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('[REPORT] Errore download report:', error);
    res.status(500).json({ success: false, error: 'Errore generazione report' });
  }
});

export default router;
