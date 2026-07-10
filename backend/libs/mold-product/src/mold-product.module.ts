import { Module } from '@nestjs/common';
import { OaModule } from '@eims/oa';
import { PhoneModelsController } from './phone-models/phone-models.controller';
import { PhoneModelsService } from './phone-models/phone-models.service';
import { ColorsController } from './colors/colors.controller';
import { ColorsService } from './colors/colors.service';
import { MoldMaterialsController } from './mold-materials/mold-materials.controller';
import { MoldMaterialsService } from './mold-materials/mold-materials.service';
import { MoldCodesController } from './mold-codes/mold-codes.controller';
import { MoldCodesService } from './mold-codes/mold-codes.service';
import { MoldsController } from './molds/molds.controller';
import { MoldsService } from './molds/molds.service';
import { ProductCodesController } from './product-codes/product-codes.controller';
import { ProductCodesService } from './product-codes/product-codes.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';

@Module({
  imports: [OaModule],
  controllers: [
    PhoneModelsController,
    ColorsController,
    MoldMaterialsController,
    MoldCodesController,
    MoldsController,
    ProductCodesController,
    ProductsController,
  ],
  providers: [
    PhoneModelsService,
    ColorsService,
    MoldMaterialsService,
    MoldCodesService,
    MoldsService,
    ProductCodesService,
    ProductsService,
  ],
  exports: [PhoneModelsService],
})
export class MoldProductModule {}
