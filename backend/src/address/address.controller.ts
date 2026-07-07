import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Request } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto';
import { SetDefaultShippingAddressDto } from './dto/set-default-shipping-address.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';

@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  findAll(@Request() req: { user: { id: number } }) {
    return this.addressService.findAll(req.user.id);
  }

  @Post('create')
  create(@Request() req: { user: { id: number } }, @Body() dto: CreateShippingAddressDto) {
    return this.addressService.create(req.user.id, dto);
  }

  @Post('update')
  update(@Request() req: { user: { id: number } }, @Body() dto: UpdateShippingAddressDto) {
    return this.addressService.update(req.user.id, dto);
  }

  @Post('set-default')
  setDefault(@Request() req: { user: { id: number } }, @Body() dto: SetDefaultShippingAddressDto) {
    return this.addressService.setDefault(req.user.id, dto);
  }

  @Delete(':id')
  remove(@Request() req: { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    return this.addressService.remove(req.user.id, id);
  }
}
