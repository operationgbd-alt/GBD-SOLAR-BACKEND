import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';
import bcrypt from 'bcryptjs';

import authRoutes from './routes/auth';
import interventionRoutes from './routes/interventions';
import appointmentRoutes from './routes/appointments';
import companyRoutes from './routes/companies';
import userRoutes from './routes/users';
import reportRoutes from './routes/reports';
import photoRoutes from './routes/photos';
import locationRoutes from './routes/locations';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

async function initDatabase() {
  console.log('Inizializzazione database...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        vat_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        role VARCHAR(20) NOT NULL CHECK (role IN ('master', 'ditta', 'tecnico')),
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS interventions (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        description TEXT,
        status VARCHAR(30) DEFAULT 'pending',
        technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        scheduled_date TIMESTAMP,
        completed_date TIMESTAMP,
        notes TEXT,
        photos TEXT[],
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        location_captured_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        address TEXT,
        date TIMESTAMP NOT NULL,
        notes TEXT,
        notify_before INTEGER,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        intervention_id INTEGER REFERENCES interventions(id) ON DELETE CASCADE,
        photo_data TEXT,
        photo_url TEXT,
        mime_type VARCHAR(50) DEFAULT 'image/jpeg',
        description TEXT,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS technician_locations (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(6, 2),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_photos_intervention ON photos(intervention_id);
      CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
      CREATE INDEX IF NOT EXISTS idx_interventions_technician ON interventions(technician_id);
      CREATE INDEX IF NOT EXISTS idx_interventions_company ON interventions(company_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
      CREATE INDEX IF NOT EXISTS idx_technician_locations_updated ON technician_locations(updated_at);
    `);
    console.log('Tabelle create/verificate!');
    
    await pool.query(`
      ALTER TABLE interventions ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
      ALTER TABLE interventions ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
      ALTER TABLE interventions ADD COLUMN IF NOT EXISTS location_captured_at TIMESTAMP;
    `);
    console.log('Colonne GPS verificate!');

    const adminExists = await pool.query("SELECT id FROM users WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO users (username, password, email, role, name) 
         VALUES ('admin', $1, 'admin@solartech.it', 'master', 'Amministratore')`,
        [hashedPassword]
      );
      console.log('Utente admin creato (password: admin123)');
    }
    console.log('Database pronto!');
  } catch (error) {
    console.error('Errore init database:', error);
  }
}

app.get('/', (req, res) => {
  res.json({ 
    message: 'SolarTech API v1.1',
    status: 'online',
    endpoints: {
      auth: '/api/auth',
      interventions: '/api/interventions',
      appointments: '/api/appointments',
      companies: '/api/companies',
      users: '/api/users',
      photos: '/api/photos',
      reports: '/api/reports'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/locations', locationRoutes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Errore interno del server' });
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server SolarTech avviato su porta ${PORT}`);
  });
});

// DEBUG ENDPOINT - temp
app.get('/api/debug/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, role, created_at FROM users');
    res.json({ success: true, users: result.rows, count: result.rows.length });
  } catch (error) {
    res.json({ success: false, error: String(error) });
  }
});

// Database check endpoint
app.get('/api/debug/db-check', async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL || 'not set';
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    const users = await pool.query('SELECT id, username, role FROM users LIMIT 5');
    res.json({ 
      success: true, 
      database_url: maskedUrl,
      users: users.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({ success: false, error: String(error) });
  }
});
