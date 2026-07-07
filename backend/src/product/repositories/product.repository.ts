import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { buildPaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { QueryProductDto } from '../dto/query-product.dto';
import { Product, ProductStatus } from '../entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  create(data: Partial<Product>) {
    return this.repository.create(data);
  }

  save(product: Product) {
    return this.repository.save(product);
  }

  async findById(id: number) {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdWithSkus(id: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Product) : this.repository;
    return repo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.skus', 'sku', 'sku.deleted_at IS NULL')
      .leftJoinAndSelect('product.category', 'category', 'category.deleted_at IS NULL')
      .where('product.id = :id', { id })
      .andWhere('product.deleted_at IS NULL')
      .orderBy('sku.id', 'ASC')
      .getOne();
  }

  async findByMerchantAndSpuCode(merchantId: number, spuCode: string) {
    return this.repository.findOne({ where: { merchantId, spuCode } });
  }

  async findPaginated(query: QueryProductDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const qb = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.skus', 'sku', 'sku.deleted_at IS NULL')
      .leftJoinAndSelect('product.category', 'category', 'category.deleted_at IS NULL')
      .where('product.deleted_at IS NULL');

    if (query.merchantId) {
      qb.andWhere('product.merchant_id = :merchantId', { merchantId: query.merchantId });
    }
    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    }
    if (query.categoryId) {
      qb.andWhere('product.category_id = :categoryId', { categoryId: query.categoryId });
    }
    if (query.keyword) {
      qb.andWhere(
        `(JSON_UNQUOTE(JSON_EXTRACT(product.title, '$.zh')) LIKE :kw
          OR JSON_UNQUOTE(JSON_EXTRACT(product.title, '$.en')) LIKE :kw
          OR product.spu_code LIKE :kw)`,
        { kw: `%${query.keyword}%` },
      );
    }

    qb.orderBy('product.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return buildPaginatedResult(list, total, page, pageSize);
  }

  async update(id: number, data: Partial<Product>) {
    await this.repository.update(id, data);
  }

  async softDelete(id: number) {
    await this.repository.softDelete(id);
  }

  async updateStatus(id: number, status: ProductStatus) {
    await this.repository.update(id, { status });
  }

  async incrementSalesCount(productId: number, quantity: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Product) : this.repository;
    await repo.increment({ id: productId }, 'salesCount', quantity);
  }

  async decrementSalesCount(productId: number, quantity: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Product) : this.repository;
    await repo.decrement({ id: productId }, 'salesCount', quantity);
  }
}
