import { IsInt } from 'class-validator';

export class SetDefaultShippingAddressDto {
  @IsInt()
  id: number;
}
