import { Injectable } from '@nestjs/common';
import { PrismaService } from '@eims/database';

@Injectable()
export class OaSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchMaterial(keyword: string) {
    if (!keyword) return [];

    const searchPattern = keyword.split(/\s+/).join('%');

    return this.prisma.erpMaterial.findMany({
      where: {
        OR: [
          { code: { contains: keyword, mode: 'insensitive' } },
          { name: { contains: searchPattern, mode: 'insensitive' } },
        ],
      },
      select: {
        code: true,
        name: true,
        specification: true,
      },
      take: 15,
    });
  }

  async searchSupplier(keyword: string) {
    if (!keyword) return [];

    return this.prisma.erpSupplier.findMany({
      where: {
        OR: [
          { code: { contains: keyword } },
          { name: { contains: keyword } },
        ],
      },
      select: {
        code: true,
        name: true,
      },
      take: 10,
    });
  }

  async searchUnit(keyword?: string) {
    if (keyword) {
      return this.prisma.erpUnit.findMany({
        where: {
          OR: [
            { code: { contains: keyword } },
            { name: { contains: keyword } },
          ],
        },
        select: {
          code: true,
          name: true,
        },
        take: 20,
      });
    }

    return this.prisma.erpUnit.findMany({
      select: {
        code: true,
        name: true,
      },
      take: 50,
    });
  }

  async searchTax(keyword?: string) {
    if (keyword) {
      return this.prisma.erpTax.findMany({
        where: {
          OR: [
            { code: { contains: keyword } },
            { name: { contains: keyword } },
          ],
        },
        select: {
          code: true,
          name: true,
          rateValue: true,
        },
        take: 20,
      });
    }

    return this.prisma.erpTax.findMany({
      select: {
        code: true,
        name: true,
        rateValue: true,
      },
      take: 50,
    });
  }
}
