import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';
import { Product, ProductStatus } from '../product/entities/product.entity';
import {
  Promotion,
  PromotionStatus,
  PromotionType,
} from '../promotion/entities/promotion.entity';
import { resolveSalePrice } from '../promotion/promotion.service';

export interface HomeProductCard {
  id: number;
  spuCode: string;
  title: { zh: string; en: string };
  mainImage: string | null;
  salesCount: number;
  skus: Array<{
    id: number;
    prices: Record<string, number>;
    stock: number;
    status: string;
  }>;
}

export interface FlashSaleItem {
  product: HomeProductCard;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  soldCount: number;
  flashStock: number;
  soldPercent: number;
}

export interface PromotionBlock {
  id: number;
  title: { zh: string; en: string };
  subtitle: { zh: string; en: string } | null;
  discountPercent: number;
  endAt: string;
  items: Array<{
    product: HomeProductCard;
    originalPrice: number;
    salePrice: number;
    discountPercent: number;
  }>;
}

export interface HotRankItem {
  rank: number;
  product: HomeProductCard;
  salesCount: number;
  heatLabel: string;
}

export interface FeaturedSection {
  id: number;
  title: { zh: string; en: string };
  products: HomeProductCard[];
}

@Injectable()
export class HomeService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async getFeatured(currency = 'USD') {
    const now = new Date();
    const [flashSale, promotions, hotRanking, featured] = await Promise.all([
      this.buildFlashSale(now, currency),
      this.buildDiscountPromotions(now, currency),
      this.buildHotRanking(currency),
      this.buildFeatured(now),
    ]);

    return { flashSale, promotions, hotRanking, featured };
  }

  private async buildFlashSale(now: Date, currency: string) {
    const promotion = await this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.deleted_at IS NULL')
      .andWhere('promotion.status = :status', { status: PromotionStatus.ACTIVE })
      .andWhere('promotion.type = :type', { type: PromotionType.FLASH_SALE })
      .andWhere('promotion.start_at <= :now', { now })
      .andWhere('promotion.end_at >= :now', { now })
      .orderBy('promotion.sort_order', 'ASC')
      .addOrderBy('promotion.id', 'ASC')
      .getOne();

    if (!promotion) return null;

    const products = await this.loadProducts(promotion.productIds);
    if (!products.length) return null;

    const salesMap = await this.getSalesCounts(products.map((p) => p.id));

    const items: FlashSaleItem[] = products.map((product) => {
      const originalPrice = this.getMinPrice(product, currency);
      const salePrice = resolveSalePrice(product.id, currency, originalPrice, promotion);
      const soldCount = salesMap.get(product.id) ?? 0;
      const flashStock =
        promotion.flashStock ??
        product.skus.reduce((sum, sku) => sum + Number(sku.stock ?? 0), 0);
      const soldPercent = flashStock > 0 ? Math.min(100, Math.round((soldCount / flashStock) * 100)) : 0;

      return {
        product: this.toProductCard(product),
        originalPrice,
        salePrice,
        discountPercent: promotion.discountPercent,
        soldCount,
        flashStock,
        soldPercent,
      };
    });

    if (!items.length) return null;

    return {
      id: promotion.id,
      title: promotion.title,
      endsAt: promotion.endAt.toISOString(),
      items,
    };
  }

  private async buildDiscountPromotions(now: Date, currency: string) {
    const list = await this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.deleted_at IS NULL')
      .andWhere('promotion.status = :status', { status: PromotionStatus.ACTIVE })
      .andWhere('promotion.type = :type', { type: PromotionType.DISCOUNT })
      .andWhere('promotion.start_at <= :now', { now })
      .andWhere('promotion.end_at >= :now', { now })
      .orderBy('promotion.sort_order', 'ASC')
      .addOrderBy('promotion.id', 'ASC')
      .getMany();

    const blocks: PromotionBlock[] = [];

    for (const promotion of list) {
      const products = await this.loadProducts(promotion.productIds);
      if (!products.length) continue;

      const items = products.map((product) => {
        const originalPrice = this.getMinPrice(product, currency);
        return {
          product: this.toProductCard(product),
          originalPrice,
          salePrice: resolveSalePrice(product.id, currency, originalPrice, promotion),
          discountPercent: promotion.discountPercent,
        };
      });

      if (!items.length) continue;

      blocks.push({
        id: promotion.id,
        title: promotion.title,
        subtitle: promotion.subtitle,
        discountPercent: promotion.discountPercent,
        endAt: promotion.endAt.toISOString(),
        items,
      });
    }

    return blocks;
  }

  private async buildFeatured(now: Date) {
    const promotion = await this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.deleted_at IS NULL')
      .andWhere('promotion.status = :status', { status: PromotionStatus.ACTIVE })
      .andWhere('promotion.type = :type', { type: PromotionType.FEATURED })
      .andWhere('promotion.start_at <= :now', { now })
      .andWhere('promotion.end_at >= :now', { now })
      .orderBy('promotion.sort_order', 'ASC')
      .addOrderBy('promotion.id', 'ASC')
      .getOne();

    if (!promotion) return null;

    const products = await this.loadProducts(promotion.productIds);
    if (!products.length) return null;

    return {
      id: promotion.id,
      title: promotion.title,
      products: products.map((p) => this.toProductCard(p)),
    };
  }

  private async buildHotRanking(_currency: string) {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.skus', 'sku', 'sku.deleted_at IS NULL AND sku.status = :skuStatus', {
        skuStatus: 'active',
      })
      .where('product.deleted_at IS NULL')
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .orderBy('product.sales_count', 'DESC')
      .addOrderBy('product.id', 'ASC')
      .take(8)
      .getMany();

    return products.map((product, index) => ({
      rank: index + 1,
      product: this.toProductCard(product),
      salesCount: Number(product.salesCount ?? 0),
      heatLabel: this.heatLabel(Number(product.salesCount ?? 0)),
    }));
  }

  private async loadProducts(ids: number[]) {
    if (!ids.length) return [];

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.skus', 'sku', 'sku.deleted_at IS NULL AND sku.status = :skuStatus', {
        skuStatus: 'active',
      })
      .where('product.deleted_at IS NULL')
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.id IN (:...ids)', { ids })
      .getMany();

    const order = new Map(ids.map((id, index) => [id, index]));
    return products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  private async getSalesCounts(productIds: number[]) {
    if (!productIds.length) return new Map<number, number>();

    const rows = await this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .select('item.product_id', 'productId')
      .addSelect('SUM(item.quantity)', 'salesCount')
      .where('item.product_id IN (:...productIds)', { productIds })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy('item.product_id')
      .getRawMany<{ productId: string; salesCount: string }>();

    return new Map(rows.map((row) => [Number(row.productId), Number(row.salesCount)]));
  }

  private getMinPrice(product: Product, currency: string) {
    const skus = product.skus?.filter((sku) => sku.status === 'active') ?? [];
    if (!skus.length) return 0;
    return Math.min(
      ...skus.map((sku) => {
        const price = sku.prices[currency] ?? sku.prices['USD'] ?? Object.values(sku.prices)[0];
        return Number(price ?? 0);
      }),
    );
  }

  private toProductCard(product: Product): HomeProductCard {
    return {
      id: product.id,
      spuCode: product.spuCode,
      title: product.title,
      mainImage: product.mainImage,
      salesCount: Number(product.salesCount ?? 0),
      skus: (product.skus ?? []).map((sku) => ({
        id: sku.id,
        prices: sku.prices,
        stock: Number(sku.stock ?? 0),
        status: sku.status,
      })),
    };
  }

  private heatLabel(salesCount: number) {
    if (salesCount >= 100) return '爆款';
    if (salesCount >= 50) return '热卖';
    if (salesCount >= 20) return '上升';
    return '新品';
  }
}
