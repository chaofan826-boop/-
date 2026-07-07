import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto';
import { SetDefaultShippingAddressDto } from './dto/set-default-shipping-address.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { ShippingAddress } from './entities/shipping-address.entity';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(ShippingAddress)
    private readonly addressRepository: Repository<ShippingAddress>,
  ) {}

  findAll(userId: number) {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', updatedAt: 'DESC' },
    });
  }

  async create(userId: number, dto: CreateShippingAddressDto) {
    const existingCount = await this.addressRepository.count({ where: { userId } });
    const shouldDefault = dto.isDefault === true || existingCount === 0;

    if (shouldDefault) {
      await this.clearDefault(userId);
    }

    const address = this.addressRepository.create({
      userId,
      receiverName: dto.receiverName.trim(),
      receiverPhone: dto.receiverPhone.trim(),
      detailAddress: dto.detailAddress.trim(),
      label: dto.label?.trim() || null,
      isDefault: shouldDefault,
    });

    return this.addressRepository.save(address);
  }

  async update(userId: number, dto: UpdateShippingAddressDto) {
    const address = await this.findOwnedAddress(userId, dto.id);

    if (dto.isDefault === true) {
      await this.clearDefault(userId);
      address.isDefault = true;
    } else if (dto.isDefault === false && address.isDefault) {
      address.isDefault = false;
    }

    if (dto.receiverName !== undefined) address.receiverName = dto.receiverName.trim();
    if (dto.receiverPhone !== undefined) address.receiverPhone = dto.receiverPhone.trim();
    if (dto.detailAddress !== undefined) address.detailAddress = dto.detailAddress.trim();
    if (dto.label !== undefined) address.label = dto.label.trim() || null;

    const saved = await this.addressRepository.save(address);

    if (!address.isDefault) {
      await this.ensureDefaultAddress(userId);
    }

    return saved;
  }

  async setDefault(userId: number, dto: SetDefaultShippingAddressDto) {
    const address = await this.findOwnedAddress(userId, dto.id);
    await this.clearDefault(userId);
    address.isDefault = true;
    return this.addressRepository.save(address);
  }

  async remove(userId: number, id: number) {
    const address = await this.findOwnedAddress(userId, id);
    const wasDefault = address.isDefault;
    await this.addressRepository.delete(address.id);

    if (wasDefault) {
      await this.ensureDefaultAddress(userId);
    }

    return { id };
  }

  private async findOwnedAddress(userId: number, id: number) {
    const address = await this.addressRepository.findOne({ where: { id, userId } });
    if (!address) {
      throw new NotFoundException('Shipping address not found');
    }
    return address;
  }

  private async clearDefault(userId: number) {
    await this.addressRepository.update({ userId, isDefault: true }, { isDefault: false });
  }

  private async ensureDefaultAddress(userId: number) {
    const hasDefault = await this.addressRepository.exists({ where: { userId, isDefault: true } });
    if (hasDefault) return;

    const latest = await this.addressRepository.findOne({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    if (latest) {
      latest.isDefault = true;
      await this.addressRepository.save(latest);
    }
  }
}
