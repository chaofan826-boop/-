import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const AVATAR_MAX_SIZE = 2 * 1024 * 1024;
const PRODUCT_MAX_SIZE = 5 * 1024 * 1024;
const BANNER_MAX_SIZE = 5 * 1024 * 1024;

@Injectable()
export class UploadService implements OnModuleInit {
  readonly avatarsDir = join(process.cwd(), 'uploads', 'avatars');
  readonly productsDir = join(process.cwd(), 'uploads', 'products');
  readonly bannersDir = join(process.cwd(), 'uploads', 'banners');

  onModuleInit() {
    for (const dir of [this.avatarsDir, this.productsDir, this.bannersDir]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  validateImageFile(file: Express.Multer.File, maxSize = AVATAR_MAX_SIZE) {
    if (!file) {
      throw new BadRequestException('Please select an image file');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, GIF and WebP images are allowed');
    }
    if (file.size > maxSize) {
      throw new BadRequestException(`Image size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
  }

  validateAvatarFile(file: Express.Multer.File) {
    this.validateImageFile(file, AVATAR_MAX_SIZE);
  }

  validateProductFile(file: Express.Multer.File) {
    this.validateImageFile(file, PRODUCT_MAX_SIZE);
  }

  validateBannerFile(file: Express.Multer.File) {
    this.validateImageFile(file, BANNER_MAX_SIZE);
  }

  static buildAvatarFilename(userId: number, originalName: string) {
    const ext = extname(originalName).toLowerCase() || '.jpg';
    return `avatar-${userId}-${Date.now()}${ext}`;
  }

  static buildProductFilename(originalName: string) {
    const ext = extname(originalName).toLowerCase() || '.jpg';
    const rand = Math.random().toString(36).slice(2, 8);
    return `product-${Date.now()}-${rand}${ext}`;
  }

  static buildBannerFilename(originalName: string) {
    const ext = extname(originalName).toLowerCase() || '.jpg';
    const rand = Math.random().toString(36).slice(2, 8);
    return `banner-${Date.now()}-${rand}${ext}`;
  }

  toAvatarPublicUrl(filename: string) {
    return `/api/uploads/avatars/${filename}`;
  }

  toProductPublicUrl(filename: string) {
    return `/api/uploads/products/${filename}`;
  }

  toBannerPublicUrl(filename: string) {
    return `/api/uploads/banners/${filename}`;
  }

  /** @deprecated use toAvatarPublicUrl */
  toPublicUrl(filename: string) {
    return this.toAvatarPublicUrl(filename);
  }
}
