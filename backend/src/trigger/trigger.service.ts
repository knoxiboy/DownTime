import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Mock zone status data
const ZONE_STATUS: Record<string, Record<string, string>> = {
  hyderabad: { kondapur: 'open', hitech_city: 'open', secunderabad: 'open', gachibowli: 'open' },
  mumbai: { dharavi: 'open', bandra: 'open', andheri: 'open' },
  bangalore: { whitefield: 'open', koramangala: 'open' },
  delhi: { connaught_place: 'open', dwarka: 'open', rohini: 'open' },
};

// Trigger thresholds
const TRIGGERS = {
  RAIN: { threshold: 20, unit: 'mm/hr' },
  AQI: { threshold: 300, unit: 'index' },
  HEAT: { threshold: 42, unit: '°C' },
  ZONE_CLOSURE: { threshold: 1, unit: 'boolean' }, // 1 = closed
};

// Severity order (highest first)
const SEVERITY_ORDER = ['ZONE_CLOSURE', 'RAIN', 'AQI', 'HEAT'];

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check all triggers for a city/zone
   */
  async checkTriggers(city: string, zone: string, weatherData?: {
    rain_mm_hr?: number;
    temperature_c?: number;
    aqi?: number;
  }) {
    const activeTriggers: Array<{
      type: string;
      value: number;
      threshold: number;
      severity: number;
    }> = [];

    const rain = weatherData?.rain_mm_hr ?? 0;
    const temp = weatherData?.temperature_c ?? 30;
    const aqi = weatherData?.aqi ?? 100;

    // Check rain trigger
    if (rain >= TRIGGERS.RAIN.threshold) {
      activeTriggers.push({
        type: 'RAIN',
        value: rain,
        threshold: TRIGGERS.RAIN.threshold,
        severity: SEVERITY_ORDER.indexOf('RAIN'),
      });
    }

    // Check AQI trigger
    if (aqi >= TRIGGERS.AQI.threshold) {
      activeTriggers.push({
        type: 'AQI',
        value: aqi,
        threshold: TRIGGERS.AQI.threshold,
        severity: SEVERITY_ORDER.indexOf('AQI'),
      });
    }

    // Check heat trigger
    if (temp >= TRIGGERS.HEAT.threshold) {
      activeTriggers.push({
        type: 'HEAT',
        value: temp,
        threshold: TRIGGERS.HEAT.threshold,
        severity: SEVERITY_ORDER.indexOf('HEAT'),
      });
    }

    // Check zone closure
    const zoneStatus = this.getZoneStatus(city, zone);
    if (zoneStatus === 'closed') {
      activeTriggers.push({
        type: 'ZONE_CLOSURE',
        value: 1,
        threshold: 1,
        severity: SEVERITY_ORDER.indexOf('ZONE_CLOSURE'),
      });
    }

    // Sort by severity (lowest index = highest severity)
    activeTriggers.sort((a, b) => a.severity - b.severity);

    return { active_triggers: activeTriggers, city, zone };
  }

  /**
   * Get mock zone status
   */
  getZoneStatus(city: string, zone: string): string {
    const cityData = ZONE_STATUS[city.toLowerCase()] || {};
    return cityData[zone.toLowerCase().replace(/ /g, '_')] || 'open';
  }

  /**
   * Set zone status (for simulation)
   */
  setZoneStatus(city: string, zone: string, status: string) {
    const cityKey = city.toLowerCase();
    const zoneKey = zone.toLowerCase().replace(/ /g, '_');
    if (!ZONE_STATUS[cityKey]) ZONE_STATUS[cityKey] = {};
    ZONE_STATUS[cityKey][zoneKey] = status;
    return { city: cityKey, zone: zoneKey, status };
  }

  /**
   * Calculate hours lost from a trigger event
   */
  calculateHoursLost(
    triggerStart: Date,
    triggerEnd: Date,
    workStartHour: number = 9,
    workEndHour: number = 19,
    dailyWorkHours: number = 8,
  ): number {
    const dayStart = new Date(triggerStart);
    dayStart.setHours(workStartHour, 0, 0, 0);
    const dayEnd = new Date(triggerStart);
    dayEnd.setHours(workEndHour, 0, 0, 0);

    const effectiveStart = triggerStart > dayStart ? triggerStart : dayStart;
    const effectiveEnd = triggerEnd < dayEnd ? triggerEnd : dayEnd;

    if (effectiveEnd <= effectiveStart) return 0;

    const hoursLost = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
    return Math.round(Math.min(hoursLost, dailyWorkHours) * 100) / 100;
  }

  /**
   * List recent trigger events from database
   */
  async getRecentEvents(limit: number = 20) {
    return this.prisma.triggerEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Record a trigger event
   */
  async recordTriggerEvent(data: {
    city: string;
    zone: string;
    triggerType: string;
    triggerValue: number;
    thresholdValue: number;
    startTime: Date;
    endTime?: Date;
    dataSource: string;
  }) {
    return this.prisma.triggerEvent.create({ data });
  }
}
