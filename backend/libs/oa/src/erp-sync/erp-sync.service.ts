import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@eims/database';
import { ErpService } from '../erp/erp.service';

@Injectable()
export class ErpSyncService {
  private readonly logger = new Logger(ErpSyncService.name);
  private isSyncingSuppliers = false;
  private isSyncingUnits = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly erpService: ErpService,
  ) {}

  @Cron(CronExpression.EVERY_4_HOURS)
  async syncSuppliersAndMaterials() {
    if (this.isSyncingSuppliers) {
      this.logger.warn('Suppliers/materials sync already in progress, skipping...');
      return;
    }

    this.isSyncingSuppliers = true;
    this.logger.log('Starting ERP suppliers and materials sync...');

    try {
      await this.syncSuppliers();
      await this.syncMaterials();
      this.logger.log('ERP suppliers and materials sync completed');
    } catch (error) {
      this.logger.error(`Suppliers/materials sync failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isSyncingSuppliers = false;
    }
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  async syncUnitsAndTaxRates() {
    if (this.isSyncingUnits) {
      this.logger.warn('Units/tax rates sync already in progress, skipping...');
      return;
    }

    this.isSyncingUnits = true;
    this.logger.log('Starting ERP units and tax rates sync...');

    try {
      await this.syncUnits();
      await this.syncTaxRates();
      this.logger.log('ERP units and tax rates sync completed');
    } catch (error) {
      this.logger.error(`Units/tax rates sync failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isSyncingUnits = false;
    }
  }

  private async syncSuppliers() {
    let pageIndex = 1;
    let hasMore = true;

    while (hasMore) {
      const suppliers = await this.erpService.fetchSuppliers(pageIndex, 200);
      if (suppliers.length === 0) {
        hasMore = false;
        break;
      }

      for (const supplier of suppliers) {
        const code = supplier.code || supplier.vendorCode;
        const name = supplier.name || supplier.vendorName;

        if (!code || !name) continue;

        await this.prisma.erpSupplier.upsert({
          where: { code },
          create: { code, name },
          update: { name, updateTime: new Date() },
        });
      }

      this.logger.log(`Synced ${suppliers.length} suppliers (page ${pageIndex})`);
      pageIndex++;

      if (suppliers.length < 200) {
        hasMore = false;
      }

      // Rate limit: 500ms between pages
      await this.sleep(500);
    }
  }

  private async syncMaterials() {
    let pageIndex = 1;
    let hasMore = true;

    while (hasMore) {
      const materials = await this.erpService.fetchMaterials(pageIndex, 200);
      if (materials.length === 0) {
        hasMore = false;
        break;
      }

      for (const material of materials) {
        const code = material.code || material.productCode;
        const name = material.name || material.productName;
        const specification = material.specification || material.modelDescription || '';

        if (!code || !name) continue;

        await this.prisma.erpMaterial.upsert({
          where: { code },
          create: { code, name, specification },
          update: { name, specification, updateTime: new Date() },
        });
      }

      this.logger.log(`Synced ${materials.length} materials (page ${pageIndex})`);
      pageIndex++;

      if (materials.length < 200) {
        hasMore = false;
      }

      await this.sleep(500);
    }
  }

  private async syncUnits() {
    let pageIndex = 1;
    let hasMore = true;

    while (hasMore) {
      const units = await this.erpService.fetchUnits(pageIndex, 100);
      if (units.length === 0) {
        hasMore = false;
        break;
      }

      for (const unit of units) {
        const code = unit.code || unit.unitCode;
        // name may be a dict with zh_CN key or a plain string
        const rawName = unit.name || unit.unitName;
        let name: string | undefined;
        if (rawName && typeof rawName === 'object' && rawName.zh_CN) {
          name = rawName.zh_CN;
        } else if (typeof rawName === 'string') {
          name = rawName;
        }

        if (!code || !name) continue;

        await this.prisma.erpUnit.upsert({
          where: { code },
          create: { code, name },
          update: { name, updateTime: new Date() },
        });
      }

      this.logger.log(`Synced ${units.length} units (page ${pageIndex})`);
      pageIndex++;

      if (units.length < 100) {
        hasMore = false;
      }

      await this.sleep(500);
    }
  }

  private async syncTaxRates() {
    let pageIndex = 1;
    let hasMore = true;

    while (hasMore) {
      const taxRates = await this.erpService.fetchTaxRates(pageIndex, 100);
      if (taxRates.length === 0) {
        hasMore = false;
        break;
      }

      for (const tax of taxRates) {
        const code = tax.code || tax.taxCode;
        const name = tax.name || tax.taxName;
        const rateValue = tax.rateValue ?? tax.taxRate ?? null;

        if (!code) continue;

        await this.prisma.erpTax.upsert({
          where: { code },
          create: { code, name, rateValue },
          update: { name, rateValue, updateTime: new Date() },
        });
      }

      this.logger.log(`Synced ${taxRates.length} tax rates (page ${pageIndex})`);
      pageIndex++;

      if (taxRates.length < 100) {
        hasMore = false;
      }

      await this.sleep(500);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
