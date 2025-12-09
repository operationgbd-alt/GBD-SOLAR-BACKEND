import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import {
  getStatusLabel,
  getStatusClass,
  getPriorityLabel,
  getPriorityClass,
  getTypeLabel,
} from './labelHelpers';

const TEMPLATE_PATH = path.join(__dirname, '../templates/intervention-report.html');
const LOGO_PATH = path.join(__dirname, '../../assets/logo-gbd.png');

function findChromiumPath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  try {
    const result = execSync('which chromium || which chromium-browser || which google-chrome', { encoding: 'utf-8' });
    const chromePath = result.trim().split('\n')[0];
    if (chromePath && fs.existsSync(chromePath)) {
      console.log('[PDF] Found Chromium at:', chromePath);
      return chromePath;
    }
  } catch (e) {
    console.log('[PDF] Chromium not found via which command');
  }
  const nixPaths = [
    '/nix/var/nix/profiles/default/bin/chromium',
    '/run/current-system/sw/bin/chromium',
  ];
  for (const p of nixPaths) {
    if (fs.existsSync(p)) {
      console.log('[PDF] Found Chromium at:', p);
      return p;
    }
  }
  return undefined;
}

interface InterventionData {
  id: string;
  number: string;
  clientName: string;
  address: string;
  civicNumber?: string;
  city?: string;
  phone: string;
  email?: string;
  type: string;
  priority: string;
  status: string;
  description?: string;
  notes?: string;
  latitude?: string;
  longitude?: string;
  companyName?: string;
  technicianName?: string;
  scheduledDate?: Date;
  createdAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  photos?: string[];
}

function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, { timeout: 10000 }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function imageToBase64(url: string): Promise<string | null> {
  try {
    if (!url) return null;
    
    if (url.startsWith('data:')) {
      return url;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      console.log('[PDF] Skipping non-URL photo:', url.substring(0, 50));
      return null;
    }
    
    const buffer = await downloadImage(url);
    const base64 = buffer.toString('base64');
    const mimeType = url.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('[PDF] Errore download immagine:', url?.substring(0, 50), error);
    return null;
  }
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export class PDFService {
  private template: Handlebars.TemplateDelegate | null = null;

  private loadTemplate(): Handlebars.TemplateDelegate {
    if (!this.template) {
      const templateSource = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
      this.template = Handlebars.compile(templateSource);
    }
    return this.template;
  }

  private getLogoBase64(): string | null {
    try {
      if (fs.existsSync(LOGO_PATH)) {
        const logoBuffer = fs.readFileSync(LOGO_PATH);
        return logoBuffer.toString('base64');
      }
    } catch (error) {
      console.error('[PDF] Errore caricamento logo:', error);
    }
    return null;
  }

  async generatePDF(intervention: InterventionData): Promise<Buffer> {
    const template = this.loadTemplate();
    const logoBase64 = this.getLogoBase64();

    const photosWithBase64: { src: string; index: number }[] = [];
    if (intervention.photos && intervention.photos.length > 0) {
      for (let i = 0; i < intervention.photos.length; i++) {
        const base64 = await imageToBase64(intervention.photos[i]);
        if (base64) {
          photosWithBase64.push({ src: base64, index: i + 1 });
        }
      }
    }

    const data = {
      number: intervention.number,
      generatedDate: formatDate(new Date()),
      status: getStatusClass(intervention.status),
      statusLabel: getStatusLabel(intervention.status),
      clientName: intervention.clientName,
      address: intervention.address,
      civicNumber: intervention.civicNumber,
      city: intervention.city,
      phone: intervention.phone,
      email: intervention.email,
      typeLabel: getTypeLabel(intervention.type),
      priority: getPriorityClass(intervention.priority),
      priorityLabel: getPriorityLabel(intervention.priority),
      companyName: intervention.companyName || '-',
      technicianName: intervention.technicianName || '-',
      description: intervention.description,
      notes: intervention.notes,
      hasGPS: intervention.latitude && intervention.longitude,
      latitude: intervention.latitude,
      longitude: intervention.longitude,
      scheduledDate: formatDate(intervention.scheduledDate),
      createdAt: formatDate(intervention.createdAt),
      startedAt: intervention.startedAt ? formatDate(intervention.startedAt) : null,
      completedAt: intervention.completedAt ? formatDate(intervention.completedAt) : null,
      hasTimeline: intervention.createdAt || intervention.startedAt || intervention.completedAt,
      hasPhotos: photosWithBase64.length > 0,
      photos: photosWithBase64,
      logoBase64,
    };

    const html = template(data);

    const chromiumPath = findChromiumPath();
    console.log('[PDF] Launching browser with path:', chromiumPath || 'default');
    
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromiumPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}

export const pdfService = new PDFService();
