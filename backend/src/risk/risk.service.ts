import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface RiskBreakdown {
  risk_score: number;
  weather_risk: number;
  location_risk: number;
  seasonal_risk: number;
  historical_risk: number;
  wind_risk: number;
  humidity_risk: number;
  uv_risk: number;
  visibility_risk: number;
  flood_risk: number;
  cyclone_risk: number;
  time_of_day_risk: number;
  risk_label: string;
}

@Injectable()
export class RiskService {
  private aiServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  async calculateRisk(params: {
    city: string;
    zone: string;
    dailyIncome: number;
    workingHours: number;
    date?: string;
    rainMmHr?: number;
    temperatureC?: number;
    aqi?: number;
    windKmh?: number;
    humidityPct?: number;
    uvIndex?: number;
    visibilityKm?: number;
    disruptionCount30d?: number;
  }): Promise<RiskBreakdown> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/risk/calculate`, {
          city: params.city,
          zone: params.zone,
          daily_income: params.dailyIncome,
          working_hours: params.workingHours,
          date: params.date || new Date().toISOString().split('T')[0],
          rain_mm_hr: params.rainMmHr ?? 0,
          temperature_c: params.temperatureC ?? 30,
          aqi: params.aqi ?? 100,
          wind_kmh: params.windKmh ?? 10,
          humidity_pct: params.humidityPct ?? 50,
          uv_index: params.uvIndex ?? 5,
          visibility_km: params.visibilityKm ?? 8,
          disruption_count_30d: params.disruptionCount30d ?? 0,
        }),
      );
      return response.data;
    } catch {
      // Fallback: calculate risk locally if AI service is unavailable
      return this.calculateRiskFallback(params);
    }
  }

  private calculateRiskFallback(params: {
    city: string;
    zone: string;
    rainMmHr?: number;
    temperatureC?: number;
    aqi?: number;
    windKmh?: number;
    humidityPct?: number;
    uvIndex?: number;
    visibilityKm?: number;
    disruptionCount30d?: number;
  }): RiskBreakdown {
    const rain = params.rainMmHr ?? 0;
    const temp = params.temperatureC ?? 30;
    const aqi = params.aqi ?? 100;
    const wind = params.windKmh ?? 10;
    const humidity = params.humidityPct ?? 50;
    const uv = params.uvIndex ?? 5;
    const visibility = params.visibilityKm ?? 8;

    // Individual risk calculations
    const rainRisk = rain < 2.5 ? 0.1 : rain < 7.5 ? 0.3 : rain < 15 ? 0.6 : rain < 20 ? 0.8 : 1.0;
    const heatRisk = temp < 35 ? 0 : temp < 38 ? 0.2 : temp < 40 ? 0.5 : temp < 42 ? 0.7 : 1.0;
    const aqiRisk = aqi < 100 ? 0 : aqi < 200 ? 0.2 : aqi < 300 ? 0.5 : 1.0;
    const windRisk = wind < 20 ? 0 : wind < 35 ? 0.2 : wind < 50 ? 0.5 : 0.9;
    const humidityRisk = (humidity > 80 && temp > 35) ? 0.5 : 0;
    const uvRisk = uv < 6 ? 0 : uv < 8 ? 0.2 : uv < 11 ? 0.5 : 0.8;
    const visibilityRisk = visibility > 5 ? 0 : visibility > 2 ? 0.2 : visibility > 1 ? 0.5 : 1.0;
    const floodRisk = rain > 15 ? 0.6 : rain > 10 ? 0.3 : 0;
    const cycloneRisk = 0;
    const todRisk = 0.5;

    const weatherRisk = Math.min(1.0,
      rainRisk * 0.20 + heatRisk * 0.12 + aqiRisk * 0.12 +
      windRisk * 0.15 + humidityRisk * 0.08 + uvRisk * 0.05 +
      visibilityRisk * 0.10 + floodRisk * 0.10 + cycloneRisk * 0.08
    );

    const locationRisk = this.getLocationRisk(params.city, params.zone);
    const seasonalRisk = this.calcSeasonalRisk(params.city);
    const historicalRisk = this.calcHistoricalRisk(params.disruptionCount30d ?? 0);

    let riskScore = weatherRisk * 0.35 + locationRisk * 0.20 + seasonalRisk * 0.15 +
                    historicalRisk * 0.10 + todRisk * 0.10 + cycloneRisk * 0.10;
    riskScore = Math.round(Math.max(0.05, Math.min(0.95, riskScore)) * 1000) / 1000;

    const riskLabel = riskScore < 0.25 ? 'Low' : riskScore < 0.45 ? 'Moderate' :
                      riskScore < 0.65 ? 'High' : riskScore < 0.80 ? 'Very High' : 'Critical';

    return {
      risk_score: riskScore,
      weather_risk: Math.round(weatherRisk * 1000) / 1000,
      location_risk: locationRisk,
      seasonal_risk: seasonalRisk,
      historical_risk: historicalRisk,
      wind_risk: Math.round(windRisk * 1000) / 1000,
      humidity_risk: Math.round(humidityRisk * 1000) / 1000,
      uv_risk: Math.round(uvRisk * 1000) / 1000,
      visibility_risk: Math.round(visibilityRisk * 1000) / 1000,
      flood_risk: Math.round(floodRisk * 1000) / 1000,
      cyclone_risk: 0,
      time_of_day_risk: todRisk,
      risk_label: riskLabel,
    };
  }

  private getLocationRisk(city: string, zone: string): number {
    const map: Record<string, Record<string, number>> = {
      hyderabad: { kondapur: 0.55, hitech_city: 0.4, secunderabad: 0.65, gachibowli: 0.35, default: 0.5 },
      mumbai: { dharavi: 0.85, bandra: 0.6, andheri: 0.7, default: 0.65 },
      bangalore: { whitefield: 0.45, koramangala: 0.5, default: 0.48 },
      delhi: { connaught_place: 0.55, dwarka: 0.45, rohini: 0.5, default: 0.5 },
    };
    const cityData = map[city.toLowerCase()] || { default: 0.5 };
    return cityData[zone.toLowerCase().replace(/ /g, '_')] || cityData.default || 0.5;
  }

  private calcSeasonalRisk(city: string): number {
    const month = new Date().getMonth() + 1;
    const monsoonCities = ['hyderabad', 'mumbai', 'chennai', 'kolkata'];
    if (monsoonCities.includes(city.toLowerCase())) {
      if ([7, 8].includes(month)) return 0.90;
      if ([6, 9].includes(month)) return 0.75;
      if ([5, 10].includes(month)) return 0.55;
      if ([3, 4].includes(month)) return 0.40;
      return 0.15;
    }
    if ([6, 7, 8].includes(month)) return 0.65;
    if ([4, 5].includes(month)) return 0.45;
    if ([12, 1].includes(month)) return 0.35;
    return 0.20;
  }

  private calcHistoricalRisk(count: number): number {
    return Math.round((1.0 / (1.0 + Math.exp(-0.5 * (count - 5)))) * 1000) / 1000;
  }
}
