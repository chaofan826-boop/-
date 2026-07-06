import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryCategoryDto } from './dto/query-category.dto';
import { Category, CategoryStatus } from './entities/category.entity';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
  ) {}

  create(data: Partial<Category>) {
    return this.repository.create(data);
  }

  save(category: Category) {
    return this.repository.save(category);
  }

  findAll(query: QueryCategoryDto = {}) {
    const qb = this.repository
      .createQueryBuilder('category')
      .where('category.deleted_at IS NULL')
      .orderBy('category.sort_order', 'ASC')
      .addOrderBy('category.id', 'ASC');

    if (query.status) {
      qb.andWhere('category.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  findById(id: number) {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string, excludeId?: number) {
    const qb = this.repository
      .createQueryBuilder('category')
      .where('category.code = :code', { code })
      .andWhere('category.deleted_at IS NULL');

    if (excludeId) {
      qb.andWhere('category.id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  async update(id: number, data: Partial<Category>) {
    await this.repository.update(id, data);
  }

  async softDelete(id: number) {
    await this.repository.softDelete(id);
  }

  async countProducts(id: number) {
    return this.repository
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product', 'product.deleted_at IS NULL')
      .where('category.id = :id', { id })
      .select('COUNT(product.id)', 'count')
      .getRawOne<{ count: string }>();
  }
}
