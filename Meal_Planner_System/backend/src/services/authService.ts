import bcrypt from 'bcryptjs';
import { prisma } from '../config/prismaClient.js';
import { generateToken } from '../utils/jwt';

export const loginUser = async (email: string, password: string) => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      role: true,
      status: true,
      teamId: true,
    },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (user.status === 'INACTIVE') {
    throw new Error('Account is inactive');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Generate JWT
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    teamId: user.teamId || undefined,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
    },
  };
};