import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { TriggerService } from './trigger.service';

@Controller('api/triggers')
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  @Post('check')
  async checkTriggers(
    @Body() body: { city: string; zone: string; rain_mm_hr?: number; temperature_c?: number; aqi?: number },
  ) {
    return this.triggerService.checkTriggers(body.city, body.zone, {
      rain_mm_hr: body.rain_mm_hr,
      temperature_c: body.temperature_c,
      aqi: body.aqi,
    });
  }

  @Get('events')
  async getEvents(@Query('limit') limit?: string) {
    return this.triggerService.getRecentEvents(limit ? Number(limit) : 20);
  }

  @Get('zone-status')
  async getZoneStatus(@Query('city') city: string, @Query('zone') zone: string) {
    return { status: this.triggerService.getZoneStatus(city, zone) };
  }

  @Post('zone-status')
  async setZoneStatus(@Body() body: { city: string; zone: string; status: string }) {
    return this.triggerService.setZoneStatus(body.city, body.zone, body.status);
  }
}
