import pool from '../config/database';

const createTables = async () => {
  console.log('Inizializzazione database SolarTech...');

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

      CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
      CREATE INDEX IF NOT EXISTS idx_interventions_technician ON interventions(technician_id);
      CREATE INDEX IF NOT EXISTS idx_interventions_company ON interventions(company_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    `);

    console.log('Tabelle create con successo!');

    const adminExists = await pool.query(
      "SELECT id FROM users WHERE username = 'gbd'"
    );

    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password', 10);
      
      await pool.query(
        `INSERT INTO users (username, password, email, role, name) 
         VALUES ('gbd', $1, 'gbd@solartech.it', 'master', 'GBD Admin')`,
        [hashedPassword]
      );
      console.log('Utente gbd creato (password: password)');
    }

    console.log('Database inizializzato con successo!');
    process.exit(0);
  } catch (error) {
    console.error('Errore migrazione:', error);
    process.exit(1);
  }
};

createTables();
