import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { BatchDeleteDto } from '../common/dto/batch-delete.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('products')
  @Post('create')
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('products')
  @Post('update')
  update(@Body() dto: UpdateProductDto) {
    return this.productService.update(dto);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('products')
  @Post('batch-delete')
  batchRemove(@Body() dto: BatchDeleteDto) {
    return this.productService.removeMany(dto.ids);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('products')
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductStatusDto) {
    return this.productService.updateStatus(id, dto.status);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('products')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}
