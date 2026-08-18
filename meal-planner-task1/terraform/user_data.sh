#!/bin/bash
set -e
exec > /var/log/user-data.log 2>&1

# ─── 1. Install Node.js, PostgreSQL, Git ───────────────────────────────────────
dnf install -y nodejs npm postgresql15-server postgresql15 git

# ─── 2. Setup PostgreSQL ───────────────────────────────────────────────────────
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql -c "CREATE USER trainee_rifat WITH PASSWORD 'trainee_rifat';"
sudo -u postgres psql -c "CREATE DATABASE trainee_rifat_ec2_postgres OWNER trainee_rifat;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE trainee_rifat_ec2_postgres TO trainee_rifat;"

# Fix pg_hba.conf: ident → md5
sed -i 's/host    all             all             127.0.0.1\/32            ident/host    all             all             127.0.0.1\/32            md5/' /var/lib/pgsql/data/pg_hba.conf
sed -i 's/host    all             all             ::1\/128                 ident/host    all             all             ::1\/128                 md5/' /var/lib/pgsql/data/pg_hba.conf

systemctl restart postgresql

# ─── 3. Install NVM + Node 24 for ec2-user ─────────────────────────────────────
su - ec2-user -c '
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  nvm install 24
  nvm use 24
  nvm alias default 24
'

# ─── 4. Clone repo ─────────────────────────────────────────────────────────────
su - ec2-user -c '
  git clone --branch task1-ec2 --single-branch https://github.com/rifat-craftsmen/rifat.sde.git /home/ec2-user/rifat.sde
'

# ─── 5. Create .env ────────────────────────────────────────────────────────────
cat > /home/ec2-user/rifat.sde/meal-planner-task1/backend/.env << 'EOF'
DATABASE_URL="postgresql://trainee_rifat:trainee_rifat@localhost:5432/trainee_rifat_ec2_postgres"
JWT_SECRET="trainee-rifat-jwt-secret"
NODE_ENV="production"
PORT=5000
CORS_ORIGIN="*"
EOF

chown ec2-user:ec2-user /home/ec2-user/rifat.sde/meal-planner-task1/backend/.env

# ─── 6. Install deps, generate prisma, push schema ────────────────────────────
su - ec2-user -c '
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  cd /home/ec2-user/rifat.sde/meal-planner-task1/backend

  npm install
  npx prisma generate
  npx prisma db push
'

# ─── 7. Install PM2 + tsx globally ─────────────────────────────────────────────
su - ec2-user -c '
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  npm install -g pm2 tsx
'

# ─── 8. Start backend with PM2 ─────────────────────────────────────────────────
su - ec2-user -c '
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  cd /home/ec2-user/rifat.sde/meal-planner-task1/backend
  pm2 start --name backend --interpreter tsx src/server.ts
  pm2 save
  pm2 startup systemd -u ec2-user --hp /home/ec2-user | tail -1 | bash
'
