export const TYPE_LABELS: Record<string, string> = {
  installazione: 'Installazione',
  installation: 'Installazione',
  sopralluogo: 'Sopralluogo',
  verifica: 'Verifica',
  verifica_programmata: 'Verifica Programmata',
  manutenzione: 'Manutenzione',
  maintenance: 'Manutenzione',
  riparazione: 'Riparazione',
  repair: 'Riparazione',
  ispezione: 'Ispezione',
  inspection: 'Ispezione',
  pulizia: 'Pulizia',
  cleaning: 'Pulizia',
  assistenza: 'Assistenza',
  collaudo: 'Collaudo',
  post_installazione: 'Post Installazione',
  richiamo: 'Richiamo',
  consulenza: 'Consulenza',
  preventivo: 'Preventivo',
  altro: 'Altro',
  other: 'Altro',
};

export const PRIORITY_LABELS: Record<string, string> = {
  bassa: 'Bassa',
  low: 'Bassa',
  normale: 'Normale',
  normal: 'Normale',
  media: 'Media',
  medium: 'Media',
  alta: 'Alta',
  high: 'Alta',
  urgente: 'Urgente',
  urgent: 'Urgente',
  critica: 'Critica',
  critical: 'Critica',
};

export const STATUS_LABELS: Record<string, string> = {
  nuovo: 'Nuovo',
  new: 'Nuovo',
  da_assegnare: 'Da Assegnare',
  assegnato: 'Assegnato',
  assigned: 'Assegnato',
  pending: 'In Attesa',
  in_attesa: 'In Attesa',
  appuntamento_fissato: 'Appuntamento Fissato',
  programmato: 'Programmato',
  scheduled: 'Programmato',
  verifica_programmata: 'Verifica Programmata',
  in_corso: 'In Corso',
  in_progress: 'In Corso',
  in_lavorazione: 'In Lavorazione',
  sospeso: 'Sospeso',
  suspended: 'Sospeso',
  in_attesa_materiale: 'In Attesa Materiale',
  in_attesa_cliente: 'In Attesa Cliente',
  richiamo: 'Richiamo',
  post_installazione: 'Post Installazione',
  completato: 'Completato',
  completed: 'Completato',
  chiuso: 'Chiuso',
  closed: 'Chiuso',
  annullato: 'Annullato',
  cancelled: 'Annullato',
  rifiutato: 'Rifiutato',
  rejected: 'Rifiutato',
};

export const STATUS_CLASSES: Record<string, string> = {
  nuovo: 'pending',
  new: 'pending',
  da_assegnare: 'pending',
  assegnato: 'assigned',
  assigned: 'assigned',
  pending: 'pending',
  in_attesa: 'pending',
  appuntamento_fissato: 'assigned',
  programmato: 'assigned',
  scheduled: 'assigned',
  verifica_programmata: 'assigned',
  in_corso: 'in_progress',
  in_progress: 'in_progress',
  in_lavorazione: 'in_progress',
  sospeso: 'pending',
  suspended: 'pending',
  in_attesa_materiale: 'pending',
  in_attesa_cliente: 'pending',
  richiamo: 'in_progress',
  post_installazione: 'in_progress',
  completato: 'completed',
  completed: 'completed',
  chiuso: 'completed',
  closed: 'completed',
  annullato: 'cancelled',
  cancelled: 'cancelled',
  rifiutato: 'cancelled',
  rejected: 'cancelled',
};

export const PRIORITY_CLASSES: Record<string, string> = {
  bassa: 'low',
  low: 'low',
  normale: 'medium',
  normal: 'medium',
  media: 'medium',
  medium: 'medium',
  alta: 'high',
  high: 'high',
  urgente: 'urgent',
  urgent: 'urgent',
  critica: 'urgent',
  critical: 'urgent',
};

export function getStatusLabel(status: string | undefined | null): string {
  const key = status?.toLowerCase() || 'pending';
  const label = STATUS_LABELS[key];
  if (!label) {
    console.warn('[LABELS] Unknown status:', status);
  }
  return label || status || 'In Attesa';
}

export function getStatusClass(status: string | undefined | null): string {
  const key = status?.toLowerCase() || 'pending';
  const cls = STATUS_CLASSES[key];
  if (!cls) {
    console.warn('[LABELS] Unknown status class:', status);
  }
  return cls || 'pending';
}

export function getPriorityLabel(priority: string | undefined | null): string {
  const key = priority?.toLowerCase() || 'normale';
  const label = PRIORITY_LABELS[key];
  if (!label) {
    console.warn('[LABELS] Unknown priority:', priority);
  }
  return label || priority || 'Normale';
}

export function getPriorityClass(priority: string | undefined | null): string {
  const key = priority?.toLowerCase() || 'medium';
  const cls = PRIORITY_CLASSES[key];
  if (!cls) {
    console.warn('[LABELS] Unknown priority class:', priority);
  }
  return cls || 'medium';
}

export function getTypeLabel(type: string | undefined | null): string {
  const key = type?.toLowerCase() || 'altro';
  const label = TYPE_LABELS[key];
  if (!label) {
    console.warn('[LABELS] Unknown type:', type);
  }
  return label || type || 'Altro';
}
