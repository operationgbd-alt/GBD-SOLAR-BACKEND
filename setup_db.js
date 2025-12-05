const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:xEJJgKUYviOjuUxyxMPgNahKoDgpYqaK@shortline.proxy.rlwy.net:58528/railway',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('1. Creazione tabella companies...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        vat_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('2. Creazione tabella users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        role VARCHAR(20) NOT NULL,
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('3. Creazione tabella interventions...');
    await client.query(`
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
      )
    `);
    
    console.log('4. Creazione tabella appointments...');
    await client.query(`
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
      )
    `);
    
    console.log('5. Creazione indici...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_interventions_technician ON interventions(technician_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_interventions_company ON interventions(company_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)');
    
    console.log('6. Creazione utente admin...');
    await client.query(`
      INSERT INTO users (username, password, email, role, name, created_at) 
      VALUES ('admin', '$2a$10$PXKn7d3lEOjx9fSKCNP8lORkJWKlNzOjHuMsT1i5hOMj4J3H7V6Zq', 'admin@solartech.it', 'master', 'Amministratore', NOW())
      ON CONFLICT (username) DO NOTHING
    `);
    
    console.log('7. Verifica utenti...');
    const result = await client.query('SELECT id, username, email, role FROM users');
    console.log('✅ Utenti nel database:', result.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
