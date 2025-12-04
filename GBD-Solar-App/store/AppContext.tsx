import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Intervention, Appointment, Company, User } from '@/types';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const COMPANIES_STORAGE_KEY = 'solartech_companies';
const USERS_STORAGE_KEY = 'solartech_users';
const INTERVENTIONS_STORAGE_KEY = 'solartech_interventions';

interface AppContextType {
  interventions: Intervention[];
  appointments: Appointment[];
  companies: Company[];
  users: User[];
  allInterventionsCount: number;
  unassignedInterventions: Intervention[];
  isRefreshing: boolean;
  refreshFromServer: () => Promise<void>;
  addIntervention: (intervention: Omit<Intervention, 'id' | 'number' | 'createdAt' | 'updatedAt'>) => void;
  updateIntervention: (id: string, updates: Partial<Intervention>) => void;
  deleteIntervention: (id: string) => void;
  bulkAssignToCompany: (interventionIds: string[], companyId: string, companyName: string) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  getInterventionById: (id: string) => Intervention | undefined;
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => string;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>, existingId?: string) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  getCompanyById: (id: string) => Company | undefined;
  getUsersByCompany: (companyId: string) => User[];
  getAllInterventionsData: () => Intervention[];
  getGlobalStats: () => {
    totalInterventions: number;
    byStatus: Record<string, number>;
    byCompany: { companyId: string; companyName: string; count: number }[];
    totalCompanies: number;
    totalTechnicians: number;
    unassignedCount: number;
  };
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

let interventionCounter = 9;
const generateInterventionNumber = () => {
  interventionCounter++;
  return `INT-2025-${String(interventionCounter).padStart(3, '0')}`;
};

const initialCompanies: Company[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'GBD B&A S.r.l.',
    address: 'Via Milano 123, Milano',
    phone: '+39 02 12345678',
    email: 'info@gbd-ba.it',
    username: 'ditta',
    password: 'ditta123',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Solar Pro S.r.l.',
    address: 'Via Roma 45, Roma',
    phone: '+39 06 87654321',
    email: 'info@solarpro.it',
    username: 'solarpro',
    password: 'solar123',
    createdAt: Date.now() - 86400000 * 20,
  },
];

const initialUsers: User[] = [
  {
    id: '17ac45dc-2e12-4226-90f5-49db2d8ac92b',
    username: 'gbd',
    role: 'master',
    name: 'GBD Amministratore',
    email: 'admin@gbd.it',
    phone: '+39 02 00000000',
    companyId: null,
    companyName: null,
    createdAt: Date.now() - 86400000 * 60,
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    username: 'ditta',
    role: 'ditta',
    name: 'GBD B&A',
    email: 'info@gbd-ba.it',
    phone: '+39 02 12345678',
    companyId: '11111111-1111-1111-1111-111111111111',
    companyName: 'GBD B&A S.r.l.',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    username: 'solarpro',
    role: 'ditta',
    name: 'Solar Pro',
    email: 'info@solarpro.it',
    phone: '+39 06 87654321',
    companyId: '22222222-2222-2222-2222-222222222222',
    companyName: 'Solar Pro S.r.l.',
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    username: 'alex',
    role: 'tecnico',
    name: 'Alessandro Rossi',
    email: 'alex@gbd-ba.it',
    phone: '+39 333 1234567',
    companyId: '11111111-1111-1111-1111-111111111111',
    companyName: 'GBD B&A S.r.l.',
    lastLocation: {
      latitude: 45.4642,
      longitude: 9.1900,
      address: 'Via Roma 45, Milano',
      timestamp: Date.now() - 300000,
      isOnline: true,
    },
    createdAt: Date.now() - 86400000 * 25,
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    username: 'billo',
    role: 'tecnico',
    name: 'Marco Bianchi',
    email: 'billo@gbd-ba.it',
    phone: '+39 333 7654321',
    companyId: '11111111-1111-1111-1111-111111111111',
    companyName: 'GBD B&A S.r.l.',
    lastLocation: {
      latitude: 45.0703,
      longitude: 7.6869,
      address: 'Corso Vittorio Emanuele 120, Torino',
      timestamp: Date.now() - 600000,
      isOnline: true,
    },
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    username: 'luca',
    role: 'tecnico',
    name: 'Luca Verdi',
    email: 'luca@solarpro.it',
    phone: '+39 333 9988776',
    companyId: '22222222-2222-2222-2222-222222222222',
    companyName: 'Solar Pro S.r.l.',
    lastLocation: {
      latitude: 41.9028,
      longitude: 12.4964,
      address: 'Via del Corso 15, Roma',
      timestamp: Date.now() - 1800000,
      isOnline: false,
    },
    createdAt: Date.now() - 86400000 * 15,
  },
];

const allInterventions: Intervention[] = [
  {
    id: '00000001-0001-0001-0001-000000000001',
    number: 'INT-2025-001',
    client: {
      name: 'Giuseppe Verdi',
      address: 'Via Roma',
      civicNumber: '45',
      cap: '20121',
      city: 'Milano',
      phone: '+39 02 1234567',
      email: 'g.verdi@email.it',
    },
    companyId: '11111111-1111-1111-1111-111111111111',
    companyName: 'GBD B&A S.r.l.',
    technicianId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    technicianName: 'Alessandro Rossi',
    category: 'installazione',
    description: 'Installazione impianto fotovoltaico 6kW con sistema di accumulo.',
    priority: 'alta',
    assignedAt: Date.now() - 86400000 * 2,
    assignedBy: 'Admin',
    status: 'assegnato',
    documentation: { photos: [], notes: '' },
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: '00000002-0002-0002-0002-000000000002',
    number: 'INT-2025-002',
    client: {
      name: 'Anna Bianchi',
      address: 'Corso Vittorio Emanuele',
      civicNumber: '120',
      cap: '10121',
      city: 'Torino',
      phone: '+39 011 9876543',
      email: 'a.bianchi@email.it',
    },
    companyId: '11111111-1111-1111-1111-111111111111',
    companyName: 'GBD B&A S.r.l.',
    technicianId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    technicianName: 'Alessandro Rossi',
    category: 'sopralluogo',
    description: 'Sopralluogo per verifica stato impianto esistente.',
    priority: 'normale',
    assignedAt: Date.now() - 86400000,
    assignedBy: 'Admin',
    appointment: {
      date: Date.now() + 86400000 * 2 + 3600000 * 10,
      confirmedAt: Date.now() - 3600000 * 5,
      notes: 'Cliente disponibile solo al mattino',
    },
    status: 'appuntamento_fissato',
    documentation: { photos: [], notes: '' },
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000 * 5,
  },
  {
    id: '00000003-0003-0003-0003-000000000003',
    number: 'INT-2025-003',
    client: {
      name: 'Maria Russo',
      address: 'Via Garibaldi',
      civicNumber: '33',
      cap: '50123',
      city: 'Firenze',
      phone: '+39 055 1122334',
      email: 'm.russo@email.it',
    },
    companyId: '11111111-1111-1111-1111-111111111111',
    companyName: 'GBD B&A S.r.l.',
    technicianId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    technicianName: 'Marco Bianchi',
    category: 'installazione',
    description: 'Installazione sistema di accumulo aggiuntivo 5kWh.',
    priority: 'urgente',
    assignedAt: Date.now() - 3600000 * 4,
    assignedBy: 'Admin',
    appointment: {
      date: Date.now() + 3600000 * 2,
      confirmedAt: Date.now() - 3600000 * 2,
      notes: 'Urgente - cliente senza produzione',
    },
    status: 'appuntamento_fissato',
    documentation: { photos: [], notes: '' },
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: '00000004-0004-0004-0004-000000000004',
    number: 'INT-2025-004',
    client: {
      name: 'Luigi Esposito',
      address: 'Via Napoli',
      civicNumber: '78',
      cap: '80121',
      city: 'Napoli',
      phone: '+39 081 5554433',
      email: 'l.esposito@email.it',
    },
    companyId: '11111111-1111-1111-1111-111111111111',
    companyName: 'GBD B&A S.r.l.',
    technicianId: null,
    technicianName: null,
    category: 'sopralluogo',
    description: 'Sopralluogo per preventivo nuovo impianto 10kW - DA ASSEGNARE',
    priority: 'bassa',
    assignedAt: Date.now() - 86400000 * 3,
    assignedBy: 'Admin',
    status: 'assegnato',
    documentation: { photos: [], notes: '' },
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: '00000005-0005-0005-0005-000000000005',
    number: 'INT-2025-005',
    client: {
      name: 'Franco Colombo',
      address: 'Via Dante',
      civicNumber: '15',
      cap: '40121',
      city: 'Bologna',
      phone: '+39 051 9988776',
      email: 'f.colombo@email.it',
    },
    companyId: '11111111-1111-1111-1111-111111111111',
    companyName: 'GBD B&A S.r.l.',
    technicianId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    technicianName: 'Alessandro Rossi',
    category: 'installazione',
    description: 'Installazione impianto fotovoltaico 4kW residenziale.',
    priority: 'normale',
    assignedAt: Date.now() - 86400000 * 5,
    assignedBy: 'Admin',
    appointment: {
      date: Date.now() - 86400000,
      confirmedAt: Date.now() - 86400000 * 3,
      notes: '',
    },
    location: {
      latitude: 44.4949,
      longitude: 11.3426,
      address: 'Via Dante 15, Bologna',
      timestamp: Date.now() - 86400000,
    },
    status: 'completato',
    documentation: {
      photos: [],
      notes: 'Installazione completata. Cliente soddisfatto.',
      startedAt: Date.now() - 86400000 - 3600000,
      completedAt: Date.now() - 86400000,
    },
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: '00000006-0006-0006-0006-000000000006',
    number: 'INT-2025-006',
    client: {
      name: 'Roberto Mancini',
      address: 'Via Venezia',
      civicNumber: '22',
      cap: '35121',
      city: 'Padova',
      phone: '+39 049 7766554',
      email: 'r.mancini@email.it',
    },
    companyId: '11111111-1111-1111-1111-111111111111',
    companyName: 'GBD B&A S.r.l.',
    technicianId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    technicianName: 'Marco Bianchi',
    category: 'manutenzione',
    description: 'Manutenzione ordinaria impianto 8kW.',
    priority: 'normale',
    assignedAt: Date.now() - 86400000 * 2,
    assignedBy: 'Admin',
    status: 'assegnato',
    documentation: { photos: [], notes: '' },
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: '00000007-0007-0007-0007-000000000007',
    number: 'INT-2025-007',
    client: {
      name: 'Giulia Ferrari',
      address: 'Via Milano',
      civicNumber: '88',
      cap: '24121',
      city: 'Bergamo',
      phone: '+39 035 4455667',
      email: 'g.ferrari@email.it',
    },
    companyId: '22222222-2222-2222-2222-222222222222',
    companyName: 'Solar Pro S.r.l.',
    technicianId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    technicianName: 'Luca Verdi',
    category: 'manutenzione',
    description: 'Sostituzione inverter guasto.',
    priority: 'alta',
    assignedAt: Date.now() - 86400000,
    assignedBy: 'Admin',
    appointment: {
      date: Date.now() + 86400000 * 3,
      confirmedAt: Date.now() - 3600000 * 2,
      notes: 'Portare inverter sostitutivo',
    },
    status: 'appuntamento_fissato',
    documentation: { photos: [], notes: '' },
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: '00000008-0008-0008-0008-000000000008',
    number: 'INT-2025-008',
    client: {
      name: 'Stefano Conti',
      address: 'Via Verona',
      civicNumber: '56',
      cap: '37121',
      city: 'Verona',
      phone: '+39 045 8899001',
      email: 's.conti@email.it',
    },
    companyId: '22222222-2222-2222-2222-222222222222',
    companyName: 'Solar Pro S.r.l.',
    technicianId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    technicianName: 'Luca Verdi',
    category: 'manutenzione',
    description: 'Controllo annuale sistema di accumulo.',
    priority: 'bassa',
    assignedAt: Date.now() - 86400000 * 4,
    assignedBy: 'Admin',
    status: 'completato',
    location: {
      latitude: 45.4384,
      longitude: 10.9916,
      address: 'Via Verona 56, Verona',
      timestamp: Date.now() - 86400000 * 2,
    },
    documentation: {
      photos: [],
      notes: 'Batteria efficienza al 92%.',
      startedAt: Date.now() - 86400000 * 2 - 3600000,
      completedAt: Date.now() - 86400000 * 2,
    },
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: '00000009-0009-0009-0009-000000000009',
    number: 'INT-2025-009',
    client: {
      name: 'Roberto Neri',
      address: 'Via Trieste',
      civicNumber: '22',
      cap: '34121',
      city: 'Trieste',
      phone: '+39 040 1122334',
      email: 'r.neri@email.it',
    },
    companyId: null,
    companyName: null,
    technicianId: null,
    technicianName: null,
    category: 'installazione',
    description: 'Nuovo impianto fotovoltaico 8kW - NON ASSEGNATO',
    priority: 'alta',
    assignedAt: Date.now() - 86400000,
    assignedBy: 'Admin',
    status: 'assegnato',
    documentation: { photos: [], notes: '' },
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: '00000010-0010-0010-0010-000000000010',
    number: 'INT-2025-010',
    client: {
      name: 'Paola Galli',
      address: 'Via Padova',
      civicNumber: '88',
      cap: '35121',
      city: 'Padova',
      phone: '+39 049 5566778',
      email: 'p.galli@email.it',
    },
    companyId: null,
    companyName: null,
    technicianId: null,
    technicianName: null,
    category: 'sopralluogo',
    description: 'Sopralluogo per ampliamento impianto esistente - NON ASSEGNATO',
    priority: 'normale',
    assignedAt: Date.now() - 86400000 * 2,
    assignedBy: 'Admin',
    status: 'assegnato',
    documentation: { photos: [], notes: '' },
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: '00000011-0011-0011-0011-000000000011',
    number: 'INT-2025-011',
    client: {
      name: 'Fabio Moretti',
      address: 'Via Venezia',
      civicNumber: '45',
      cap: '30121',
      city: 'Venezia',
      phone: '+39 041 9988001',
      email: 'f.moretti@email.it',
    },
    companyId: null,
    companyName: null,
    technicianId: null,
    technicianName: null,
    category: 'manutenzione',
    description: 'Manutenzione straordinaria inverter - NON ASSEGNATO',
    priority: 'urgente',
    assignedAt: Date.now() - 3600000 * 6,
    assignedBy: 'Admin',
    status: 'assegnato',
    documentation: { photos: [], notes: '' },
    createdAt: Date.now() - 3600000 * 6,
    updatedAt: Date.now() - 3600000 * 6,
  },
];

const allAppointments: Appointment[] = [
  {
    id: 'apt-001',
    type: 'intervento',
    interventionId: '00000002-0002-0002-0002-000000000002',
    clientName: 'Anna Bianchi',
    address: 'Corso Vittorio Emanuele 120, Torino',
    date: Date.now() + 86400000 * 2 + 3600000 * 10,
    notes: 'Cliente disponibile solo al mattino',
    notifyBefore: 60,
  },
  {
    id: 'apt-002',
    type: 'intervento',
    interventionId: '00000003-0003-0003-0003-000000000003',
    clientName: 'Maria Russo',
    address: 'Via Garibaldi 33, Firenze',
    date: Date.now() + 3600000 * 2,
    notes: 'Urgente',
    notifyBefore: 30,
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, hasValidToken } = useAuth();
  const [interventionsData, setInterventionsData] = useState<Intervention[]>(allInterventions);
  const [appointmentsData, setAppointmentsData] = useState<Appointment[]>(allAppointments);
  const [companiesData, setCompaniesData] = useState<Company[]>(initialCompanies);
  const [usersData, setUsersData] = useState<User[]>(initialUsers);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshUserId = useRef<string | null>(null);

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const [storedCompanies, storedUsers, storedInterventions] = await Promise.all([
          AsyncStorage.getItem(COMPANIES_STORAGE_KEY),
          AsyncStorage.getItem(USERS_STORAGE_KEY),
          AsyncStorage.getItem(INTERVENTIONS_STORAGE_KEY),
        ]);

        const hasOldFormatData = (data: string | null): boolean => {
          if (!data) return false;
          try {
            const parsed = JSON.parse(data);
            return parsed.some((item: any) => 
              item.id?.startsWith('company-') || 
              item.id?.startsWith('int-') ||
              item.id?.startsWith('tech-') ||
              item.id?.startsWith('ditta-') ||
              item.id?.startsWith('master-') ||
              item.companyId?.startsWith('company-')
            );
          } catch {
            return false;
          }
        };

        if (hasOldFormatData(storedCompanies) || hasOldFormatData(storedUsers) || hasOldFormatData(storedInterventions)) {
          console.log('[LOAD] Detected old format data, clearing cache...');
          await AsyncStorage.multiRemove([
            COMPANIES_STORAGE_KEY,
            USERS_STORAGE_KEY,
            INTERVENTIONS_STORAGE_KEY,
            '@solartech_registered_users',
          ]);
          console.log('[LOAD] Cache cleared, using fresh data');
          setIsDataLoaded(true);
          return;
        }

        if (storedCompanies) {
          const parsed = JSON.parse(storedCompanies);
          console.log('[LOAD] Found stored companies:', parsed.length, parsed.map((c: Company) => ({ id: c.id, name: c.name })));
          const mergedCompanies = [...initialCompanies];
          parsed.forEach((c: Company) => {
            if (!mergedCompanies.find(mc => mc.id === c.id)) {
              mergedCompanies.push(c);
            }
          });
          console.log('[LOAD] Merged companies:', mergedCompanies.length);
          setCompaniesData(mergedCompanies);
        } else {
          console.log('[LOAD] No stored companies found');
        }

        if (storedUsers) {
          const parsed = JSON.parse(storedUsers);
          const mergedUsers = [...initialUsers];
          parsed.forEach((u: User) => {
            if (!mergedUsers.find(mu => mu.id === u.id)) {
              mergedUsers.push(u);
            }
          });
          setUsersData(mergedUsers);
        }

        if (storedInterventions) {
          const parsed: Intervention[] = JSON.parse(storedInterventions);
          console.log('[LOAD] Found stored interventions:', parsed.length);
          console.log('[LOAD] Assigned companyIds:', parsed.filter(i => i.companyId).map(i => ({ id: i.id, companyId: i.companyId })));
          const storedMap = new Map<string, Intervention>(parsed.map((i) => [i.id, i]));
          const mergedInterventions: Intervention[] = allInterventions.map(i => 
            storedMap.has(i.id) ? storedMap.get(i.id)! : i
          );
          parsed.forEach((i) => {
            if (!allInterventions.find(ai => ai.id === i.id)) {
              mergedInterventions.push(i);
            }
          });
          console.log('[LOAD] Merged interventions:', mergedInterventions.length);
          setInterventionsData(mergedInterventions);
        } else {
          console.log('[LOAD] No stored interventions found, using defaults');
        }
      } catch (error) {
        console.error('Error loading stored data:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadStoredData();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return;
    const newCompanies = companiesData.filter(c => !initialCompanies.find(ic => ic.id === c.id));
    if (newCompanies.length > 0) {
      console.log('[SAVE] Saving companies:', newCompanies.length, newCompanies.map(c => ({ id: c.id, name: c.name })));
      AsyncStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(newCompanies))
        .then(() => console.log('[SAVE] Companies saved successfully'))
        .catch(err => console.error('[SAVE] Error saving companies:', err));
    } else {
      AsyncStorage.removeItem(COMPANIES_STORAGE_KEY);
    }
  }, [companiesData, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const newUsers = usersData.filter(u => !initialUsers.find(iu => iu.id === u.id));
    if (newUsers.length > 0) {
      AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newUsers));
    } else {
      AsyncStorage.removeItem(USERS_STORAGE_KEY);
    }
  }, [usersData, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    
    const hasAnyModification = interventionsData.some(i => {
      const original = allInterventions.find(ai => ai.id === i.id);
      if (!original) return true;
      return i.companyId !== original.companyId || 
             i.status !== original.status ||
             i.technicianId !== original.technicianId ||
             i.documentation?.notes !== original.documentation?.notes ||
             JSON.stringify(i.documentation?.photos) !== JSON.stringify(original.documentation?.photos) ||
             JSON.stringify(i.location) !== JSON.stringify(original.location);
    });
    
    if (hasAnyModification) {
      console.log('[SAVE] Saving interventions to AsyncStorage...', interventionsData.length);
      AsyncStorage.setItem(INTERVENTIONS_STORAGE_KEY, JSON.stringify(interventionsData))
        .then(() => console.log('[SAVE] Interventions saved successfully'))
        .catch(err => console.error('[SAVE] Error saving interventions:', err));
    }
  }, [interventionsData, isDataLoaded]);

  // Sync technician IDs: Fix interventions assigned to old IDs when technician logs in
  useEffect(() => {
    if (!user || user.role !== 'tecnico' || !isDataLoaded) return;

    // Find the user in usersData by username to get the potentially different ID
    const appContextUser = usersData.find(u => 
      u.username === user.username && u.companyId === user.companyId
    );
    
    if (!appContextUser) return;
    
    // If the user ID in AppContext is different from AuthContext, we need to:
    // 1. Update the user ID in usersData
    // 2. Update all interventions that reference the old ID
    if (appContextUser.id !== user.id) {
      console.log('[SYNC] ID mismatch detected for technician:', user.username);
      console.log('[SYNC] AppContext ID:', appContextUser.id);
      console.log('[SYNC] AuthContext ID:', user.id);
      
      const oldId = appContextUser.id;
      const newId = user.id;
      
      // Update user ID in usersData
      setUsersData(prev => prev.map(u => 
        u.id === oldId ? { ...u, id: newId } : u
      ));
      
      // Update interventions that reference the old technician ID
      setInterventionsData(prev => prev.map(i => 
        i.technicianId === oldId 
          ? { ...i, technicianId: newId, updatedAt: Date.now() }
          : i
      ));
      
      console.log('[SYNC] Updated user and intervention IDs from', oldId, 'to', newId);
    }
  }, [user, usersData, isDataLoaded]);

  const refreshFromServer = useCallback(async () => {
    if (!hasValidToken) {
      console.log('[REFRESH] No valid token, skipping server refresh');
      return;
    }

    console.log('[REFRESH] Starting server sync...');
    setIsRefreshing(true);

    try {
      await AsyncStorage.multiRemove([
        COMPANIES_STORAGE_KEY,
        USERS_STORAGE_KEY,
        INTERVENTIONS_STORAGE_KEY,
      ]);
      console.log('[REFRESH] Cleared local cache');

      const response = await api.getInterventions();
      console.log('[REFRESH] API response:', response.success, response.data?.length || 0, 'interventions');

      if (response.success && response.data) {
        const serverInterventions: Intervention[] = response.data.map((serverInt: any) => ({
          id: serverInt.id,
          number: serverInt.number,
          client: {
            name: serverInt.clientName || serverInt.client?.name || '',
            address: serverInt.clientAddress || serverInt.client?.address || '',
            civicNumber: serverInt.clientCivicNumber || serverInt.client?.civicNumber || '',
            cap: serverInt.clientPostalCode || serverInt.client?.cap || '',
            city: serverInt.clientCity || serverInt.client?.city || '',
            phone: serverInt.clientPhone || serverInt.client?.phone || '',
            email: serverInt.clientEmail || serverInt.client?.email || '',
          },
          companyId: serverInt.companyId || serverInt.company?.id || null,
          companyName: serverInt.companyName || serverInt.company?.name || null,
          technicianId: serverInt.technicianId || serverInt.technician?.id || null,
          technicianName: serverInt.technicianName || serverInt.technician?.name || null,
          category: serverInt.category,
          description: serverInt.description,
          priority: serverInt.priority,
          assignedAt: serverInt.assignedAt ? new Date(serverInt.assignedAt).getTime() : Date.now(),
          assignedBy: serverInt.assignedBy || 'Admin',
          status: serverInt.status,
          location: serverInt.locationLatitude ? {
            latitude: serverInt.locationLatitude,
            longitude: serverInt.locationLongitude,
            address: serverInt.locationAddress || '',
            timestamp: serverInt.locationTimestamp ? new Date(serverInt.locationTimestamp).getTime() : Date.now(),
          } : undefined,
          documentation: {
            photos: serverInt.documentationPhotos || [],
            notes: serverInt.documentationNotes || '',
            startedAt: serverInt.startedAt ? new Date(serverInt.startedAt).getTime() : undefined,
            completedAt: serverInt.completedAt ? new Date(serverInt.completedAt).getTime() : undefined,
          },
          createdAt: serverInt.createdAt ? new Date(serverInt.createdAt).getTime() : Date.now(),
          updatedAt: serverInt.updatedAt ? new Date(serverInt.updatedAt).getTime() : Date.now(),
        }));

        console.log('[REFRESH] Mapped', serverInterventions.length, 'interventions from server');
        console.log('[REFRESH] Intervention numbers:', serverInterventions.map(i => i.number));
        setInterventionsData(serverInterventions);
        setAppointmentsData([]);
      } else {
        console.log('[REFRESH] API failed, keeping local data');
      }
    } catch (error) {
      console.error('[REFRESH] Error:', error);
    } finally {
      setIsRefreshing(false);
      console.log('[REFRESH] Sync complete');
    }
  }, [hasValidToken]);

  useEffect(() => {
    if (!user || !hasValidToken || !isDataLoaded) return;
    
    if (lastRefreshUserId.current !== user.id) {
      console.log('[REFRESH AUTO] New user login detected, syncing from server...');
      lastRefreshUserId.current = user.id;
      refreshFromServer();
    }
  }, [user, hasValidToken, isDataLoaded, refreshFromServer]);

  const interventions = useMemo(() => {
    if (!user) {
      console.log('[INTERVENTIONS] No user, returning empty array');
      return [];
    }
    const role = user.role?.toLowerCase();
    console.log('[INTERVENTIONS] User role:', user.role, '-> normalized:', role);
    console.log('[INTERVENTIONS] Total interventionsData:', interventionsData.length);
    switch (role) {
      case 'master':
        console.log('[INTERVENTIONS] MASTER - returning all', interventionsData.length, 'interventions');
        return interventionsData;
      case 'ditta':
        console.log('[DEBUG] DITTA Login - user.companyId:', user.companyId);
        console.log('[DEBUG] DITTA Login - user.companyName:', user.companyName);
        console.log('[DEBUG] All interventions companyIds:', interventionsData.map(i => ({ id: i.id, companyId: i.companyId, companyName: i.companyName })));
        const filtered = interventionsData.filter(i => i.companyId === user.companyId);
        console.log('[DEBUG] Filtered interventions count:', filtered.length);
        return filtered;
      case 'tecnico':
        console.log('[DEBUG] TECNICO Login - user.id:', user.id);
        console.log('[DEBUG] TECNICO Login - user.companyId:', user.companyId);
        
        // Find interventions for this company
        const companyInterventions = interventionsData.filter(i => i.companyId === user.companyId);
        console.log('[DEBUG] TECNICO - Interventions in company:', companyInterventions.map(i => ({
          id: i.id,
          description: i.description,
          technicianId: i.technicianId,
          technicianName: i.technicianName,
          matchesUserId: i.technicianId === user.id,
          isUnassigned: i.technicianId === null
        })));
        
        const tecnicoFiltered = interventionsData.filter(i =>
          i.companyId === user.companyId &&
          (i.technicianId === user.id || i.technicianId === null)
        );
        console.log('[DEBUG] TECNICO filtered count:', tecnicoFiltered.length);
        console.log('[DEBUG] TECNICO filtered interventions:', tecnicoFiltered.map(i => i.description));
        return tecnicoFiltered;
      default:
        return [];
    }
  }, [user, interventionsData]);

  const appointments = useMemo(() => {
    if (!user) return [];
    const visibleIds = new Set(interventions.map(i => i.id));
    return appointmentsData.filter(a =>
      a.interventionId ? visibleIds.has(a.interventionId) : true
    );
  }, [user, appointmentsData, interventions]);

  const companies = useMemo(() => {
    if (!user) return [];
    const role = user.role?.toLowerCase();
    if (role?.toUpperCase() === 'MASTER') return companiesData;
    if (role?.toUpperCase() === 'DITTA') return companiesData.filter(c => c.id === user.companyId);
    return [];
  }, [user, companiesData]);

  const users = useMemo(() => {
    if (!user) return [];
    const role = user.role?.toLowerCase();
    if (role?.toUpperCase() === 'MASTER') return usersData;
    if (role?.toUpperCase() === 'DITTA') return usersData.filter(u => u.companyId === user.companyId);
    return [];
  }, [user, usersData]);

  const addIntervention = useCallback((intervention: Omit<Intervention, 'id' | 'number' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newIntervention: Intervention = {
      ...intervention,
      id: generateId(),
      number: generateInterventionNumber(),
      createdAt: now,
      updatedAt: now,
    };
    setInterventionsData(prev => [newIntervention, ...prev]);
  }, []);

  const updateIntervention = useCallback((id: string, updates: Partial<Intervention>) => {
    setInterventionsData(prev =>
      prev.map(i => (i.id === id ? { ...i, ...updates, updatedAt: Date.now() } : i))
    );
  }, []);

  const deleteIntervention = useCallback((id: string) => {
    setInterventionsData(prev => prev.filter(i => i.id !== id));
  }, []);

  const bulkAssignToCompany = useCallback((interventionIds: string[], companyId: string, companyName: string) => {
    const now = Date.now();
    setInterventionsData(prev =>
      prev.map(i =>
        interventionIds.includes(i.id)
          ? { 
              ...i, 
              companyId, 
              companyName, 
              assignedAt: now,
              assignedBy: 'Admin',
              status: 'assegnato' as const,
              updatedAt: now,
            }
          : i
      )
    );
  }, []);

  const unassignedInterventions = useMemo(() => {
    return interventionsData.filter(i => !i.companyId);
  }, [interventionsData]);

  const addAppointment = useCallback((appointment: Appointment) => {
    setAppointmentsData(prev => [...prev, { ...appointment, id: appointment.id || generateId() }]);
  }, []);

  const updateAppointment = useCallback((id: string, updates: Partial<Appointment>) => {
    setAppointmentsData(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const deleteAppointment = useCallback((id: string) => {
    setAppointmentsData(prev => prev.filter(a => a.id !== id));
  }, []);

  const getInterventionById = useCallback(
    (id: string) => interventionsData.find(i => i.id === id),
    [interventionsData]
  );

  const addCompany = useCallback((company: Omit<Company, 'id' | 'createdAt'>): string => {
    const companyId = generateId();
    const newCompany: Company = {
      ...company,
      id: companyId,
      createdAt: Date.now(),
    };
    setCompaniesData(prev => {
      const updated = [...prev, newCompany];
      const toSave = updated.filter(c => !initialCompanies.find(ic => ic.id === c.id));
      console.log('[SAVE IMMEDIATE] Saving company:', newCompany.name, 'with id:', companyId);
      AsyncStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(toSave))
        .then(() => console.log('[SAVE IMMEDIATE] Company saved'))
        .catch(err => console.error('[SAVE IMMEDIATE] Error:', err));
      return updated;
    });
    return companyId;
  }, []);

  const updateCompany = useCallback((id: string, updates: Partial<Company>) => {
    setCompaniesData(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCompany = useCallback((id: string) => {
    setCompaniesData(prev => prev.filter(c => c.id !== id));
  }, []);

  const addUser = useCallback((user: Omit<User, 'id' | 'createdAt'>, existingId?: string) => {
    const newUser: User = {
      ...user,
      id: existingId || generateId(),
      createdAt: Date.now(),
    };
    setUsersData(prev => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsersData(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsersData(prev => prev.filter(u => u.id !== id));
  }, []);

  const getCompanyById = useCallback(
    (id: string) => companiesData.find(c => c.id === id),
    [companiesData]
  );

  const getUsersByCompany = useCallback(
    (companyId: string) => usersData.filter(u => u.companyId === companyId),
    [usersData]
  );

  const getGlobalStats = useCallback(() => {
    const byStatus: Record<string, number> = {};
    const byCompanyMap: Record<string, { companyName: string; count: number }> = {};

    interventionsData.forEach(i => {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      if (i.companyId) {
        if (!byCompanyMap[i.companyId]) {
          byCompanyMap[i.companyId] = { companyName: i.companyName || 'Senza Ditta', count: 0 };
        }
        byCompanyMap[i.companyId].count++;
      }
    });

    const byCompany = Object.entries(byCompanyMap).map(([companyId, data]) => ({
      companyId,
      companyName: data.companyName,
      count: data.count,
    }));

    const unassignedCount = interventionsData.filter(i => !i.companyId).length;

    return {
      totalInterventions: interventionsData.length,
      byStatus,
      byCompany,
      totalCompanies: companiesData.length,
      totalTechnicians: usersData.filter(u => u.role?.toUpperCase() === 'TECNICO').length,
      unassignedCount,
    };
  }, [interventionsData, companiesData, usersData]);

  return (
    <AppContext.Provider
      value={{
        interventions,
        appointments,
        companies,
        users,
        allInterventionsCount: interventionsData.length,
        unassignedInterventions,
        isRefreshing,
        refreshFromServer,
        addIntervention,
        updateIntervention,
        deleteIntervention,
        bulkAssignToCompany,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        getInterventionById,
        addCompany,
        updateCompany,
        deleteCompany,
        addUser,
        updateUser,
        deleteUser,
        getCompanyById,
        getUsersByCompany,
        getAllInterventionsData: () => interventionsData,
        getGlobalStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
