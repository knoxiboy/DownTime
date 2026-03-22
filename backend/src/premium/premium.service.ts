import { Injectable } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';

// Actuarial constants
const BASE_RATE = 0.025;
const MIN_PREMIUM = 15;
const MAX_PREMIUM = 600;

// Seasonal adjustment multipliers (month -> multiplier)
const SEASONAL_MULTIPLIER: Record<number, number> = {
  1: 0.85, 2: 0.80, 3: 0.90, 4: 1.00, 5: 1.10,
  6: 1.30, 7: 1.45, 8: 1.40, 9: 1.25, 10: 1.15,
  11: 1.05, 12: 0.90,
};

export interface PremiumCalculation {
  weeklyIncome: number;
  coverageLimit: number;
  weeklyPremium: number;
  riskScore: number;
  riskLabel: string;
  coveragePct: number;
  riskBreakdown: {
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
  };
  premiumBreakdown: {
    baseComponent: number;
    riskMultiplier: number;
    seasonalAdjustment: number;
    coverageFactor: number;
    noclaimDiscount: number;
  };
}

@Injectable()
export class PremiumService {
  constructor(private readonly riskService: RiskService) {}

  async calculatePremium(params: {
    dailyIncome: number;
    city: string;
    zone: string;
    coveragePct: number;
    workingHours?: number;
    date?: string;
  }): Promise<PremiumCalculation> {
    // Get risk score from AI service
    const risk = await this.riskService.calculateRisk({
      city: params.city,
      zone: params.zone,
      dailyIncome: params.dailyIncome,
      workingHours: params.workingHours ?? 8,
      date: params.date,
    });

    const weeklyIncome = params.dailyIncome * 7;
    const coverageLimit = Math.round(weeklyIncome * params.coveragePct);

    // Actuarial Premium Calculation
    // Step 1: Base component
    const baseComponent = coverageLimit * BASE_RATE;

    // Step 2: Risk multiplier (non-linear — higher risk = disproportionately higher premium)
    const riskMultiplier = 1 + Math.pow(risk.risk_score, 1.5) * 2.5;

    // Step 3: Seasonal adjustment
    const month = new Date().getMonth() + 1;
    const seasonalAdjustment = SEASONAL_MULTIPLIER[month] ?? 1.0;

    // Step 4: Coverage factor (higher coverage % = slightly higher rate)
    const coverageFactor = params.coveragePct <= 0.5 ? 0.90 : params.coveragePct <= 0.7 ? 1.0 : 1.15;

    // Step 5: No-claim discount (simulated — in production, based on worker history)
    const noclaimDiscount = 1.0; // 1.0 = no discount, 0.85 = 15% discount

    // Final formula
    let weeklyPremium = baseComponent * riskMultiplier * seasonalAdjustment * coverageFactor * noclaimDiscount;

    // Enforce bounds
    weeklyPremium = Math.max(MIN_PREMIUM, Math.min(MAX_PREMIUM, weeklyPremium));
    weeklyPremium = Math.round(weeklyPremium * 100) / 100;

    return {
      weeklyIncome,
      coverageLimit,
      weeklyPremium,
      riskScore: risk.risk_score,
      riskLabel: risk.risk_label,
      coveragePct: params.coveragePct,
      riskBreakdown: {
        weather_risk: risk.weather_risk,
        location_risk: risk.location_risk,
        seasonal_risk: risk.seasonal_risk,
        historical_risk: risk.historical_risk,
        wind_risk: risk.wind_risk,
        humidity_risk: risk.humidity_risk,
        uv_risk: risk.uv_risk,
        visibility_risk: risk.visibility_risk,
        flood_risk: risk.flood_risk,
        cyclone_risk: risk.cyclone_risk,
        time_of_day_risk: risk.time_of_day_risk,
      },
      premiumBreakdown: {
        baseComponent: Math.round(baseComponent * 100) / 100,
        riskMultiplier: Math.round(riskMultiplier * 100) / 100,
        seasonalAdjustment,
        coverageFactor,
        noclaimDiscount,
      },
    };
  }

  async calculateAllTiers(params: {
    dailyIncome: number;
    city: string;
    zone: string;
    workingHours?: number;
    date?: string;
  }) {
    const tiers = [
      { name: 'Basic', coveragePct: 0.5 },
      { name: 'Standard', coveragePct: 0.7 },
      { name: 'Premium', coveragePct: 0.9 },
    ];

    const results = await Promise.all(
      tiers.map(async (tier) => ({
        tierName: tier.name,
        ...(await this.calculatePremium({
          ...params,
          coveragePct: tier.coveragePct,
        })),
      })),
    );

    return results;
  }
}
