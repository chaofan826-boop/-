import { IsBoolean } from 'class-validator';

export class UpdateBannerSettingsDto {
  @IsBoolean()
  carouselEnabled: boolean;
}
