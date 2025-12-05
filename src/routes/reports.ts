import { Router } from 'express';
import PDFDocument from 'pdfkit';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/intervention/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'pdf';

    const result = await pool.query('SELECT * FROM interventions WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervento non trovato' });
    }

    const intervention = result.rows[0];

    const userRole = req.user?.role?.toLowerCase();
    
    if (userRole === 'tecnico') {
      if (intervention.technician_id !== req.user?.id) {
        return res.status(403).json({ success: false, error: 'Non autorizzato a generare questo report' });
      }
    } else if (userRole === 'ditta') {
      if (intervention.company_id !== req.user?.companyId) {
        return res.status(403).json({ success: false, error: 'Non autorizzato a generare questo report' });
      }
    }

    let technicianName = 'Non assegnato';
    if (intervention.technician_id) {
      const techResult = await pool.query('SELECT name FROM users WHERE id = $1', [intervention.technician_id]);
      if (techResult.rows.length > 0) {
        technicianName = techResult.rows[0].name || 'Tecnico';
      }
    }

    let companyName = 'Non specificata';
    if (intervention.company_id) {
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [intervention.company_id]);
      if (companyResult.rows.length > 0) {
        companyName = companyResult.rows[0].name || 'Azienda';
      }
    }

    let photos: any[] = [];
    try {
      const photosResult = await pool.query('SELECT * FROM photos WHERE intervention_id = $1 ORDER BY created_at', [id]);
      photos = photosResult.rows;
    } catch (e) {
      console.log('[PDF] Tabella photos non esiste o errore:', e);
    }

    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(24).font('Helvetica-Bold').text('RAPPORTO INTERVENTO', { align: 'center' });
    doc.moveDown(0.5);
    
    const interventionNumber = `INT-${new Date(intervention.created_at).getFullYear()}-${String(intervention.id).padStart(3, '0')}`;
    doc.fontSize(14).font('Helvetica').text(`N. ${interventionNumber}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fontSize(16).font('Helvetica-Bold').text('Informazioni Cliente');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Nome: ${intervention.client_name || 'N/D'}`);
    doc.text(`Indirizzo: ${intervention.address || 'N/D'}`);
    doc.text(`Telefono: ${intervention.phone || 'N/D'}`);
    doc.text(`Email: ${intervention.email || 'N/D'}`);
    doc.moveDown(1);

    doc.fontSize(16).font('Helvetica-Bold').text('Dettagli Intervento');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Tipo: ${intervention.type || 'N/D'}`);
    doc.text(`Priorità: ${intervention.priority || 'N/D'}`);
    doc.text(`Stato: ${intervention.status || 'N/D'}`);
    doc.text(`Tecnico: ${technicianName}`);
    doc.text(`Azienda: ${companyName}`);
    if (intervention.scheduled_date) {
      doc.text(`Data Appuntamento: ${new Date(intervention.scheduled_date).toLocaleString('it-IT')}`);
    }
    if (intervention.completed_date) {
      doc.text(`Data Completamento: ${new Date(intervention.completed_date).toLocaleString('it-IT')}`);
    }
    doc.moveDown(1);

    if (intervention.description) {
      doc.fontSize(16).font('Helvetica-Bold').text('Descrizione');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(intervention.description);
      doc.moveDown(1);
    }

    if (intervention.notes) {
      doc.fontSize(16).font('Helvetica-Bold').text('Note');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(intervention.notes);
      doc.moveDown(1);
    }

    if (intervention.latitude && intervention.longitude) {
      doc.fontSize(16).font('Helvetica-Bold').text('Posizione GPS');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Latitudine: ${parseFloat(intervention.latitude).toFixed(6)}`);
      doc.text(`Longitudine: ${parseFloat(intervention.longitude).toFixed(6)}`);
      if (intervention.location_captured_at) {
        doc.text(`Acquisita il: ${new Date(intervention.location_captured_at).toLocaleString('it-IT')}`);
      }
      doc.text(`Google Maps: https://www.google.com/maps?q=${intervention.latitude},${intervention.longitude}`);
      doc.moveDown(1);
    }

    if (photos.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Documentazione Fotografica');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(`Numero foto allegate: ${photos.length}`);
      doc.moveDown(0.5);
      
      photos.forEach((photo, index) => {
        doc.text(`${index + 1}. ${photo.description || 'Foto ' + (index + 1)}`);
        if (photo.created_at) {
          doc.fontSize(9).text(`   Scattata: ${new Date(photo.created_at).toLocaleString('it-IT')}`);
          doc.fontSize(11);
        }
      });
    }

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text(
      `Documento generato il ${new Date().toLocaleString('it-IT')} - SolarTech`,
      { align: 'center' }
    );

    doc.end();

    const pdfBuffer = await pdfPromise;
    const filename = `Report_${interventionNumber}.pdf`;

    if (format === 'base64') {
      const base64Data = pdfBuffer.toString('base64');
      res.json({ 
        success: true, 
        data: base64Data, 
        filename 
      });
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(pdfBuffer);
    }

  } catch (error) {
    console.error('[PDF] Errore generazione:', error);
    res.status(500).json({ success: false, error: 'Errore nella generazione del PDF' });
  }
});

export default router;
