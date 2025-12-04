import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import interventionRoutes from './routes/interventions';
import appointmentRoutes from './routes/appointments';
import companyRoutes from './routes/companies';
import userRoutes from './routes/users';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'SolarTech API v1.0',
    status: 'online',
    endpoints: {
      auth: '/api/auth',
      interventions: '/api/interventions',
      appointments: '/api/appointments',
      companies: '/api/companies',
      users: '/api/users'
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

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Errore interno del server' });
});

app.listen(PORT, () => {
  console.log(`Server SolarTech avviato su porta ${PORT}`);
});
