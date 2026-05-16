import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  const password = await bcrypt.hash('Password123!', 12);

  const users = [
    {
      email: 'admin@uploadcore.com',
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE' as const,
    },
    {
      email: 'alice@uploadcore.com',
      firstName: 'Alice',
      lastName: 'Smith',
      status: 'ACTIVE' as const,
    },
    {
      email: 'bob@uploadcore.com',
      firstName: 'Bob',
      lastName: 'Jones',
      status: 'ACTIVE' as const,
    },
    {
      email: 'carol@uploadcore.com',
      firstName: 'Carol',
      lastName: 'White',
      status: 'ACTIVE' as const,
    },
    {
      email: 'pending@uploadcore.com',
      firstName: 'Pending',
      lastName: 'User',
      status: 'PENDING' as const,
    },
    {
      email: 'suspended@uploadcore.com',
      firstName: 'Suspended',
      lastName: 'User',
      status: 'SUSPENDED' as const,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password },
    });
  }

  console.log(`✅ Seeded ${users.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
