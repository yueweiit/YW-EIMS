import { Module } from '@nestjs/common';
import { MaterialsController } from './materials/materials.controller';
import { MaterialsService } from './materials/materials.service';
import { UnitsController } from './units/units.controller';
import { UnitsService } from './units/units.service';
import { CodeRulesController } from './code-rules/code-rules.controller';
import { MaterialCodeRulesService } from './code-rules/code-rules.service';

@Module({
  controllers: [MaterialsController, UnitsController, CodeRulesController],
  providers: [MaterialsService, UnitsService, MaterialCodeRulesService],
})
export class MaterialModule {}
