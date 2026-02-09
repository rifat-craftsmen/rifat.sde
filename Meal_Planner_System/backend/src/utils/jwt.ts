import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface JwtPayload {
  userId: number;
  email: string;
  role: Role;
  teamId?: number;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};