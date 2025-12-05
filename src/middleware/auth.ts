import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: 'master' | 'ditta' | 'tecnico';
    companyId?: number;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token non fornito' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as AuthRequest['user'];
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token non valido' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non autenticato' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permessi insufficienti' });
    }
    
    next();
  };
};
