# SolarTech Backend API

Backend per l'app SolarTech - Gestione Interventi Fotovoltaici.

## Tecnologie
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT per autenticazione

## Setup Locale

1. Installa dipendenze:
```bash
npm install
```

2. Crea file `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/solartech
JWT_SECRET=your-secret-key
PORT=3000
```

3. Esegui migrazione database:
```bash
npm run db:migrate
```

4. Avvia server:
```bash
npm run dev
```

## Deploy su Railway

1. Crea nuovo progetto su Railway
2. Aggiungi PostgreSQL database
3. Collega repository GitHub
4. Imposta variabili ambiente:
   - `DATABASE_URL` (automatico da Railway)
   - `JWT_SECRET`
   - `NODE_ENV=production`
5. Build command: `npm run build`
6. Start command: `npm start`

## API Endpoints

### Auth
- POST `/api/auth/register` - Registrazione
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Profilo utente

### Interventi
- GET `/api/interventions` - Lista interventi
- POST `/api/interventions` - Crea intervento
- PUT `/api/interventions/:id` - Modifica intervento
- DELETE `/api/interventions/:id` - Elimina intervento

### Appuntamenti
- GET `/api/appointments` - Lista appuntamenti
- POST `/api/appointments` - Crea appuntamento
- PUT `/api/appointments/:id` - Modifica appuntamento
- DELETE `/api/appointments/:id` - Elimina appuntamento

### Ditte
- GET `/api/companies` - Lista ditte
- POST `/api/companies` - Crea ditta
- PUT `/api/companies/:id` - Modifica ditta
- DELETE `/api/companies/:id` - Elimina ditta

### Utenti
- GET `/api/users` - Lista utenti
- GET `/api/users/technicians` - Lista tecnici
- PUT `/api/users/:id` - Modifica utente
- DELETE `/api/users/:id` - Elimina utente

## Credenziali Demo
- Username: `admin`
- Password: `admin123`
