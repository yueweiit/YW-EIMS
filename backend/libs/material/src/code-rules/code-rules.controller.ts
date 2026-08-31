import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionGuard, RequirePermission } from '@eims/roles';
import { MaterialCodeRulesService } from './code-rules.service';
import { CreateCodeRuleDto } from './dto/create-code-rule.dto';
import { UpdateCodeRuleDto } from './dto/update-code-rule.dto';
import { QueryCodeRuleDto } from './dto/query-code-rule.dto';

@Controller('material-code-rule')
@UseGuards(PermissionGuard)
@RequirePermission('eims:material:code-rule')
export class CodeRulesController {
  constructor(private readonly codeRulesService: MaterialCodeRulesService) {}

  @Get('page')
  async findPage(@Query() query: QueryCodeRuleDto) {
    return this.codeRulesService.findPage(query);
  }

  @Get(':codePrefix')
  async findOne(@Param('codePrefix') codePrefix: string) {
    return this.codeRulesService.findOne(codePrefix);
  }

  @Post()
  @RequirePermission('eims:material:code-rule:create')
  async create(@Body() dto: CreateCodeRuleDto) {
    return this.codeRulesService.create(dto);
  }

  @Put(':codePrefix')
  @RequirePermission('eims:material:code-rule:update')
  async update(
    @Param('codePrefix') codePrefix: string,
    @Body() dto: UpdateCodeRuleDto,
  ) {
    return this.codeRulesService.update(codePrefix, dto);
  }

  @Delete(':codePrefix')
  @RequirePermission('eims:material:code-rule:delete')
  async remove(@Param('codePrefix') codePrefix: string) {
    return this.codeRulesService.remove(codePrefix);
  }
}
