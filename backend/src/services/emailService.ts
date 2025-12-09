import sgMail from '@sendgrid/mail';
import { getStatusLabel } from './labelHelpers';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const DEFAULT_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'operation.gbd@gruppo-phoenix.com';
const OPERATIONS_EMAIL = 'operation.gbd@gruppo-phoenix.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('[EMAIL] SendGrid configurato con sender:', DEFAULT_FROM_EMAIL);
} else {
  console.warn('[EMAIL] SENDGRID_API_KEY non configurata');
}

interface EmailAttachment {
  content: string;
  filename: string;
  type: string;
  disposition: 'attachment' | 'inline';
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export class EmailService {
  private fromEmail: string;

  constructor(fromEmail: string = DEFAULT_FROM_EMAIL) {
    this.fromEmail = fromEmail;
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!SENDGRID_API_KEY) {
      console.error('[EMAIL] SendGrid API key non configurata');
      return { success: false, error: 'SendGrid API key non configurata' };
    }

    try {
      const msg = {
        to: options.to,
        from: this.fromEmail,
        subject: options.subject,
        text: options.text || '',
        html: options.html || options.text || '',
        attachments: options.attachments,
        replyTo: options.replyTo,
      };

      await sgMail.send(msg);
      console.log('[EMAIL] Email inviata con successo a:', options.to);
      return { success: true };
    } catch (error: any) {
      const errorBody = error?.response?.body;
      console.error('[EMAIL] Errore invio email:', errorBody || error);
      
      let errorMessage = 'Errore invio email';
      if (errorBody?.errors?.[0]?.message) {
        errorMessage = errorBody.errors[0].message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async sendInterventionReport(
    pdfBuffer: Buffer,
    interventionNumber: string,
    clientName: string,
    status: string
  ): Promise<{ success: boolean; error?: string }> {
    const statusLabel = getStatusLabel(status);
    const subject = `Report Intervento ${interventionNumber} - ${clientName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B8C3A; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">GBD Energy SRL</h1>
          <p style="color: #D1FAE5; margin: 5px 0 0 0;">Report Intervento</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1B8C3A; margin-top: 0;">Intervento ${interventionNumber}</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Cliente:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Stato:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="background: #D1FAE5; color: #065F46; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                  ${statusLabel}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280;">Data Report:</td>
              <td style="padding: 10px 0;">${new Date().toLocaleDateString('it-IT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px; color: #374151;">
            In allegato trovi il report completo dell'intervento in formato PDF con tutti i dettagli 
            e la documentazione fotografica.
          </p>
        </div>
        
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            GBD Energy SRL - Soluzioni Fotovoltaiche<br>
            Questo è un messaggio automatico generato dal sistema SolarTech
          </p>
        </div>
      </div>
    `;

    const text = `
Report Intervento ${interventionNumber}

Cliente: ${clientName}
Stato: ${statusLabel}
Data Report: ${new Date().toLocaleDateString('it-IT')}

In allegato il report completo in formato PDF.

--
GBD Energy SRL - Soluzioni Fotovoltaiche
    `.trim();

    return this.sendEmail({
      to: OPERATIONS_EMAIL,
      subject,
      html,
      text,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Report_${interventionNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    });
  }
}

export const emailService = new EmailService();
