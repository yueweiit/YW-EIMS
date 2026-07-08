import { Controller, Get, Query } from '@nestjs/common';
import { OaSearchService } from './oa-search.service';

@Controller('oa/search')
export class OaSearchController {
  constructor(private readonly oaSearchService: OaSearchService) {}

  @Get('material')
  async searchMaterial(@Query('keyword') keyword: string) {
    return this.oaSearchService.searchMaterial(keyword);
  }

  @Get('supplier')
  async searchSupplier(@Query('keyword') keyword: string) {
    return this.oaSearchService.searchSupplier(keyword);
  }

  @Get('unit')
  async searchUnit(@Query('keyword') keyword?: string) {
    return this.oaSearchService.searchUnit(keyword);
  }

  @Get('tax')
  async searchTax(@Query('keyword') keyword?: string) {
    return this.oaSearchService.searchTax(keyword);
  }
}
