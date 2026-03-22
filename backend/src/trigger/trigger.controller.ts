import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { TriggerService } from './trigger.service';

@Controller('api/triggers')
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  @Post('check')
  async checkTriggers(
    @Body() body: { city: string; zone: string; rain_mm_hr?: number; temperature_c?: number; aqi?: number; wind_kmh?: number; visibility_km?: number },
  ) {
    return this.triggerService.checkTriggers(body.city, body.zone, {
      rain_mm_hr: body.rain_mm_hr,
      temperature_c: body.temperature_c,
      aqi: body.aqi,
      wind_kmh: body.wind_kmh,
      visibility_km: body.visibility_km,
    });
  }

  @Get('events')
  async getEvents(@Query('limit') limit?: string) {
    return this.triggerService.getRecentEvents(limit ? Number(limit) : 20);
  }
}
