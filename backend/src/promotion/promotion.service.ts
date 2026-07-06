import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product, ProductStatus } from '../product/entities/product.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { QueryPromotionDto } from './dto/query-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import {
  ProductSalePrices,
  Promotion,
  PromotionStatus,
  PromotionType,
} from './entities/promotion.entity';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(dto: CreatePromotionDto) {
    this.validateByType(dto.type, dto);
    await this.ensureSingleFeatured(dto.type);
    return this.savePromotion(dto);
  }

  findAll(query: QueryPromotionDto = {}) {
    const qb = this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.deleted_at IS NULL')
      .orderBy('promotion.sort_order', 'ASC')
      .addOrderBy('promotion.id', 'ASC');

    if (query.status) {
      qb.andWhere('promotion.status = :status', { status: query.status });
    }
    if (query.type) {
      qb.andWhere('promotion.type = :type', { type: query.type });
    }

    return qb.getMany();
  }

  async findOne(id: number) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }
    return promotion;
  }

  async update(dto: UpdatePromotionDto) {
    const promotion = await this.findOne(dto.id);
    const type = dto.type ?? promotion.type;
    this.validateByType(type, {
      productIds: dto.productIds ?? promotion.productIds,
      discountPercent: dto.discountPercent ?? promotion.discountPercent,
      salePrices: dto.salePrices ?? promotion.salePrices,
      startAt: dto.startAt ?? promotion.startAt,
      endAt: dto.endAt ?? promotion.endAt,
    });

    if (dto.type !== undefined && dto.type !== promotion.type) {
      await this.ensureSingleFeatured(dto.type, promotion.id);
    }

    if (dto.type !== undefined) promotion.type = dto.type;
    if (dto.title !== undefined) promotion.title = dto.title;
    if (dto.subtitle !== undefined) promotion.subtitle = dto.subtitle;
    if (dto.discountPercent !== undefined) promotion.discountPercent = dto.discountPercent;
    if (dto.productIds !== undefined) promotion.productIds = dto.productIds;
    if (dto.salePrices !== undefined) promotion.salePrices = dto.salePrices;
    if (dto.flashStock !== undefined) promotion.flashStock = dto.flashStock;
    if (dto.startAt !== undefined) promotion.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) promotion.endAt = new Date(dto.endAt);
    if (dto.sortOrder !== undefined) promotion.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) promotion.status = dto.status;

    return this.promotionRepository.save(promotion);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.promotionRepository.softDelete(id);
    return null;
  }

  private async savePromotion(dto: CreatePromotionDto) {
    await this.ensureProductsExist(dto.productIds);

    const promotion = this.promotionRepository.create({
      type: dto.type,
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      discountPercent: dto.discountPercent ?? 0,
      productIds: dto.productIds,
      salePrices: dto.salePrices ?? null,
      flashStock: dto.flashStock ?? null,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      sortOrder: dto.sortOrder ?? 0,
      status: dto.status ?? PromotionStatus.ACTIVE,
    });

    return this.promotionRepository.save(promotion);
  }

  private validateByType(
    type: PromotionType,
    dto: {
      productIds?: number[];
      discountPercent?: number;
      salePrices?: ProductSalePrices | null;
      startAt?: string | Date;
      endAt?: string | Date;
    },
  ) {
    if (!dto.productIds?.length) {
      throw new BadRequestException('Please select at least one product');
    }

    if (type === PromotionType.FLASH_SALE) {
      const hasSalePrice = dto.salePrices && Object.keys(dto.salePrices).length > 0;
      const hasDiscount = (dto.discountPercent ?? 0) > 0;
      if (!hasSalePrice && !hasDiscount) {
        throw new BadRequestException('Flash sale requires sale prices or discount percent');
      }
    }

    if (type === PromotionType.DISCOUNT && (dto.discountPercent ?? 0) <= 0) {
      throw new BadRequestException('Discount promotion requires discount percent');
    }

    const startRaw = dto.startAt;
    const endRaw = dto.endAt;
    if (startRaw && endRaw) {
      const startAt = new Date(startRaw as string | Date);
      const endAt = new Date(endRaw as string | Date);
      if (endAt <= startAt) {
        throw new BadRequestException('End time must be after start time');
      }
    }
  }

  private async ensureSingleFeatured(type: PromotionType, excludeId?: number) {
    if (type !== PromotionType.FEATURED) return;

    const qb = this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.deleted_at IS NULL')
      .andWhere('promotion.type = :type', { type: PromotionType.FEATURED });

    if (excludeId) {
      qb.andWhere('promotion.id != :excludeId', { excludeId });
    }

    const exists = await qb.getOne();
    if (exists) {
      throw new BadRequestException('Only one featured promotion is allowed');
    }
  }

  private async ensureProductsExist(productIds: number[]) {
    const products = await this.productRepository.find({
      where: { id: In(productIds), status: ProductStatus.ACTIVE },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Some selected products are invalid or inactive');
    }
  }
}

export function resolveSalePrice(
  productId: number,
  currency: string,
  originalPrice: number,
  promotion: Pick<Promotion, 'discountPercent' | 'salePrices'>,
) {
  const custom = promotion.salePrices?.[String(productId)]?.[currency as 'USD' | 'CNY'];
  if (custom !== undefined && custom !== null) {
    return Number(custom);
  }
  if (promotion.discountPercent > 0) {
    return Math.round(originalPrice * (1 - promotion.discountPercent / 100) * 100) / 100;
  }
  return originalPrice;
}
