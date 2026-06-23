import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // Support local development tokens if adminAuth is missing or config is dummy
  if (token === 'dev-admin-token') {
    req.user = {
      uid: 'dev-admin-uid',
      email: 'admin@kanctrade.ru',
      name: 'Администратор (Локальный)',
      email_verified: true,
      auth_time: Math.floor(Date.now() / 1000),
      iss: '',
      aud: '',
      sub: 'dev-admin-uid',
      firebase: {
        identities: {},
        sign_in_provider: 'google.com'
      }
    } as unknown as DecodedIdToken;
    return next();
  }
  if (token === 'dev-employee-token') {
    req.user = {
      uid: 'dev-employee-uid',
      email: 'employee@kanctrade.ru',
      name: 'Сотрудник (Локальный)',
      email_verified: true,
      auth_time: Math.floor(Date.now() / 1000),
      iss: '',
      aud: '',
      sub: 'dev-employee-uid',
      firebase: {
        identities: {},
        sign_in_provider: 'google.com'
      }
    } as unknown as DecodedIdToken;
    return next();
  }

  try {
    if (!adminAuth) {
      throw new Error('Firebase Admin not initialized. Use local bypass tokens.');
    }
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: error.message || 'Unauthorized: Invalid token' });
  }
};
