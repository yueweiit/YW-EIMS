import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

const EXTERNAL_SYSTEMS = [
  {
    code: 'budget',
    name: '预算系统',
    description: '预算编制、执行和分析管理',
    icon: 'mdi:finance',
    color: '#18a058',
    entryUrl: 'http://8.135.70.130:8002/',
    authMode: 'link',
    category: '业务系统',
    sort: 10,
  },
  {
    code: 'erp',
    name: 'ERP系统',
    description: '订单、采购、库存和财务业务管理',
    icon: 'mdi:domain',
    color: '#2080f0',
    entryUrl: 'http://192.168.5.202:8001/',
    authMode: 'link',
    category: '业务系统',
    sort: 20,
  },
  {
    code: 'mes',
    name: 'MES系统',
    description: '生产计划、制造过程和现场执行管理',
    icon: 'mdi:factory',
    color: '#f0a020',
    entryUrl: 'https://lemos-case.com/mes/',
    authMode: 'link',
    category: '业务系统',
    sort: 30,
  },
  {
    code: 'crm',
    name: 'CRM系统',
    description: '客户、商机和销售过程管理',
    icon: 'mdi:account-group',
    color: '#d03050',
    entryUrl: 'https://lemos-case.com/crm/',
    authMode: 'link',
    category: '业务系统',
    sort: 40,
  },
  {
    code: 'lemos',
    name: 'lemos系统',
    description: '企业综合业务平台',
    icon: 'mdi:web',
    color: '#8a2be2',
    entryUrl: 'https://lemos-case.com/',
    authMode: 'link',
    category: '业务系统',
    sort: 50,
  },
];

const SYSTEM_ROLES = [
  {
    code: 'R_SUPER',
    name: '超级管理员',
    description: '拥有 EIMS 全部系统和功能权限',
    builtIn: true,
    sort: 0,
  },
  {
    code: 'R_ADMIN',
    name: '管理员',
    description: '负责系统配置、用户和权限维护',
    builtIn: true,
    sort: 10,
  },
  {
    code: 'R_USER',
    name: '普通用户',
    description: '访问日常业务功能',
    builtIn: true,
    sort: 20,
  },
  {
    code: 'R_FINANCE',
    name: '财务',
    description: '财务相关业务人员',
    builtIn: true,
    sort: 30,
  },
  {
    code: 'R_SALES',
    name: '销售',
    description: '销售相关业务人员',
    builtIn: true,
    sort: 40,
  },
  {
    code: 'R_PROD',
    name: '生产',
    description: '生产相关业务人员',
    builtIn: true,
    sort: 50,
  },
];

const EIMS_MENU_PERMISSIONS = [
  ['eims:material:code-rule', '编码规则', '/material/code-rule', 10],
  ['eims:material:material', '物料主数据', '/material/material', 20],
  ['eims:material:unit', '单位管理', '/material/unit', 30],
  ['eims:mold:color', '颜色管理', '/mold-product/color', 40],
  ['eims:mold:erpnext-mapping', 'ERPNext 映射', '/mold-product/erpnext-mapping', 50],
  ['eims:mold:mold', '模具管理', '/mold-product/mold', 60],
  ['eims:mold:mold-code', '模具编码', '/mold-product/mold-code', 70],
  ['eims:mold:mold-material', '材质管理', '/mold-product/mold-material', 80],
  ['eims:mold:phone-model', '手机型号', '/mold-product/phone-model', 90],
  ['eims:mold:product', '产品管理', '/mold-product/product', 100],
  ['eims:mold:product-code', '产品编码', '/mold-product/product-code', 110],
  ['eims:oa:approval', 'OA 审批', '/oa/approval', 120],
  ['eims:oa:box-label', '箱唛打印', '/oa/box-label', 130],
  ['eims:system:erpnext-sync-log', 'ERPNext 同步日志', '/system/erpnext-sync-log', 140],
  ['eims:system:external-system', '外部系统目录', '/system/external-system', 150],
  ['eims:system:oauth2-binding', 'OAuth2 账号绑定', '/system/oauth2-binding', 160],
  ['eims:system:oauth2-client', 'OAuth2 应用管理', '/system/oauth2-client', 170],
  ['eims:system:permission', '功能权限', '/system/permission', 180],
  ['eims:system:role', '角色管理', '/system/role', 190],
  ['eims:system:user', '用户管理', '/system/user', 200],
  ['eims:system:audit', '安全审计', '/system/audit', 210],
] as const;

const EIMS_BUTTON_PERMISSIONS = [
  ['eims:material:code-rule:create', '编码规则新增', 'eims:material:code-rule'],
  ['eims:material:code-rule:update', '编码规则编辑', 'eims:material:code-rule'],
  ['eims:material:code-rule:delete', '编码规则删除', 'eims:material:code-rule'],
  ['eims:material:material:create', '物料新增', 'eims:material:material'],
  ['eims:material:material:update', '物料编辑', 'eims:material:material'],
  ['eims:material:material:delete', '物料删除', 'eims:material:material'],
  ['eims:material:material:import', '物料导入', 'eims:material:material'],
  ['eims:material:material:sync', '物料同步 ERP', 'eims:material:material'],
  ['eims:material:material:import-existing', '已有物料导入', 'eims:material:material'],
  ['eims:material:unit:create', '单位新增', 'eims:material:unit'],
  ['eims:material:unit:update', '单位编辑', 'eims:material:unit'],
  ['eims:material:unit:delete', '单位删除', 'eims:material:unit'],
  ['eims:mold:color:create', '颜色新增', 'eims:mold:color'],
  ['eims:mold:color:update', '颜色编辑', 'eims:mold:color'],
  ['eims:mold:color:delete', '颜色删除', 'eims:mold:color'],
  ['eims:mold:mold-code:create', '模具编码新增', 'eims:mold:mold-code'],
  ['eims:mold:mold-code:update', '模具编码编辑', 'eims:mold:mold-code'],
  ['eims:mold:mold-code:delete', '模具编码删除', 'eims:mold:mold-code'],
  ['eims:mold:mold-material:create', '材质新增', 'eims:mold:mold-material'],
  ['eims:mold:mold-material:update', '材质编辑', 'eims:mold:mold-material'],
  ['eims:mold:mold-material:delete', '材质删除', 'eims:mold:mold-material'],
  ['eims:mold:mold:create', '模具新增', 'eims:mold:mold'],
  ['eims:mold:mold:update', '模具编辑', 'eims:mold:mold'],
  ['eims:mold:mold:delete', '模具删除', 'eims:mold:mold'],
  ['eims:mold:mold:import', '模具导入', 'eims:mold:mold'],
  ['eims:mold:phone-model:create', '手机型号新增', 'eims:mold:phone-model'],
  ['eims:mold:phone-model:update', '手机型号编辑', 'eims:mold:phone-model'],
  ['eims:mold:phone-model:delete', '手机型号删除', 'eims:mold:phone-model'],
  ['eims:mold:phone-model:batch-delete', '手机型号批量删除', 'eims:mold:phone-model'],
  ['eims:mold:product-code:create', '产品编码新增', 'eims:mold:product-code'],
  ['eims:mold:product-code:update', '产品编码编辑', 'eims:mold:product-code'],
  ['eims:mold:product-code:delete', '产品编码删除', 'eims:mold:product-code'],
  ['eims:mold:product:create', '产品新增', 'eims:mold:product'],
  ['eims:mold:product:update', '产品编辑', 'eims:mold:product'],
  ['eims:mold:product:delete', '产品删除', 'eims:mold:product'],
  ['eims:mold:product:import', '产品导入', 'eims:mold:product'],
  ['eims:mold:erpnext-mapping:create', 'ERPNext 映射新增', 'eims:mold:erpnext-mapping'],
  ['eims:mold:erpnext-mapping:update', 'ERPNext 映射编辑', 'eims:mold:erpnext-mapping'],
  ['eims:mold:erpnext-mapping:delete', 'ERPNext 映射删除', 'eims:mold:erpnext-mapping'],
  ['eims:oa:approval:sync', '审批同步 ERP', 'eims:oa:approval'],
  ['eims:system:user:create', '用户新增', 'eims:system:user'],
  ['eims:system:user:update', '用户编辑', 'eims:system:user'],
  ['eims:system:user:delete', '用户删除', 'eims:system:user'],
  ['eims:system:erpnext-sync-log:retry', '同步日志重试', 'eims:system:erpnext-sync-log'],
  ['eims:system:external-system:create', '外部系统新增', 'eims:system:external-system'],
  ['eims:system:external-system:update', '外部系统编辑', 'eims:system:external-system'],
  ['eims:system:external-system:delete', '外部系统删除', 'eims:system:external-system'],
  ['eims:system:oauth2-binding:create', '账号绑定新增', 'eims:system:oauth2-binding'],
  ['eims:system:oauth2-binding:update', '账号绑定编辑', 'eims:system:oauth2-binding'],
  ['eims:system:oauth2-binding:delete', '账号绑定删除', 'eims:system:oauth2-binding'],
  ['eims:system:oauth2-client:create', 'OAuth2 应用新增', 'eims:system:oauth2-client'],
  ['eims:system:oauth2-client:update', 'OAuth2 应用编辑', 'eims:system:oauth2-client'],
  ['eims:system:oauth2-client:delete', 'OAuth2 应用删除', 'eims:system:oauth2-client'],
  ['eims:system:oauth2-client:reset-secret', 'OAuth2 Secret 重置', 'eims:system:oauth2-client'],
  ['eims:system:role:create', '角色新增', 'eims:system:role'],
  ['eims:system:role:update', '角色编辑', 'eims:system:role'],
  ['eims:system:role:access', '角色权限配置', 'eims:system:role'],
  ['eims:system:role:delete', '角色删除', 'eims:system:role'],
  ['eims:system:permission:create', '功能权限新增', 'eims:system:permission'],
  ['eims:system:permission:update', '功能权限编辑', 'eims:system:permission'],
  ['eims:system:permission:delete', '功能权限删除', 'eims:system:permission'],
];

const BUSINESS_MENU_PERMISSION_CODES = EIMS_MENU_PERMISSIONS
  .filter(([code]) => !code.startsWith('eims:system:'))
  .map(([code]) => code);
const ALL_PERMISSION_CODES = [
  ...EIMS_MENU_PERMISSIONS.map(([code]) => code),
  ...EIMS_BUTTON_PERMISSIONS.map(([code]) => code),
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

  for (const system of EXTERNAL_SYSTEMS) {
    await prisma.externalSystem.upsert({
      where: { code: system.code },
      update: {},
      create: {
        ...system,
        allowedRoles: [],
        status: '1',
        createBy: 'system',
      },
    });
  }

  console.log(
    `Seed completed: ${EXTERNAL_SYSTEMS.length} portal systems upserted`,
  );

  for (const [code, name, routePath, sort] of EIMS_MENU_PERMISSIONS) {
    await prisma.systemPermission.upsert({
      where: { code },
      update: { name, type: 'menu', routePath, sort },
      create: {
        code,
        name,
        type: 'menu',
        routePath,
        sort,
        status: '1',
        createBy: 'system',
      },
    });
  }

  for (const [code, name, parentCode] of EIMS_BUTTON_PERMISSIONS) {
    await prisma.systemPermission.upsert({
      where: { code },
      update: { name, type: 'button', parentCode },
      create: {
        code,
        name,
        type: 'button',
        parentCode,
        sort: 1000,
        status: '1',
        createBy: 'system',
      },
    });
  }

  for (const roleDefinition of SYSTEM_ROLES) {
    const role = await prisma.systemRole.upsert({
      where: { code: roleDefinition.code },
      update: {
        name: roleDefinition.name,
        description: roleDefinition.description,
        builtIn: roleDefinition.builtIn,
        sort: roleDefinition.sort,
      },
      create: {
        ...roleDefinition,
        status: '1',
        createBy: 'system',
      },
    });

    if (roleDefinition.code === 'R_SUPER') continue;

    const existingPermissionCount = await prisma.systemRolePermission.count({
      where: { roleId: role.id },
    });
    if (existingPermissionCount === 0) {
      const permissionCodes =
        roleDefinition.code === 'R_ADMIN'
          ? ALL_PERMISSION_CODES
          : BUSINESS_MENU_PERMISSION_CODES;
      const permissions = await prisma.systemPermission.findMany({
        where: { code: { in: permissionCodes } },
        select: { id: true },
      });
      if (permissions.length > 0) {
        await prisma.systemRolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
        });
      }
    } else if (roleDefinition.code === 'R_ADMIN') {
      // Add newly introduced operation permissions without replacing the
      // existing manually maintained permission set.
      const existingPermissions = await prisma.systemRolePermission.findMany({
        where: { roleId: role.id },
        select: { permission: { select: { code: true } } },
      });
      const existingCodes = new Set(
        existingPermissions.map((item) => item.permission.code),
      );
      const missingPermissions = await prisma.systemPermission.findMany({
        where: {
          code: {
            in: ALL_PERMISSION_CODES.filter((code) => !existingCodes.has(code)),
          },
        },
        select: { id: true },
      });
      if (missingPermissions.length > 0) {
        await prisma.systemRolePermission.createMany({
          data: missingPermissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  console.log(
    `Seed completed: ${SYSTEM_ROLES.length} roles and ${ALL_PERMISSION_CODES.length} permissions upserted`,
  );

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

  console.log(
    'Seed completed: phone code sequence initialized (currentValue=1204)',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
