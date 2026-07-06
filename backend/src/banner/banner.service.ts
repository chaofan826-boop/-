import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBannerDto } from './dto/create-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Banner, BannerStatus } from './entities/banner.entity';

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
  ) {}

  create(dto: CreateBannerDto) {
    const banner = this.bannerRepository.create({
      title: dto.title ?? null,
      imageUrl: dto.imageUrl,
      linkUrl: dto.linkUrl ?? null,
      sortOrder: dto.sortOrder ?? 0,
      status: dto.status ?? BannerStatus.ACTIVE,
    });
    return this.bannerRepository.save(banner);
  }

  findAll(query: QueryBannerDto = {}) {
    const qb = this.bannerRepository
      .createQueryBuilder('banner')
      .where('banner.deleted_at IS NULL')
      .orderBy('banner.sort_order', 'ASC')
      .addOrderBy('banner.id', 'ASC');

    if (query.status) {
      qb.andWhere('banner.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async findOne(id: number) {
    const banner = await this.bannerRepository.findOne({
      where: { id },
    });
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return banner;
  }

  async update(dto: UpdateBannerDto) {
    const banner = await this.findOne(dto.id);

    if (dto.title !== undefined) banner.title = dto.title;
    if (dto.imageUrl !== undefined) banner.imageUrl = dto.imageUrl;
    if (dto.linkUrl !== undefined) banner.linkUrl = dto.linkUrl;
    if (dto.sortOrder !== undefined) banner.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) banner.status = dto.status;

    return this.bannerRepository.save(banner);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.bannerRepository.softDelete(id);
    return null;
  }
}
