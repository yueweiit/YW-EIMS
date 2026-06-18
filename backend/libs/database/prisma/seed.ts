import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { userName: 'superadmin' },
    update: {},
    create: {
      userName: 'superadmin',
      password: hashedPassword,
      realName: '超级管理员',
      roles: ['R_SUPER'],
      buttons: [],
      status: '1',
      createBy: 'system',
    },
  });

  console.log('Seed completed: superadmin created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
