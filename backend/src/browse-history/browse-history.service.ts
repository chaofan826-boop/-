import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductService } from '../product/product.service';
import { ProductBrowseHistory } from './entities/product-browse-history.entity';

const MAX_HISTORY_ITEMS = 50;

@Injectable()
export class BrowseHistoryService {
  constructor(
    @InjectRepository(ProductBrowseHistory)
    private readonly historyRepository: Repository<ProductBrowseHistory>,
    private readonly productService: ProductService,
  ) {}

  async recordView(userId: number, productId: number) {
    await this.productService.findOne(productId);

    const existing = await this.historyRepository.findOne({
      where: { userId, productId },
    });

    if (existing) {
      existing.viewedAt = new Date();
      await this.historyRepository.save(existing);
    } else {
      await this.historyRepository.save(
        this.historyRepository.create({
          userId,
          productId,
          viewedAt: new Date(),
        }),
      );
    }

    await this.pruneHistory(userId);
    return { success: true };
  }

  async findAll(userId: number) {
    const rows = await this.historyRepository.find({
      where: { userId },
      relations: { product: { skus: true } },
      order: { viewedAt: 'DESC' },
      take: MAX_HISTORY_ITEMS,
    });

    return rows.map((row) => ({
      productId: row.productId,
      viewedAt: row.viewedAt,
      product: row.product,
    }));
  }

  async remove(userId: number, productId: number) {
    const result = await this.historyRepository.delete({ userId, productId });
    if (!result.affected) {
      throw new NotFoundException('Browse history item not found');
    }
    return { success: true };
  }

  async removeAll(userId: number) {
    await this.historyRepository.delete({ userId });
    return { success: true };
  }

  private async pruneHistory(userId: number) {
    const rows = await this.historyRepository.find({
      where: { userId },
      order: { viewedAt: 'DESC' },
      select: { id: true },
    });

    if (rows.length <= MAX_HISTORY_ITEMS) return;

    const idsToRemove = rows.slice(MAX_HISTORY_ITEMS).map((row) => row.id);
    await this.historyRepository.delete(idsToRemove);
  }
}
