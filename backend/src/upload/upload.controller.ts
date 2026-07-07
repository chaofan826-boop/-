import {
  Controller,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(process.cwd(), 'uploads', 'avatars'));
        },
        filename: (req, file, cb) => {
          const userId = (req as { user?: { id: number } }).user?.id ?? 0;
          cb(null, UploadService.buildAvatarFilename(userId, file.originalname));
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @Request() req: { user: { id: number } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.uploadService.validateAvatarFile(file);
    return { url: this.uploadService.toAvatarPublicUrl(file.filename) };
  }

  @Post('product')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('products')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(process.cwd(), 'uploads', 'products'));
        },
        filename: (_req, file, cb) => {
          cb(null, UploadService.buildProductFilename(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadProduct(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateProductFile(file);
    return { url: this.uploadService.toProductPublicUrl(file.filename) };
  }

  @Post('banner')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('banners')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(process.cwd(), 'uploads', 'banners'));
        },
        filename: (_req, file, cb) => {
          cb(null, UploadService.buildBannerFilename(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadBanner(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateBannerFile(file);
    return { url: this.uploadService.toBannerPublicUrl(file.filename) };
  }
}
