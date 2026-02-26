
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prismaClient.js';

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@company.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create Logistics user
  const logisticsPassword = await bcrypt.hash('logistics123', 10);
  const logistics = await prisma.user.create({
    data: {
      name: 'Logistics Manager',
      email: 'logistics@company.com',
      password: logisticsPassword,
      role: 'LOGISTICS',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Logistics user created:', logistics.email);

  // Create Team Lead
  const leadPassword = await bcrypt.hash('lead123', 10);
  const teamLead = await prisma.user.create({
    data: {
      name: 'John Lead',
      email: 'lead@company.com',
      password: leadPassword,
      role: 'LEAD',
      status: 'ACTIVE',
    },
  });

  // Create Team
  const team = await prisma.team.create({
    data: {
      name: 'Engineering',
      leadId: teamLead.id,
    },
  });

  // Update team lead with teamId
  await prisma.user.update({
    where: { id: teamLead.id },
    data: { teamId: team.id },
  });
  console.log('✅ Team Lead created:', teamLead.email);

  // Create 5 employees in the team
  const employeePassword = await bcrypt.hash('emp123', 10);
  for (let i = 1; i <= 5; i++) {
    await prisma.user.create({
      data: {
        name: `Employee ${i}`,
        email: `employee${i}@company.com`,
        password: employeePassword,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        teamId: team.id,
      },
    });
  }
  console.log('✅ Created 5 employees');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('Admin: admin@company.com / admin123');
  console.log('Lead: lead@company.com / lead123');
  console.log('Employee: employee1@company.com / emp123');
  console.log('Logistics: logistics@company.com / logistics123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });