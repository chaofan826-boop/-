import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBannerDto } from './dto/create-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { UpdateBannerSettingsDto } from './dto/update-banner-settings.dto';
import { Banner, BannerStatus } from './entities/banner.entity';
import { BannerSettings } from './entities/banner-settings.entity';

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    @InjectRepository(BannerSettings)
    private readonly bannerSettingsRepository: Repository<BannerSettings>,
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

  async getSettings() {
    const settings = await this.getOrCreateSettings();
    return { carouselEnabled: settings.carouselEnabled };
  }

  async updateSettings(dto: UpdateBannerSettingsDto) {
    const settings = await this.getOrCreateSettings();
    settings.carouselEnabled = dto.carouselEnabled;
    const saved = await this.bannerSettingsRepository.save(settings);
    return { carouselEnabled: saved.carouselEnabled };
  }

  async findActiveForStore() {
    const settings = await this.getOrCreateSettings();
    if (!settings.carouselEnabled) {
      return [];
    }
    return this.findAll({ status: BannerStatus.ACTIVE });
  }

  private async getOrCreateSettings() {
    const existing = await this.bannerSettingsRepository.find({
      order: { id: 'ASC' },
      take: 1,
    });
    if (existing[0]) {
      return existing[0];
    }

    return this.bannerSettingsRepository.save(
      this.bannerSettingsRepository.create({ carouselEnabled: true }),
    );
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
