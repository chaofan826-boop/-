import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, CategoryStatus } from '../../category/entities/category.entity';
import { Banner, BannerStatus } from '../../banner/entities/banner.entity';
import { Merchant } from '../../merchant/entities/merchant.entity';
import { ProductStatus } from '../../product/entities/product.entity';
import { ProductSku, SkuStatus } from '../../product/entities/product-sku.entity';
import { Product } from '../../product/entities/product.entity';
import { Promotion, PromotionStatus, PromotionType } from '../../promotion/entities/promotion.entity';
import { ChatQuickReply, QuickReplyStatus } from '../../chat/entities/chat-quick-reply.entity';
import { UserRole } from '../../user/entities/user.entity';
import { UserService } from '../../user/user.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly userService: UserService,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductSku)
    private readonly skuRepository: Repository<ProductSku>,
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(ChatQuickReply)
    private readonly quickReplyRepository: Repository<ChatQuickReply>,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
    await this.seedCategories();
    await this.seedBanners();
    await this.seedMerchantAndProducts();
    await this.seedPromotions();
    await this.removeAccessoriesDealsPromotion();
    await this.seedQuickReplies();
  }

  private async seedAdmin() {
    const adminEmail = 'admin@example.com';
    const existing = await this.userService.findByEmail(adminEmail);
    if (existing) return;

    await this.userService.createInitialAdmin({
      email: adminEmail,
      password: 'admin123',
      name: 'Admin',
    });
    this.logger.log(`Default admin created: ${adminEmail} / admin123`);
  }

  private async seedCategories() {
    const defaults = [
      { code: 'electronics', name: { zh: '数码电子', en: 'Electronics' }, sortOrder: 1 },
      { code: 'audio', name: { zh: '音频设备', en: 'Audio' }, sortOrder: 2 },
      { code: 'accessories', name: { zh: '配件', en: 'Accessories' }, sortOrder: 3 },
    ];

    for (const item of defaults) {
      const existing = await this.categoriesRepo.findOne({ where: { code: item.code } });
      if (!existing) {
        await this.categoriesRepo.save(
          this.categoriesRepo.create({
            ...item,
            status: CategoryStatus.ACTIVE,
          }),
        );
      }
    }
    this.logger.log('Default categories seeded');
  }

  private async seedBanners() {
    await this.ensureHeroBanner();

    const defaults = [
      {
        title: { zh: '数码电子 新品上市', en: 'New Electronics Arrivals' },
        imageUrl: 'https://picsum.photos/seed/cb-banner-2/1400/480',
        linkUrl: '/',
        sortOrder: 2,
        status: BannerStatus.ACTIVE,
      },
      {
        title: { zh: '音频设备 限时特惠', en: 'Audio Gear Special Offer' },
        imageUrl: 'https://picsum.photos/seed/cb-banner-3/1400/480',
        linkUrl: '/',
        sortOrder: 3,
        status: BannerStatus.ACTIVE,
      },
    ];

    for (const item of defaults) {
      const existing = await this.bannerRepository.findOne({ where: { imageUrl: item.imageUrl } });
      if (!existing) {
        await this.bannerRepository.save(item);
      }
    }

    this.logger.log('Default banners seeded');
  }

  private async ensureHeroBanner() {
    this.copyHeroBannerAsset();

    const imageUrl = '/api/uploads/banners/banner-hero-premium.svg';
    let banner = await this.bannerRepository.findOne({ where: { imageUrl } });

    if (!banner) {
      await this.bannerRepository.save({
        title: { zh: '全球臻品 尊享直邮', en: 'Premium Global Collection' },
        imageUrl,
        linkUrl: '/',
        sortOrder: 0,
        status: BannerStatus.ACTIVE,
      });
      this.logger.log('Hero premium banner seeded');
      return;
    }

    const patch: Partial<Banner> = {};
    if (banner.sortOrder !== 0) patch.sortOrder = 0;
    if (banner.status !== BannerStatus.ACTIVE) patch.status = BannerStatus.ACTIVE;
    if (!banner.title) {
      patch.title = { zh: '全球臻品 尊享直邮', en: 'Premium Global Collection' };
    }
    if (Object.keys(patch).length) {
      await this.bannerRepository.update(banner.id, patch);
    }
  }

  private copyHeroBannerAsset() {
    const src = join(process.cwd(), 'assets', 'banners', 'banner-hero-premium.svg');
    const destDir = join(process.cwd(), 'uploads', 'banners');
    const dest = join(destDir, 'banner-hero-premium.svg');

    if (!existsSync(src)) {
      this.logger.warn('Hero banner asset missing at assets/banners/banner-hero-premium.svg');
      return;
    }

    mkdirSync(destDir, { recursive: true });
    copyFileSync(src, dest);
  }

  private async seedMerchantAndProducts() {
    let merchant = await this.merchantRepository.findOne({ where: { merchantCode: 'M001' } });
    if (!merchant) {
      merchant = await this.merchantRepository.save(
        this.merchantRepository.create({
          merchantCode: 'M001',
          name: 'Global Tech Store',
          contactEmail: 'merchant1@example.com',
          defaultCurrency: 'USD',
          status: 1,
        }),
      );
      this.logger.log('Default merchant M001 created');
    }

    const electronics = await this.categoriesRepo.findOne({ where: { code: 'electronics' } });
    const audio = await this.categoriesRepo.findOne({ where: { code: 'audio' } });
    const accessories = await this.categoriesRepo.findOne({ where: { code: 'accessories' } });

    const catalogImage = (filename: string) => `/api/uploads/products/${filename}`;

    const catalog = [
      {
        spuCode: 'SPU-EAR-001',
        title: { zh: '无线降噪耳机', en: 'Wireless Earbuds Pro' },
        description: 'Premium Bluetooth earbuds with ANC',
        categoryId: audio?.id ?? null,
        mainImage: catalogImage('spu-ear-001.svg'),
        salesCount: 1286,
        skus: [
          { skuCode: 'SKU-EAR-RED', color: 'Red', prices: { USD: 49.99, CNY: 349 }, stock: 200 },
          { skuCode: 'SKU-EAR-BLACK', color: 'Black', prices: { USD: 49.99, CNY: 349 }, stock: 150 },
        ],
      },
      {
        spuCode: 'SPU-WATCH-001',
        title: { zh: '智能运动手表', en: 'Smart Sport Watch' },
        description: 'Health tracking smart watch',
        categoryId: electronics?.id ?? null,
        mainImage: catalogImage('spu-watch-001.svg'),
        salesCount: 856,
        skus: [
          { skuCode: 'SKU-WATCH-SL', color: 'Silver', prices: { USD: 129.99, CNY: 899 }, stock: 80 },
          { skuCode: 'SKU-WATCH-BK', color: 'Black', prices: { USD: 129.99, CNY: 899 }, stock: 60 },
        ],
      },
      {
        spuCode: 'SPU-SPEAKER-001',
        title: { zh: '便携蓝牙音箱', en: 'Portable Bluetooth Speaker' },
        description: '360° surround sound speaker',
        categoryId: audio?.id ?? null,
        mainImage: catalogImage('spu-speaker-001.svg'),
        salesCount: 642,
        skus: [
          { skuCode: 'SKU-SPK-BLUE', color: 'Blue', prices: { USD: 79.99, CNY: 559 }, stock: 120 },
        ],
      },
      {
        spuCode: 'SPU-POWER-001',
        title: { zh: '20000mAh 快充移动电源', en: '20000mAh Power Bank' },
        description: 'Fast charging power bank',
        categoryId: accessories?.id ?? null,
        mainImage: catalogImage('spu-power-001.svg'),
        salesCount: 2103,
        skus: [
          { skuCode: 'SKU-PWR-GRAY', color: 'Gray', prices: { USD: 39.99, CNY: 279 }, stock: 300 },
        ],
      },
      {
        spuCode: 'SPU-CABLE-001',
        title: { zh: 'USB-C 编织数据线', en: 'USB-C Braided Cable' },
        description: 'Durable braided charging cable',
        categoryId: accessories?.id ?? null,
        mainImage: catalogImage('spu-cable-001.svg'),
        salesCount: 4520,
        skus: [
          { skuCode: 'SKU-CBL-1M', color: 'Black', prices: { USD: 12.99, CNY: 89 }, stock: 500 },
          { skuCode: 'SKU-CBL-2M', color: 'White', prices: { USD: 15.99, CNY: 109 }, stock: 400 },
        ],
      },
      {
        spuCode: 'SPU-CASE-001',
        title: { zh: '磁吸手机保护壳', en: 'MagSafe Phone Case' },
        description: 'Slim protective phone case',
        categoryId: accessories?.id ?? null,
        mainImage: catalogImage('spu-case-001.svg'),
        salesCount: 318,
        skus: [
          { skuCode: 'SKU-CASE-CL', color: 'Clear', prices: { USD: 24.99, CNY: 169 }, stock: 250 },
        ],
      },
    ];

    for (const item of catalog) {
      let product = await this.productRepository.findOne({
        where: { merchantId: merchant.id, spuCode: item.spuCode },
      });

      if (!product) {
        product = await this.productRepository.save(
          this.productRepository.create({
            merchantId: merchant.id,
            spuCode: item.spuCode,
            title: item.title,
            description: item.description,
            mainImage: item.mainImage,
            status: ProductStatus.ACTIVE,
            categoryId: item.categoryId,
            salesCount: item.salesCount ?? 0,
          }),
        );

        await this.skuRepository.save(
          item.skus.map((sku) =>
            this.skuRepository.create({
              merchantId: merchant.id,
              productId: product!.id,
              skuCode: sku.skuCode,
              color: sku.color,
              size: 'Standard',
              specValues: { color: sku.color, size: 'Standard' },
              prices: sku.prices,
              stock: sku.stock,
              status: SkuStatus.ACTIVE,
            }),
          ),
        );
      } else {
        const patch: Partial<Product> = {};
        const needsImageRefresh = (current?: string | null) =>
          !current || /picsum\.photos|images\.unsplash\.com/i.test(current);

        if (!product.mainImage && item.mainImage) patch.mainImage = item.mainImage;
        if (item.mainImage && needsImageRefresh(product.mainImage)) {
          patch.mainImage = item.mainImage;
        }
        if (product.categoryId == null && item.categoryId) patch.categoryId = item.categoryId;
        if (!product.salesCount && item.salesCount) patch.salesCount = item.salesCount;
        if (Object.keys(patch).length) {
          await this.productRepository.update(product.id, patch);
        }
      }
    }

    this.logger.log('Sample products seeded');
  }

  private async seedPromotions() {
    const count = await this.promotionRepository.count();
    if (count > 0) return;

    const products = await this.productRepository.find({
      where: { status: ProductStatus.ACTIVE },
      order: { id: 'ASC' },
    });
    if (products.length < 3) return;

    const bySpu = new Map(products.map((p) => [p.spuCode, p.id]));
    const pick = (...codes: string[]) =>
      codes.map((code) => bySpu.get(code)).filter((id): id is number => id !== undefined);

    const now = new Date();
    const flashEnd = new Date(now);
    flashEnd.setHours(flashEnd.getHours() + 6);
    const promoEnd = new Date(now);
    promoEnd.setDate(promoEnd.getDate() + 7);

    const flashIds = pick('SPU-EAR-001', 'SPU-WATCH-001', 'SPU-SPEAKER-001');
    const featuredIds = pick('SPU-WATCH-001', 'SPU-EAR-001', 'SPU-POWER-001', 'SPU-SPEAKER-001');
    const salePrices: Record<string, { USD: number; CNY: number }> = {};
    if (flashIds[0]) salePrices[String(flashIds[0])] = { USD: 34.99, CNY: 239 };
    if (flashIds[1]) salePrices[String(flashIds[1])] = { USD: 89.99, CNY: 629 };
    if (flashIds[2]) salePrices[String(flashIds[2])] = { USD: 55.99, CNY: 389 };

    await this.promotionRepository.save([
      {
        type: PromotionType.FEATURED,
        title: { zh: '臻品推荐', en: 'Featured Picks' },
        subtitle: { zh: '编辑精选 品质臻选', en: 'Curated premium selection' },
        discountPercent: 0,
        productIds: featuredIds,
        salePrices: null,
        flashStock: null,
        startAt: now,
        endAt: promoEnd,
        sortOrder: 0,
        status: PromotionStatus.ACTIVE,
      },
      {
        type: PromotionType.FLASH_SALE,
        title: { zh: '限时秒杀', en: 'Flash Sale' },
        subtitle: { zh: '每日爆款 抢完即止', en: 'Daily deals while stocks last' },
        discountPercent: 30,
        productIds: flashIds,
        salePrices,
        flashStock: 100,
        startAt: now,
        endAt: flashEnd,
        sortOrder: 1,
        status: PromotionStatus.ACTIVE,
      },
      {
        type: PromotionType.DISCOUNT,
        title: { zh: '新人专享', en: 'New User Offer' },
        subtitle: { zh: '首单立减15%', en: '15% off for newcomers' },
        discountPercent: 15,
        productIds: pick('SPU-CASE-001', 'SPU-CABLE-001'),
        flashStock: null,
        startAt: now,
        endAt: promoEnd,
        sortOrder: 2,
        status: PromotionStatus.ACTIVE,
      },
    ]);

    this.logger.log('Default promotions seeded');
  }

  private async removeAccessoriesDealsPromotion() {
    const promotions = await this.promotionRepository.find();
    const deprecated = promotions.filter((p) => p.title?.zh === '配件专区');
    if (!deprecated.length) return;

    for (const promotion of deprecated) {
      await this.promotionRepository.softDelete(promotion.id);
    }
    this.logger.log(`Removed deprecated promotion: 配件专区 (${deprecated.length})`);
  }

  private async seedQuickReplies() {
    const count = await this.quickReplyRepository.count();
    if (count > 0) return;

    await this.quickReplyRepository.save([
      {
        title: '欢迎语',
        content: '您好，欢迎咨询 CrossBorder 客服，请问有什么可以帮您？',
        sortOrder: 1,
        status: QuickReplyStatus.ACTIVE,
      },
      {
        title: '稍等回复',
        content: '好的，已收到您的消息，客服正在为您核实，请稍候。',
        sortOrder: 2,
        status: QuickReplyStatus.ACTIVE,
      },
      {
        title: '订单查询',
        content: '请您提供订单号，我们会尽快为您查询订单状态。',
        sortOrder: 3,
        status: QuickReplyStatus.ACTIVE,
      },
      {
        title: '物流说明',
        content: '您的包裹已安排发出，可在订单详情页查看物流信息，如有异常请随时联系我们。',
        sortOrder: 4,
        status: QuickReplyStatus.ACTIVE,
      },
      {
        title: '结束语',
        content: '感谢您的咨询，祝您购物愉快！如有其他问题，欢迎随时留言。',
        sortOrder: 5,
        status: QuickReplyStatus.ACTIVE,
      },
    ]);

    this.logger.log('Default chat quick replies seeded');
  }
}
