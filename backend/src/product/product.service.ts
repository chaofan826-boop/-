import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CategoryService } from '../category/category.service';
import { runBatchDelete } from '../common/utils/batch-delete.util';
import { Merchant } from '../merchant/entities/merchant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { toInt } from './dto/sku.dto';
import { Product, ProductStatus } from './entities/product.entity';
import { ProductSku, SkuStatus } from './entities/product-sku.entity';
import { ProductSkuRepository } from './repositories/product-sku.repository';
import { ProductRepository } from './repositories/product.repository';
import { normalizeSkuSpecInput, normalizeSpecOptions } from './utils/spec.util';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly skuRepository: ProductSkuRepository,
    private readonly dataSource: DataSource,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly categoryService: CategoryService,
  ) {}

  async create(dto: CreateProductDto) {
    await this.ensureMerchantExists(dto.merchantId);
    await this.ensureSpuCodeUnique(dto.merchantId, dto.spuCode);
    await this.ensureSkuCodesUnique(dto.merchantId, dto.skus.map((s) => s.skuCode));
    if (dto.categoryId != null) {
      await this.categoryService.ensureExists(dto.categoryId);
    }

    return this.dataSource.transaction(async (manager) => {
      const product = this.productRepository.create({
        merchantId: dto.merchantId,
        spuCode: dto.spuCode,
        title: dto.title,
        description: dto.description ?? null,
        mainImage: dto.mainImage ?? null,
        images: dto.images ?? null,
        status: dto.status ?? ProductStatus.DRAFT,
        categoryId: dto.categoryId ?? null,
        salesCount: dto.salesCount ?? 0,
        specOptions: normalizeSpecOptions(dto.specOptions),
      });

      const savedProduct = await manager.save(Product, product);

      const skus = dto.skus.map((skuDto) =>
        this.skuRepository.buildSkuEntity(dto.merchantId, savedProduct.id, skuDto),
      );
      await manager.save(ProductSku, skus);

      return this.findOneInTransaction(manager, savedProduct.id);
    });
  }

  findAll(query: QueryProductDto) {
    return this.productRepository.findPaginated(query);
  }

  async findOne(id: number) {
    const product = await this.productRepository.findByIdWithSkus(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async findOneInTransaction(manager: EntityManager, id: number) {
    const product = await this.productRepository.findByIdWithSkus(id, manager);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findSkuById(id: number) {
    const sku = await this.skuRepository.findById(id);
    if (!sku) {
      throw new NotFoundException('SKU not found');
    }
    return sku;
  }

  async update(dto: UpdateProductDto) {
    const product = await this.findOne(dto.id);

    if (dto.categoryId != null) {
      await this.categoryService.ensureExists(dto.categoryId);
    }

    if (dto.spuCode && dto.spuCode !== product.spuCode) {
      const merchantId = dto.merchantId ?? product.merchantId;
      await this.ensureSpuCodeUnique(merchantId, dto.spuCode, dto.id);
    }

    return this.dataSource.transaction(async (manager) => {
      const productPatch: Partial<Product> = {};
      if (dto.merchantId !== undefined) productPatch.merchantId = dto.merchantId;
      if (dto.spuCode !== undefined) productPatch.spuCode = dto.spuCode;
      if (dto.title !== undefined) productPatch.title = dto.title;
      if (dto.description !== undefined) productPatch.description = dto.description;
      if (dto.mainImage !== undefined) productPatch.mainImage = dto.mainImage;
      if (dto.images !== undefined) productPatch.images = dto.images;
      if (dto.status !== undefined) productPatch.status = dto.status;
      if (dto.categoryId !== undefined) productPatch.categoryId = dto.categoryId;
      if (dto.salesCount !== undefined) productPatch.salesCount = dto.salesCount;
      if (dto.specOptions !== undefined) {
        productPatch.specOptions = normalizeSpecOptions(dto.specOptions);
      }

      if (Object.keys(productPatch).length) {
        await manager.update(Product, dto.id, productPatch);
      }

      if (dto.skus) {
        const submittedIds = new Set(
          dto.skus.map((s) => s.id).filter((id): id is number => id != null),
        );
        const existingSkus = await manager.find(ProductSku, { where: { productId: dto.id } });
        for (const existing of existingSkus) {
          if (!submittedIds.has(existing.id)) {
            await manager.softDelete(ProductSku, existing.id);
          }
        }

        const merchantId = dto.merchantId ?? product.merchantId;
        const newCodes = dto.skus.filter((s) => !s.id).map((s) => s.skuCode!).filter(Boolean);
        await this.ensureNewSkuCodesUnique(merchantId, newCodes, dto.id, manager);

        const codesInPayload = new Set<string>();
        for (const skuDto of dto.skus) {
          if (!skuDto.skuCode) continue;
          if (codesInPayload.has(skuDto.skuCode)) {
            throw new ConflictException(`Duplicate SKU code "${skuDto.skuCode}" in request`);
          }
          codesInPayload.add(skuDto.skuCode);
        }

        for (const skuDto of dto.skus) {
          const normalized = normalizeSkuSpecInput(skuDto);
          if (skuDto.id) {
            const stock = toInt(skuDto.stock);
            const skuPatch: Partial<ProductSku> = {
              skuCode: skuDto.skuCode,
              color: normalized.color,
              size: normalized.size,
              specValues: Object.keys(normalized.specValues).length
                ? normalized.specValues
                : null,
              prices: skuDto.prices,
              imageUrl: skuDto.imageUrl ?? null,
              status: skuDto.status,
            };
            if (stock !== undefined) {
              skuPatch.stock = stock;
            }
            await manager.update(ProductSku, skuDto.id, skuPatch);
          } else {
            if (!skuDto.skuCode) {
              throw new BadRequestException('SKU code is required for new SKU');
            }
            const stock = toInt(skuDto.stock);
            if (stock === undefined) {
              throw new BadRequestException(`Stock is required for new SKU ${skuDto.skuCode}`);
            }
            const newSku = this.skuRepository.buildSkuEntity(
              dto.merchantId ?? product.merchantId,
              dto.id,
              { ...skuDto, stock },
            );
            await manager.save(ProductSku, newSku);
          }
        }
      }

      return this.findOneInTransaction(manager, dto.id);
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.skuRepository.softDeleteByProductId(id);
    await this.productRepository.softDelete(id);
    return null;
  }

  removeMany(ids: number[]) {
    return runBatchDelete(ids, (id) => this.remove(id));
  }

  async updateStatus(id: number, status: ProductStatus) {
    if (![ProductStatus.ACTIVE, ProductStatus.INACTIVE].includes(status)) {
      throw new BadRequestException('Status must be active or inactive for shelf toggle');
    }
    await this.findOne(id);
    await this.productRepository.updateStatus(id, status);
    return this.findOne(id);
  }

  async deductStock(skuId: number, quantity: number, manager?: EntityManager) {
    await this.skuRepository.decrementStock(skuId, quantity, manager);
    if (manager) {
      const sku = await manager.findOne(ProductSku, { where: { id: skuId } });
      if (!sku) {
        throw new NotFoundException('SKU not found');
      }
      return sku;
    }
    return this.findSkuById(skuId);
  }

  async restoreStock(skuId: number, quantity: number, manager?: EntityManager) {
    await this.skuRepository.incrementStock(skuId, quantity, manager);
  }

  async incrementSalesCount(productId: number, quantity: number, manager?: EntityManager) {
    await this.productRepository.incrementSalesCount(productId, quantity, manager);
  }

  async decrementSalesCount(productId: number, quantity: number, manager?: EntityManager) {
    await this.productRepository.decrementSalesCount(productId, quantity, manager);
  }

  getSkuPrice(sku: ProductSku, currency = 'USD'): number {
    const price = sku.prices[currency];
    if (price === undefined) {
      throw new BadRequestException(`Price not available in currency ${currency}`);
    }
    return Number(price);
  }

  private async ensureMerchantExists(merchantId: number) {
    const merchant = await this.merchantRepository.findOne({ where: { id: merchantId } });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }
  }

  private async ensureSpuCodeUnique(merchantId: number, spuCode: string, excludeId?: number) {
    const existing = await this.productRepository.findByMerchantAndSpuCode(merchantId, spuCode);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`SPU code "${spuCode}" already exists for this merchant`);
    }
  }

  private async ensureSkuCodesUnique(merchantId: number, skuCodes: string[]) {
    for (const code of skuCodes) {
      const existing = await this.skuRepository.findByMerchantAndSkuCode(merchantId, code);
      if (existing) {
        throw new ConflictException(`SKU code "${code}" already exists for this merchant`);
      }
    }
  }

  private async ensureNewSkuCodesUnique(
    merchantId: number,
    skuCodes: string[],
    productId: number,
    manager: EntityManager,
  ) {
    for (const code of skuCodes) {
      const existing = await manager.findOne(ProductSku, {
        where: { merchantId, skuCode: code },
      });
      if (existing && existing.productId !== productId) {
        throw new ConflictException(`SKU code "${code}" already exists for this merchant`);
      }
    }
  }
}
