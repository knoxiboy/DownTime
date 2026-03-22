import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimService } from '../claims/claims.service';
import { firstValueFrom } from 'rxjs';

// Enhanced trigger thresholds covering all disruption types
const TRIGGERS = {
  HEAVY_RAIN:       { threshold: 10,  unit: 'mm/hr', hoursLost: 4 },
  TORRENTIAL_RAIN:  { threshold: 20,  unit: 'mm/hr', hoursLost: 6 },
  EXTREME_HEAT:     { threshold: 42,  unit: '°C',    hoursLost: 4 },
  HEAT_ADVISORY:    { threshold: 40,  unit: '°C',    hoursLost: 2 },
  SEVERE_POLLUTION: { threshold: 300, unit: 'AQI',   hoursLost: 4 },
  POOR_AIR_QUALITY: { threshold: 200, unit: 'AQI',   hoursLost: 2 },
  HIGH_WIND:        { threshold: 50,  unit: 'km/h',  hoursLost: 4 },
  WIND_ADVISORY:    { threshold: 35,  unit: 'km/h',  hoursLost: 2 },
  LOW_VISIBILITY:   { threshold: 1.0, unit: 'km',    hoursLost: 3 },
  FLOOD_WARNING:    { threshold: 0.5, unit: 'score', hoursLost: 6 },
  CYCLONE_ALERT:    { threshold: 0.3, unit: 'score', hoursLost: 8 },
  HEAT_INDEX_DANGER:{ threshold: 1,   unit: 'flag',  hoursLost: 3 },
};

// Severity multiplier for hours lost
const SEVERITY_MULTIPLIER: Record<string, number> = {
  NONE: 0,
  LOW: 0.5,
  MODERATE: 1.0,
  HIGH: 1.5,
  CRITICAL: 2.0,
};

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
   * Runs every 5 minutes — scans all active zones for disruptions
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutonomousMonitoring() {
    this.logger.log('>>> SYSTEM: Running Autonomous Multi-Factor Monitoring v2.0...');
    
    const activePolicies = await this.prisma.policy.findMany({
      where: { status: 'ACTIVE' },
      include: { worker: true },
    });

    if (activePolicies.length === 0) {
      this.logger.log('>>> SYSTEM: No active policies. Monitoring paused.');
      return;
    }

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
          this.logger.warn(`!!! DISRUPTION [${weather.severity}]: ${weather.disruption_factors.join(', ')} in ${city}/${zone}`);
          
          // Pick the most severe trigger
          const primaryTrigger = weather.trigger_type;
          const triggerConfig = TRIGGERS[primaryTrigger as keyof typeof TRIGGERS];
          const severityMult = SEVERITY_MULTIPLIER[weather.severity] || 1.0;
          
          // Dynamic hours lost based on severity
          const baseHours = triggerConfig?.hoursLost ?? 3;
          const hoursLost = Math.min(8, Math.round(baseHours * severityMult * 100) / 100);

          // Record ALL trigger events
          for (const factor of weather.disruption_factors) {
            await this.recordTriggerEvent({
              city,
              zone,
              triggerType: factor,
              triggerValue: this.getTriggerValue(factor, weather),
              thresholdValue: TRIGGERS[factor as keyof typeof TRIGGERS]?.threshold || 0,
              startTime: new Date(),
              dataSource: 'AI_MULTI_FACTOR_MONITOR_v2',
            });
          }

          // AUTO-INITIATE CLAIMS for affected workers
          const affectedPolicies = activePolicies.filter(
            p => p.worker.city.toLowerCase() === city.toLowerCase() && 
                 p.worker.zone.toLowerCase() === zone.toLowerCase()
          );

          for (const policy of affectedPolicies) {
            // Check for duplicate claims today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const existingClaim = await this.prisma.claim.findFirst({
              where: {
                policyId: policy.id,
                triggerType: primaryTrigger,
                eventDate: { gte: today },
                status: { in: ['APPROVED', 'PAID'] },
              },
            });

            if (!existingClaim) {
              this.logger.log(`>> Auto-Claim: Policy ${policy.id} | Worker: ${policy.worker.name} | Trigger: ${primaryTrigger} | Hours: ${hoursLost}`);
              await this.claimService.createClaim({
                policyId: policy.id,
                triggerType: primaryTrigger,
                eventDate: new Date(),
                hoursLost,
              });
            } else {
              this.logger.log(`>> Skipped duplicate claim for Policy ${policy.id} (already claimed for ${primaryTrigger} today)`);
            }
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to monitor zone ${city}/${zone}: ${message}`);
      }
    }
  }

  /**
   * Extract trigger value from weather data
   */
  private getTriggerValue(trigger: string, weather: Record<string, unknown>): number {
    const map: Record<string, string> = {
      HEAVY_RAIN: 'rain_mm_hr',
      TORRENTIAL_RAIN: 'rain_mm_hr',
      EXTREME_HEAT: 'temperature_c',
      HEAT_ADVISORY: 'temperature_c',
      SEVERE_POLLUTION: 'aqi',
      POOR_AIR_QUALITY: 'aqi',
      HIGH_WIND: 'wind_kmh',
      WIND_ADVISORY: 'wind_kmh',
      LOW_VISIBILITY: 'visibility_km',
      FLOOD_WARNING: 'flood_risk_score',
      CYCLONE_ALERT: 'cyclone_risk_score',
      HEAT_INDEX_DANGER: 'humidity_pct',
    };
    const key = map[trigger];
    return key ? (weather[key] as number) ?? 0 : 0;
  }

  /**
   * Check all triggers for a city/zone
   */
  async checkTriggers(city: string, zone: string, weatherData?: {
    rain_mm_hr?: number;
    temperature_c?: number;
    aqi?: number;
    wind_kmh?: number;
    visibility_km?: number;
  }) {
    const activeTriggers: Array<{
      type: string;
      value: number;
      threshold: number;
    }> = [];

    const rain = weatherData?.rain_mm_hr ?? 0;
    const temp = weatherData?.temperature_c ?? 30;
    const aqi = weatherData?.aqi ?? 100;
    const wind = weatherData?.wind_kmh ?? 10;
    const vis = weatherData?.visibility_km ?? 8;

    if (rain >= TRIGGERS.HEAVY_RAIN.threshold)
      activeTriggers.push({ type: 'HEAVY_RAIN', value: rain, threshold: TRIGGERS.HEAVY_RAIN.threshold });
    if (temp >= TRIGGERS.EXTREME_HEAT.threshold)
      activeTriggers.push({ type: 'EXTREME_HEAT', value: temp, threshold: TRIGGERS.EXTREME_HEAT.threshold });
    if (aqi >= TRIGGERS.SEVERE_POLLUTION.threshold)
      activeTriggers.push({ type: 'SEVERE_POLLUTION', value: aqi, threshold: TRIGGERS.SEVERE_POLLUTION.threshold });
    if (wind >= TRIGGERS.HIGH_WIND.threshold)
      activeTriggers.push({ type: 'HIGH_WIND', value: wind, threshold: TRIGGERS.HIGH_WIND.threshold });
    if (vis <= TRIGGERS.LOW_VISIBILITY.threshold)
      activeTriggers.push({ type: 'LOW_VISIBILITY', value: vis, threshold: TRIGGERS.LOW_VISIBILITY.threshold });

    return { active_triggers: activeTriggers, city, zone };
  }

  async getRecentEvents(limit: number = 20) {
    return this.prisma.triggerEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

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
