import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import { Order } from '../order/entities/order.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { Coupon, CouponStatus } from './entities/coupon.entity';
import { UserCoupon, UserCouponStatus } from './entities/user-coupon.entity';
import {
  couponCurrencyLabel,
  normalizeCouponCurrency,
  resolveCouponAmount,
  type CouponCurrency,
} from './coupon-amount.util';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(UserCoupon)
    private readonly userCouponRepository: Repository<UserCoupon>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(query?: QueryCouponDto) {
    const qb = this.couponRepository.createQueryBuilder('coupon').orderBy('coupon.sort_order', 'ASC');

    if (query?.status) {
      qb.andWhere('coupon.status = :status', { status: query.status });
    }

    return qb.addOrderBy('coupon.id', 'DESC').getMany();
  }

  async findOne(id: number) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException(`Coupon #${id} not found`);
    return coupon;
  }

  async create(dto: CreateCouponDto) {
    await this.validateCategoryIds(dto.categoryIds);
    this.validateClaimWindow(dto.claimStartAt, dto.claimEndAt);
    this.validateAmounts(dto.discountAmounts, dto.minOrderAmounts);

    const status = dto.status ?? CouponStatus.ACTIVE;

    const coupon = this.couponRepository.create({
      title: dto.title,
      discountAmounts: this.normalizeAmounts(dto.discountAmounts),
      minOrderAmounts: this.normalizeMinAmounts(dto.minOrderAmounts),
      categoryIds: dto.categoryIds?.length ? dto.categoryIds : null,
      totalQuantity: dto.totalQuantity ?? null,
      perUserLimit: dto.perUserLimit ?? 1,
      claimStartAt: new Date(dto.claimStartAt),
      claimEndAt: new Date(dto.claimEndAt),
      validityDays: dto.validityDays ?? 7,
      showOnHome: status === CouponStatus.ACTIVE,
      status,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.couponRepository.save(coupon);
  }

  async update(dto: UpdateCouponDto) {
    const coupon = await this.findOne(dto.id);
    await this.validateCategoryIds(dto.categoryIds);
    this.validateClaimWindow(dto.claimStartAt, dto.claimEndAt);
    this.validateAmounts(dto.discountAmounts, dto.minOrderAmounts);

    const status = dto.status ?? coupon.status;

    Object.assign(coupon, {
      title: dto.title,
      discountAmounts: this.normalizeAmounts(dto.discountAmounts),
      minOrderAmounts: this.normalizeMinAmounts(dto.minOrderAmounts),
      categoryIds: dto.categoryIds?.length ? dto.categoryIds : null,
      totalQuantity: dto.totalQuantity ?? null,
      perUserLimit: dto.perUserLimit ?? 1,
      claimStartAt: new Date(dto.claimStartAt),
      claimEndAt: new Date(dto.claimEndAt),
      validityDays: dto.validityDays ?? 7,
      showOnHome: status === CouponStatus.ACTIVE,
      status,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.couponRepository.save(coupon);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.couponRepository.softDelete(id);
    return { id };
  }

  async findClaimable(userId?: number, homeOnly = false) {
    const now = new Date();
    const coupons = await this.couponRepository
      .createQueryBuilder('coupon')
      .where('coupon.status = :status', { status: CouponStatus.ACTIVE })
      .andWhere('coupon.claim_start_at <= :now', { now })
      .andWhere('coupon.claim_end_at >= :now', { now })
      .orderBy('coupon.sort_order', 'ASC')
      .addOrderBy('coupon.id', 'DESC')
      .getMany();

    const filtered = coupons.filter((coupon) => {
      if (homeOnly && !coupon.showOnHome) return false;
      if (coupon.totalQuantity != null && coupon.claimedCount >= coupon.totalQuantity) return false;
      return true;
    });

    if (!userId) {
      return filtered.map((coupon) => ({
        ...coupon,
        userClaimedCount: 0,
        canClaim: true,
      }));
    }

    const userCounts = await this.getUserClaimCounts(userId, filtered.map((item) => item.id));

    return filtered.map((coupon) => {
      const userClaimedCount = userCounts.get(coupon.id) ?? 0;
      return {
        ...coupon,
        userClaimedCount,
        canClaim: userClaimedCount < coupon.perUserLimit,
      };
    });
  }

  async claim(userId: number, couponId: number) {
    const coupon = await this.findOne(couponId);
    const now = new Date();

    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('优惠券未启用');
    }
    if (now < coupon.claimStartAt || now > coupon.claimEndAt) {
      throw new BadRequestException('不在优惠券领取时间内');
    }
    if (coupon.totalQuantity != null && coupon.claimedCount >= coupon.totalQuantity) {
      throw new BadRequestException('优惠券已被领完');
    }

    const userClaimedCount = await this.userCouponRepository.count({
      where: { userId, couponId },
    });
    if (userClaimedCount >= coupon.perUserLimit) {
      throw new BadRequestException('已达到领取上限');
    }

    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + coupon.validityDays);

    const userCoupon = this.userCouponRepository.create({
      userId,
      couponId,
      status: UserCouponStatus.AVAILABLE,
      claimedAt: now,
      expiresAt,
    });

    await this.userCouponRepository.save(userCoupon);
    await this.couponRepository.increment({ id: couponId }, 'claimedCount', 1);

    return this.findUserCouponById(userCoupon.id, userId);
  }

  async findUserCoupons(userId: number, status?: UserCouponStatus) {
    await this.syncExpiredCoupons(userId);

    const qb = this.userCouponRepository
      .createQueryBuilder('userCoupon')
      .leftJoinAndSelect('userCoupon.coupon', 'coupon')
      .where('userCoupon.user_id = :userId', { userId })
      .orderBy('userCoupon.claimed_at', 'DESC');

    if (status) {
      qb.andWhere('userCoupon.status = :status', { status });
    }

    return qb.getMany();
  }

  async findApplicableForOrder(userId: number, order: Order) {
    await this.syncExpiredCoupons(userId);

    const userCoupons = await this.userCouponRepository.find({
      where: { userId, status: UserCouponStatus.AVAILABLE },
      relations: { coupon: true },
      order: { expiresAt: 'ASC' },
    });

    return userCoupons.map((userCoupon) => {
      const result = this.evaluateCoupon(userCoupon.coupon, order);
      return {
        ...userCoupon,
        applicable: result.applicable,
        discountPreview: result.applicable ? result.discount : 0,
        eligibleSubtotal: result.eligibleSubtotal,
        ineligibleReason: result.applicable ? null : result.reason ?? '不可用',
      };
    });
  }

  async applyCouponToOrder(userId: number, order: Order, userCouponId: number) {
    const userCoupon = await this.userCouponRepository.findOne({
      where: { id: userCouponId, userId },
      relations: { coupon: true },
    });

    if (!userCoupon) {
      throw new NotFoundException('优惠券不存在');
    }

    if (userCoupon.status !== UserCouponStatus.AVAILABLE) {
      throw new BadRequestException('优惠券不可用');
    }

    if (new Date(userCoupon.expiresAt).getTime() <= Date.now()) {
      await this.userCouponRepository.update(userCoupon.id, { status: UserCouponStatus.EXPIRED });
      throw new BadRequestException('优惠券已过期');
    }

    const result = this.evaluateCoupon(userCoupon.coupon, order);
    if (!result.applicable) {
      throw new BadRequestException(result.reason || '优惠券不满足使用条件');
    }

    return {
      userCoupon,
      discount: result.discount,
      eligibleSubtotal: result.eligibleSubtotal,
    };
  }

  async markCouponUsed(userCouponId: number, orderNo: string) {
    await this.userCouponRepository.update(userCouponId, {
      status: UserCouponStatus.USED,
      usedAt: new Date(),
      orderNo,
    });
  }

  async getUsedCouponDetail(userCouponId: number) {
    const userCoupon = await this.userCouponRepository.findOne({
      where: { id: userCouponId },
      relations: { coupon: true },
    });
    if (!userCoupon?.coupon) return null;

    const { coupon } = userCoupon;
    return {
      userCouponId: userCoupon.id,
      couponId: coupon.id,
      title: coupon.title,
      discountAmounts: coupon.discountAmounts,
      minOrderAmounts: coupon.minOrderAmounts,
      status: userCoupon.status,
      usedAt: userCoupon.usedAt,
    };
  }

  evaluateCoupon(
    coupon: Coupon,
    order: Order,
  ): { applicable: boolean; discount: number; eligibleSubtotal: number; reason?: string } {
    const currency = normalizeCouponCurrency(order.currency);
    const eligibleSubtotal = this.calculateEligibleSubtotal(coupon, order);
    const minOrderAmount = resolveCouponAmount(coupon.minOrderAmounts, currency);
    const discountAmount = resolveCouponAmount(coupon.discountAmounts, currency);
    const orderTotal = Number(order.totalAmount);
    const symbol = couponCurrencyLabel(currency);
    const hasCategoryRestriction = !!coupon.categoryIds?.length;

    if (discountAmount <= 0) {
      return {
        applicable: false,
        discount: 0,
        eligibleSubtotal,
        reason: `该优惠券不支持${currency === 'CNY' ? '人民币' : '美元'}订单`,
      };
    }

    if (hasCategoryRestriction && eligibleSubtotal <= 0) {
      return {
        applicable: false,
        discount: 0,
        eligibleSubtotal,
        reason: '订单中没有适用分类的商品',
      };
    }

    if (eligibleSubtotal < minOrderAmount) {
      return {
        applicable: false,
        discount: 0,
        eligibleSubtotal,
        reason: `需满 ${symbol}${minOrderAmount.toFixed(2)} 可用（当前适用金额 ${symbol}${eligibleSubtotal.toFixed(2)}）`,
      };
    }

    const discount = Math.min(discountAmount, orderTotal);
    if (discount <= 0) {
      return {
        applicable: false,
        discount: 0,
        eligibleSubtotal,
        reason: '优惠金额无效',
      };
    }

    return { applicable: true, discount, eligibleSubtotal };
  }

  private calculateEligibleSubtotal(coupon: Coupon, order: Order) {
    const categoryIds = coupon.categoryIds?.length
      ? new Set(coupon.categoryIds.map((id) => Number(id)))
      : null;

    return (order.items ?? []).reduce((sum, item) => {
      const categoryId =
        item.product?.categoryId != null ? Number(item.product.categoryId) : null;
      if (categoryIds && (categoryId == null || !categoryIds.has(categoryId))) {
        return sum;
      }
      return sum + Number(item.price) * item.quantity;
    }, 0);
  }

  private async findUserCouponById(id: number, userId: number) {
    const userCoupon = await this.userCouponRepository.findOne({
      where: { id, userId },
      relations: { coupon: true },
    });
    if (!userCoupon) throw new NotFoundException('优惠券不存在');
    return userCoupon;
  }

  private async getUserClaimCounts(userId: number, couponIds: number[]) {
    const map = new Map<number, number>();
    if (!couponIds.length) return map;

    const rows = await this.userCouponRepository
      .createQueryBuilder('userCoupon')
      .select('userCoupon.coupon_id', 'couponId')
      .addSelect('COUNT(*)', 'count')
      .where('userCoupon.user_id = :userId', { userId })
      .andWhere('userCoupon.coupon_id IN (:...couponIds)', { couponIds })
      .groupBy('userCoupon.coupon_id')
      .getRawMany<{ couponId: string; count: string }>();

    for (const row of rows) {
      map.set(Number(row.couponId), Number(row.count));
    }
    return map;
  }

  private async syncExpiredCoupons(userId: number) {
    await this.userCouponRepository
      .createQueryBuilder()
      .update(UserCoupon)
      .set({ status: UserCouponStatus.EXPIRED })
      .where('user_id = :userId', { userId })
      .andWhere('status = :status', { status: UserCouponStatus.AVAILABLE })
      .andWhere('expires_at <= :now', { now: new Date() })
      .execute();
  }

  private async validateCategoryIds(categoryIds?: number[]) {
    if (!categoryIds?.length) return;

    const categories = await this.categoryRepository.find({ where: { id: In(categoryIds) } });
    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('部分分类不存在');
    }
  }

  private validateClaimWindow(claimStartAt: string, claimEndAt: string) {
    if (new Date(claimStartAt).getTime() >= new Date(claimEndAt).getTime()) {
      throw new BadRequestException('领取结束时间必须晚于开始时间');
    }
  }

  private validateAmounts(
    discountAmounts: CreateCouponDto['discountAmounts'],
    minOrderAmounts?: CreateCouponDto['minOrderAmounts'],
  ) {
    const hasDiscount = (discountAmounts.USD ?? 0) > 0 || (discountAmounts.CNY ?? 0) > 0;
    if (!hasDiscount) {
      throw new BadRequestException('请至少设置一种币种的优惠金额');
    }

    for (const currency of ['USD', 'CNY'] as CouponCurrency[]) {
      const discount = discountAmounts[currency];
      const min = minOrderAmounts?.[currency] ?? 0;
      if (discount != null && discount > 0 && min < 0) {
        throw new BadRequestException(`${currency} 门槛金额不能小于 0`);
      }
    }
  }

  private normalizeAmounts(amounts: CreateCouponDto['discountAmounts']) {
    const normalized: Partial<Record<CouponCurrency, number>> = {};
    for (const currency of ['USD', 'CNY'] as CouponCurrency[]) {
      const value = amounts[currency];
      if (value != null && value > 0) {
        normalized[currency] = Number(value);
      }
    }
    return normalized;
  }

  private normalizeMinAmounts(amounts?: CreateCouponDto['minOrderAmounts']) {
    if (!amounts) return null;
    const normalized: Partial<Record<CouponCurrency, number>> = {};
    for (const currency of ['USD', 'CNY'] as CouponCurrency[]) {
      const value = amounts[currency];
      if (value != null && value >= 0) {
        normalized[currency] = Number(value);
      }
    }
    return Object.keys(normalized).length ? normalized : null;
  }
}
