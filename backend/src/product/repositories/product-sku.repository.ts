import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { SkuDto, SkuUpdateDto, toInt } from '../dto/sku.dto';
import { ProductSku, SkuStatus } from '../entities/product-sku.entity';

@Injectable()
export class ProductSkuRepository {
  constructor(
    @InjectRepository(ProductSku)
    private readonly repository: Repository<ProductSku>,
  ) {}

  create(data: Partial<ProductSku>) {
    return this.repository.create(data);
  }

  save(sku: ProductSku | ProductSku[]) {
    return this.repository.save(Array.isArray(sku) ? sku : [sku]);
  }

  async findById(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: { product: true },
    });
  }

  async findByProductId(productId: number) {
    return this.repository.find({ where: { productId }, order: { id: 'ASC' } });
  }

  async findByMerchantAndSkuCode(merchantId: number, skuCode: string) {
    return this.repository.findOne({ where: { merchantId, skuCode } });
  }

  async findByIds(ids: number[]) {
    return this.repository.find({ where: { id: In(ids) } });
  }

  buildSkuEntity(
    merchantId: number,
    productId: number,
    dto: SkuDto | SkuUpdateDto,
  ): ProductSku {
    const stock = toInt(dto.stock) ?? 0;
    return this.repository.create({
      merchantId,
      productId,
      skuCode: dto.skuCode!,
      color: dto.color ?? null,
      size: dto.size ?? null,
      specValues: { color: dto.color, size: dto.size },
      prices: dto.prices ?? {},
      stock,
      imageUrl: dto.imageUrl ?? null,
      status: dto.status ?? SkuStatus.ACTIVE,
    });
  }

  async softDeleteByProductId(productId: number) {
    await this.repository.softDelete({ productId });
  }

  async softDelete(id: number) {
    await this.repository.softDelete(id);
  }

  async decrementStock(id: number, quantity: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(ProductSku) : this.repository;
    const result = await repo
      .createQueryBuilder()
      .update(ProductSku)
      .set({ stock: () => `stock - ${quantity}` })
      .where('id = :id', { id })
      .andWhere('stock >= :quantity', { quantity })
      .execute();

    if (!result.affected) {
      const sku = await repo.findOne({ where: { id }, select: { skuCode: true } });
      const label = sku?.skuCode ?? `#${id}`;
      throw new BadRequestException(`Insufficient stock for SKU ${label}`);
    }
  }
}
