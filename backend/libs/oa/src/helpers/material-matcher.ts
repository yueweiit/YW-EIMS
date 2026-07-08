import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@eims/database';

const INVALID_CODES = new Set([
  '/', 'S/C', '无', 'N/A', 'NA', '0', '-', '\\', 'S/C.', 'S/C ', 'S/C\n',
]);

const FALLBACK_MATERIAL_CODE = 'RC000079';
const FALLBACK_VENDOR_CODE = 'GYS00029';
const ERP_UNIT_CODE = '06';
const ERP_TAX_CODE = 'VATR1';

const UNIT_MAP: Record<string, string> = {
  litro: '升', l: '升', pieza: '个', pz: '个', pza: '个',
  kg: '千克', kilo: '千克', metro: '米', m: '米',
  caja: '箱', paquete: '包', rollo: '卷',
};

@Injectable()
export class MaterialMatcher {
  private readonly logger = new Logger(MaterialMatcher.name);

  constructor(private readonly prisma: PrismaService) {}

  isInvalidCode(code: string): boolean {
    if (!code) return true;
    const clean = code.trim().toUpperCase();
    return INVALID_CODES.has(clean) || clean === '⚠️需手动匹配';
  }

  async getMaterialInfo(name: string): Promise<{ code: string; name: string } | null> {
    if (!name) return null;

    // Exact match
    const exact = await this.prisma.erpMaterial.findFirst({ where: { name } });
    if (exact) return { code: exact.code, name: exact.name! };

    // ILIKE partial match
    const partial = await this.prisma.erpMaterial.findMany({
      where: { name: { contains: name, mode: 'insensitive' } },
      take: 2,
    });
    if (partial.length === 1) return { code: partial[0].code, name: partial[0].name! };
    if (partial.length > 1) return null;

    // Progressive substring shortening
    const cleanName = name.replace(/[\-_\,\(\)\[\]]/g, ' ');
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      for (let i = parts.length - 1; i > 0; i--) {
        const shortName = parts.slice(0, i).join(' ');
        if (shortName.length < 4) continue;

        const subResults = await this.prisma.erpMaterial.findMany({
          where: { name: { contains: shortName, mode: 'insensitive' } },
          take: 2,
        });
        if (subResults.length === 1) return { code: subResults[0].code, name: subResults[0].name! };
        if (subResults.length > 1) return null;
      }
    }

    return null;
  }

  async getMaterialCode(name: string): Promise<string> {
    if (!name) return FALLBACK_MATERIAL_CODE;

    const info = await this.getMaterialInfo(name);
    return info?.code || FALLBACK_MATERIAL_CODE;
  }

  async getSupplierCode(name: string): Promise<string> {
    if (!name) return FALLBACK_VENDOR_CODE;

    const exact = await this.prisma.erpSupplier.findFirst({ where: { name } });
    if (exact) return exact.code;

    const partial = await this.prisma.erpSupplier.findFirst({
      where: { name: { contains: name } },
    });
    if (partial) return partial.code;

    return FALLBACK_VENDOR_CODE;
  }

  async getUnitCode(name: string): Promise<string> {
    if (!name) return ERP_UNIT_CODE;

    const cleanName = name.trim().toLowerCase();
    const searchName = UNIT_MAP[cleanName] || name;

    const exact = await this.prisma.erpUnit.findFirst({ where: { name: searchName } });
    if (exact) return exact.code;

    const partial = await this.prisma.erpUnit.findFirst({
      where: { name: { contains: searchName, mode: 'insensitive' } },
    });
    if (partial) return partial.code;

    return ERP_UNIT_CODE;
  }

  async getTaxCode(name: string): Promise<string> {
    if (!name) return ERP_TAX_CODE;

    const exact = await this.prisma.erpTax.findFirst({ where: { name } });
    if (exact) return exact.code;

    const partial = await this.prisma.erpTax.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } },
    });
    if (partial) return partial.code;

    return ERP_TAX_CODE;
  }

  async resolveEmployeeName(userid: string): Promise<string> {
    if (!userid) return '系统';
    const emp = await this.prisma.dingEmployee.findUnique({
      where: { dingUserid: userid },
    });
    return emp?.empName || userid;
  }

  async resolveDepartmentName(deptId: string): Promise<string> {
    if (!deptId) return '--';
    const id = parseInt(deptId, 10);
    if (isNaN(id)) return deptId;
    const dept = await this.prisma.dingDepartment.findUnique({
      where: { deptId: id },
    });
    return dept?.deptName || deptId;
  }
}
