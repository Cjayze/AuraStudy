import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb, User } from './db';
import { adminAuth } from '../src/lib/firebase-admin.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'aurastudy-super-secret-jwt-key-2026';
const JWT_EXPIRES_IN = '7d';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Yêu cầu Bearer Token xác thực để truy cập API.'
    });
  }

  // 1. First try custom JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const db = getDb();
    const user = db.users.find(u => u.id === decoded.id && u.is_active);

    if (user) {
      req.user = user;
      return next();
    }
  } catch {
    // Continue to Firebase ID token check
  }

  // 2. Try Firebase ID token
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const db = getDb();
    let user = db.users.find(u => u.id === decodedToken.uid || u.email.toLowerCase() === (decodedToken.email || '').toLowerCase());

    if (!user) {
      user = {
        id: decodedToken.uid,
        email: decodedToken.email || `${decodedToken.uid}@aurastudy.user`,
        password_hash: '',
        full_name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Aura Learner'),
        role: 'student',
        avatar_url: decodedToken.picture,
        is_active: true,
        created_at: new Date().toISOString()
      };
      db.users.push(user);
    }

    req.user = user;
    return next();
  } catch {
    return res.status(403).json({
      status: 'error',
      message: 'Token xác thực không hợp lệ hoặc đã hết hạn.'
    });
  }
}

export function requireRole(role: 'student' | 'admin') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        status: 'error',
        message: `Truy cập bị từ chối. Chỉ tài khoản ${role.toUpperCase()} mới có quyền thực hiện.`
      });
    }
    next();
  };
}
