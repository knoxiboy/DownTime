import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimService } from '../claims/claims.service';
import { firstValueFrom } from 'rxjs';

// Mock zone status data
const ZONE_STATUS: Record<string, Record<string, string>> = {
  hyderabad: { kondapur: 'open', hitech_city: 'open', secunderabad: 'open', gachibowli: 'open' },
  mumbai: { dharavi: 'open', bandra: 'open', andheri: 'open' },
  bangalore: { whitefield: 'open', koramangala: 'open' },
  delhi: { connaught_place: 'open', dwarka: 'open', rohini: 'open' },
};

// Trigger thresholds
const TRIGGERS = {
  RAIN: { threshold: 10, unit: 'mm/hr' }, // Lowered to 10 for more visible triggers in demo
  AQI: { threshold: 300, unit: 'index' },
  HEAT: { threshold: 40, unit: '°C' },
  ZONE_CLOSURE: { threshold: 1, unit: 'boolean' }, // 1 = closed
};

// Severity order (highest first)
const SEVERITY_ORDER = ['ZONE_CLOSURE', 'RAIN', 'AQI', 'HEAT'];

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  constructor(
    private prisma: PrismaService,
    private http: HttpService,
    private config: ConfigService,
    @Inject(forwardRef(() => ClaimService))
    private claimService: ClaimService,
  ) {}

  /**
   * Autonomous Monitoring Loop (Cron)
   * Runs every 5 minutes in demo mode (simulating real-time policing)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutonomousMonitoring() {
    this.logger.log('>>> SYSTEM: Running Autonomous Parametric Monitoring...');
    
    // 1. Find all active policies WITH their worker's city/zone
    const activePolicies = await this.prisma.policy.findMany({
      where: { status: 'ACTIVE' },
      include: { worker: true },
    });

    if (activePolicies.length === 0) {
      this.logger.log('>>> SYSTEM: No active policies found. Monitoring paused.');
      return;
    }

    // 2. Identify unique disrupted zones
    const uniqueZones = Array.from(new Set(activePolicies.map(p => `${p.worker.city}|${p.worker.zone}`)));
    const aiServiceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://127.0.0.1:8000');

    for (const zoneKey of uniqueZones) {
      const [city, zone] = zoneKey.split('|');
      
      try {
        const response = await firstValueFrom(
          this.http.get(`${aiServiceUrl}/weather/current`, {
            params: { city, zone }
          })
        );

        const weather = response.data;
        
        if (weather.is_disrupted) {
          this.logger.warn(`!!! DISRUPTION DETECTED: [${weather.trigger_type}] in ${city}/${zone}`);
          
          // 3. Record the event
          await this.recordTriggerEvent({
            city: city,
            zone: zone,
            triggerType: weather.trigger_type,
            triggerValue: weather.rain_mm_hr || weather.aqi || weather.temperature_c,
            thresholdValue: TRIGGERS[weather.trigger_type]?.threshold || 0,
            startTime: new Date(),
            dataSource: 'AI_DYNAMIC_MONITOR',
          });

          // 4. AUTO-INITIATE CLAIMS for all workers in this specific zone
          const affectedPolicies = activePolicies.filter(p => p.worker.city === city && p.worker.zone === zone);

          for (const policy of affectedPolicies) {
            this.logger.log(`>> Creating Automated Claim for Policy: ${policy.id} (Worker: ${policy.worker.name})`);
            await this.claimService.createClaim({
              policyId: policy.id,
              triggerType: weather.trigger_type,
              eventDate: new Date(),
              hoursLost: 4, 
            });
          }
        }
      } catch (error) {
        this.logger.error(`Failed to monitor zone ${city}/${zone}: ${error.message}`);
      }
    }
  }

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
