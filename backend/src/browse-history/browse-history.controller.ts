import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Request } from '@nestjs/common';
import { BrowseHistoryService } from './browse-history.service';
import { RecordBrowseHistoryDto } from './dto/record-browse-history.dto';

@Controller('browse-history')
export class BrowseHistoryController {
  constructor(private readonly browseHistoryService: BrowseHistoryService) {}

  @Post()
  record(@Request() req: { user: { id: number } }, @Body() dto: RecordBrowseHistoryDto) {
    return this.browseHistoryService.recordView(req.user.id, dto.productId);
  }

  @Get()
  findAll(@Request() req: { user: { id: number } }) {
    return this.browseHistoryService.findAll(req.user.id);
  }

  @Delete()
  removeAll(@Request() req: { user: { id: number } }) {
    return this.browseHistoryService.removeAll(req.user.id);
  }

  @Delete(':productId')
  remove(
    @Request() req: { user: { id: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.browseHistoryService.remove(req.user.id, productId);
  }
}
