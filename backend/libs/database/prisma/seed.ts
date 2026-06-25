import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const UNITS: Array<{ unitCode: string; unit: string }> = [
  { unitCode: '01', unit: 'kg' },
  { unitCode: '02', unit: 'm²' },
  { unitCode: '03', unit: '把' },
  { unitCode: '04', unit: '包' },
  { unitCode: '05', unit: '份' },
  { unitCode: '06', unit: '个' },
  { unitCode: '07', unit: '罐' },
  { unitCode: '08', unit: '盒' },
  { unitCode: '09', unit: '件' },
  { unitCode: '10', unit: '卷' },
  { unitCode: '11', unit: '米' },
  { unitCode: '12', unit: '啤' },
  { unitCode: '13', unit: '片' },
  { unitCode: '14', unit: '瓶' },
  { unitCode: '15', unit: '双' },
  { unitCode: '16', unit: '台' },
  { unitCode: '17', unit: '套' },
  { unitCode: '18', unit: '条' },
  { unitCode: '19', unit: '桶' },
  { unitCode: '20', unit: '箱' },
  { unitCode: '21', unit: '张' },
  { unitCode: '22', unit: '支' },
  { unitCode: '23', unit: '对' },
  { unitCode: '24', unit: '辆' },
  { unitCode: '25', unit: '袋' },
  { unitCode: '26', unit: '筒' },
  { unitCode: '27', unit: '付' },
  { unitCode: '28', unit: '块' },
  { unitCode: '29', unit: '本' },
  { unitCode: '30', unit: '码' },
  { unitCode: '31', unit: '颗' },
  { unitCode: '32', unit: '根' },
];

const MATERIAL_CODE_RULES: Array<{
  codePrefix: string;
  explainContent: string;
}> = [
  { codePrefix: 'CW', explainContent: '宠物用品' },
  { codePrefix: 'FL', explainContent: 'Suministros Auxiliares辅料' },
  { codePrefix: 'GJ', explainContent: 'Herramienta工具' },
  { codePrefix: 'GL', explainContent: '钢料acero' },
  { codePrefix: 'JIM', explainContent: '无' },
  { codePrefix: 'KGFL', explainContent: '客供物料por el cliente' },
  { codePrefix: 'LXCC', explainContent: '无' },
  { codePrefix: 'LXCS', explainContent: '无' },
  { codePrefix: 'MFT', explainContent: '无' },
  { codePrefix: 'MHA', explainContent: '无' },
  { codePrefix: 'MJ', explainContent: 'Molde模具/模架' },
  { codePrefix: 'MPO', explainContent: '无' },
  { codePrefix: 'NCO', explainContent: '无' },
  { codePrefix: 'NIC', explainContent: '无' },
  { codePrefix: 'NPO', explainContent: '无' },
  { codePrefix: 'RC', explainContent: '日常办公' },
  { codePrefix: 'SB', explainContent: 'Equipo设备' },
  { codePrefix: 'SP', explainContent: 'SP' },
  { codePrefix: 'YL', explainContent: 'Materia prima原料' },
];

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

  for (const { unitCode, unit } of UNITS) {
    await prisma.unit.upsert({
      where: { unitCode },
      update: {},
      create: { unitCode, unit },
    });
  }

  console.log(`Seed completed: ${UNITS.length} units upserted`);

  for (const { codePrefix, explainContent } of MATERIAL_CODE_RULES) {
    await prisma.materialCodeRule.upsert({
      where: { codePrefix },
      update: {},
      create: { codePrefix, explainContent },
    });
  }

  console.log(
    `Seed completed: ${MATERIAL_CODE_RULES.length} material code rules upserted`,
  );

  // 手机编码序列表初始化（当前最大值 1204，新手机从 1205 开始）
  await prisma.phoneCodeSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, currentValue: 1204 },
  });

  console.log('Seed completed: phone code sequence initialized (currentValue=1204)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
