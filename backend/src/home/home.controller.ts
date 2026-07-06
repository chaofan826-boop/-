import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Public()
  @Get('featured')
  getFeatured(@Query('currency') currency?: string) {
    return this.homeService.getFeatured(currency === 'CNY' ? 'CNY' : 'USD');
  }
}
