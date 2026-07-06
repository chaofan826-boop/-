import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductSku } from '../product/entities/product-sku.entity';
import { ProductPricingItemDto } from './dto/product-pricing.dto';
import {
  Promotion,
  PromotionStatus,
  PromotionType,
} from './entities/promotion.entity';
import { resolveSalePrice } from './promotion.service';

export interface ProductPricingResult {
  productId: number;
  productSkuId: number;
  originalPrice: number;
  salePrice: number;
  promotionType: PromotionType | null;
  promotionTitle: { zh: string; en: string } | null;
}

@Injectable()
export class ProductPricingService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(ProductSku)
    private readonly skuRepository: Repository<ProductSku>,
  ) {}

  async quoteItems(items: ProductPricingItemDto[], currency = 'USD'): Promise<ProductPricingResult[]> {
    const skuIds = [...new Set(items.map((item) => item.productSkuId))];
    const skus = await this.skuRepository.find({ where: { id: In(skuIds) } });
    const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

    const productIds = [...new Set(items.map((item) => item.productId))];
    const promotionsByProduct = await this.loadActivePromotionsByProduct(productIds);

    return items.map((item) => {
      const sku = skuMap.get(item.productSkuId);
      if (!sku) {
        throw new NotFoundException(`SKU #${item.productSkuId} not found`);
      }

      const originalPrice = this.getSkuPrice(sku, currency);
      const promotions = promotionsByProduct.get(item.productId) ?? [];
      const { salePrice, promotion } = this.resolveBestSalePrice(
        item.productId,
        currency,
        originalPrice,
        promotions,
      );

      return {
        productId: item.productId,
        productSkuId: item.productSkuId,
        originalPrice,
        salePrice,
        promotionType: promotion?.type ?? null,
        promotionTitle: promotion?.title ?? null,
      };
    });
  }

  async resolveSkuSalePrice(productId: number, sku: ProductSku, currency = 'USD') {
    const originalPrice = this.getSkuPrice(sku, currency);
    const promotionsByProduct = await this.loadActivePromotionsByProduct([productId]);
    const promotions = promotionsByProduct.get(productId) ?? [];
    const { salePrice, promotion } = this.resolveBestSalePrice(productId, currency, originalPrice, promotions);
    return {
      originalPrice,
      salePrice,
      promotionType: promotion?.type ?? null,
      promotionTitle: promotion?.title ?? null,
    };
  }

  private async loadActivePromotionsByProduct(productIds: number[]) {
    if (!productIds.length) return new Map<number, Promotion[]>();

    const now = new Date();
    const promotions = await this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.deleted_at IS NULL')
      .andWhere('promotion.status = :status', { status: PromotionStatus.ACTIVE })
      .andWhere('promotion.type IN (:...types)', {
        types: [PromotionType.FLASH_SALE, PromotionType.DISCOUNT],
      })
      .andWhere('promotion.start_at <= :now', { now })
      .andWhere('promotion.end_at >= :now', { now })
      .orderBy('promotion.sort_order', 'ASC')
      .addOrderBy('promotion.id', 'ASC')
      .getMany();

    const map = new Map<number, Promotion[]>();
    const productIdSet = new Set(productIds);

    for (const promotion of promotions) {
      for (const rawId of promotion.productIds ?? []) {
        const productId = Number(rawId);
        if (!productIdSet.has(productId)) continue;
        const list = map.get(productId) ?? [];
        list.push(promotion);
        map.set(productId, list);
      }
    }

    return map;
  }

  private resolveBestSalePrice(
    productId: number,
    currency: string,
    originalPrice: number,
    promotions: Promotion[],
  ): { salePrice: number; promotion: Promotion | null } {
    if (!promotions.length) {
      return { salePrice: originalPrice, promotion: null };
    }

    let best = originalPrice;
    let bestPromotion: Promotion | null = null;
    for (const promotion of promotions) {
      const salePrice = resolveSalePrice(productId, currency, originalPrice, promotion);
      if (salePrice < best) {
        best = salePrice;
        bestPromotion = promotion;
      }
    }
    return { salePrice: best, promotion: bestPromotion };
  }

  private getSkuPrice(sku: ProductSku, currency: string) {
    const price = sku.prices[currency] ?? sku.prices['USD'] ?? Object.values(sku.prices)[0];
    return Number(price ?? 0);
  }
}
