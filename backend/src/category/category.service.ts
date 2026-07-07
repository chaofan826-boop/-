import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { runBatchDelete } from '../common/utils/batch-delete.util';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './category.repository';
import { Category, CategoryStatus } from './entities/category.entity';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  create(dto: CreateCategoryDto) {
    return this.saveCategory(dto);
  }

  findAll(query: QueryCategoryDto) {
    return this.categoryRepository.findAll(query);
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(dto: UpdateCategoryDto) {
    await this.findOne(dto.id);

    if (dto.code) {
      await this.ensureCodeUnique(dto.code, dto.id);
    }

    await this.categoryRepository.update(dto.id, {
      code: dto.code,
      name: dto.name,
      sortOrder: dto.sortOrder,
      status: dto.status,
    });

    return this.findOne(dto.id);
  }

  async remove(id: number) {
    await this.findOne(id);
    const raw = await this.categoryRepository.countProducts(id);
    const count = Number(raw?.count ?? 0);
    if (count > 0) {
      throw new ConflictException(`Category has ${count} product(s), reassign them first`);
    }
    await this.categoryRepository.softDelete(id);
    return null;
  }

  removeMany(ids: number[]) {
    return runBatchDelete(ids, (id) => this.remove(id));
  }

  async ensureExists(id: number) {
    const category = await this.categoryRepository.findById(id);
    if (!category || category.status !== CategoryStatus.ACTIVE) {
      throw new NotFoundException('Category not found or inactive');
    }
    return category;
  }

  private async saveCategory(dto: CreateCategoryDto) {
    await this.ensureCodeUnique(dto.code);
    const category = this.categoryRepository.create({
      code: dto.code,
      name: dto.name,
      sortOrder: dto.sortOrder ?? 0,
      status: dto.status ?? CategoryStatus.ACTIVE,
    });
    return this.categoryRepository.save(category);
  }

  private async ensureCodeUnique(code: string, excludeId?: number) {
    const existing = await this.categoryRepository.findByCode(code, excludeId);
    if (existing) {
      throw new ConflictException(`Category code "${code}" already exists`);
    }
  }
}
