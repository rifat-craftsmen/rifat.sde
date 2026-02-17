# Meal Planner System

A full-stack meal planning application built with React, Express, TypeScript, and PostgreSQL.

## Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- npm  

## Local Setup

### 1. Start PostgreSQL Database

```bash
docker-compose up -d
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file (copy from .env.example and update values)
cp .env.example .env

# Update .env with:
DATABASE_URL="postgresql://mealplanner:dev_password_2024@localhost:5432/meal_planner_db"
JWT_SECRET="your-secret-key-here"
NODE_ENV="development"
PORT=5000
CORS_ORIGIN="http://localhost:5173"

# Setup database
npm run db:push
npm run db:generate

# Start backend server
npm run dev
```

Backend runs on http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env file with:
VITE_API_URL=http://localhost:5000/api

# Start frontend server
npm run dev
```

Frontend runs on http://localhost:5173

## Available Scripts

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run db:studio` - Open Prisma Studio

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
