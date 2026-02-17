import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Neon DB Setup (commented out for local Docker Postgres)
// import { PrismaNeon } from '@prisma/adapter-neon';
// const neonAdapter = new PrismaNeon({ connectionString });
// export const prisma = new PrismaClient({ adapter: neonAdapter });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from .env");
}

// Local Docker Postgres setup with pg adapter (required for Prisma 7)
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
  errorFormat: 'pretty',
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await pool.end();
});