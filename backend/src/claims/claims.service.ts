import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FraudService } from '../fraud/fraud.service';
import { TriggerService } from '../trigger/trigger.service';

@Injectable()
export class ClaimService {
  private readonly logger = new Logger(ClaimService.name);

  constructor(
    private prisma: PrismaService,
    private fraudService: FraudService,
    @Inject(forwardRef(() => TriggerService))
    private triggerService: TriggerService,
  ) {}

  /**
   * Get all claims for a worker
   */
  async getWorkerClaims(workerId: string) {
    return this.prisma.claim.findMany({
      where: { workerId },
      orderBy: { createdAt: 'desc' },
      include: { payment: true },
    });
  }

  /**
   * Get a single claim by ID
   */
  async getClaimById(id: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id },
      include: { payment: true, policy: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    return claim;
  }

  /**
   * Create a claim (Autonomous or Manual)
   * This handles the core logic of income protection payouts.
   */
  async createClaim(data: {
    policyId: string;
    triggerType: string;
    eventDate: Date;
    hoursLost: number;
    triggerValue?: number;
  }) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: data.policyId },
      include: { worker: true },
    });
    if (!policy) throw new NotFoundException('Policy not found');

    const worker = policy.worker;
    const hourlyIncome = worker.dailyIncome / worker.workingHours;
    const rawPayout = hourlyIncome * data.hoursLost;

    // Apply caps
    let finalPayout = Math.min(rawPayout, policy.coverageLimit);
    finalPayout = Math.min(finalPayout, policy.remainingLimit);
    finalPayout = Math.round(finalPayout * 100) / 100;

    const now = new Date();
    const triggerStart = new Date(now);
    triggerStart.setHours(triggerStart.getHours() - Math.ceil(data.hoursLost));

    // ─── REAL Fraud Detection (wired in Phase 3) ───
    let fraudFlags: string[] = [];
    let mlFraudScore: number | null = null;
    let weatherVerified = false;

    try {
      // 1. Run rule-based fraud checks
      const fraudResult = await this.fraudService.runAllChecks({
        workerId: worker.id,
        claimAmount: rawPayout,
        triggerType: data.triggerType,
        city: worker.city,
        zone: worker.zone,
        eventDate: data.eventDate,
      });
      fraudFlags = fraudResult.flags || [];

      // 2. Cross-verify weather with AI service
      try {
        const axios = require('axios');
        const weatherResp = await axios.get(`http://localhost:8000/weather/live/${worker.city}`);
        const weather = weatherResp.data;
        weatherVerified = weather.source === 'openweathermap_live';

        // Verify the trigger matches actual weather conditions
        if (data.triggerType === 'RAIN' && weather.rain_mm_hr < 5) {
          fraudFlags.push('WEATHER_MISMATCH_RAIN');
        }
        if (data.triggerType === 'HEAT' && weather.temperature_c < 38) {
          fraudFlags.push('WEATHER_MISMATCH_HEAT');
        }
        if (data.triggerType === 'AQI' && weather.aqi < 200) {
          fraudFlags.push('WEATHER_MISMATCH_AQI');
        }

        // 3. ML anomaly detection
        const mlFraudResp = await axios.post('http://localhost:8000/fraud/ml-evaluate', {
          rain_mm_hr: weather.rain_mm_hr || 0,
          temperature_c: weather.temperature_c || 30,
          aqi: weather.aqi || 100,
          wind_kmh: weather.wind_kmh || 10,
          humidity_pct: weather.humidity_pct || 50,
          daily_income: worker.dailyIncome,
          working_hours: worker.workingHours,
          experience_days: worker.experienceDays || 30,
          no_claim_streak: worker.noClaimStreak || 0,
          claims_30d: worker.totalClaims || 0,
        });
        mlFraudScore = mlFraudResp.data.anomaly_score;
        if (mlFraudResp.data.is_anomaly) {
          fraudFlags.push('ML_ANOMALY_DETECTED');
        }
      } catch (aiErr) {
        this.logger.warn(`AI fraud check unavailable: ${aiErr.message}`);
      }
    } catch (fraudErr) {
      this.logger.warn(`Fraud service error: ${fraudErr.message}, auto-approving parametric claim`);
    }

    const isFlagged = fraudFlags.length > 0;
    const status = isFlagged ? 'FLAGGED' : 'APPROVED';

    // Create claim
    const claim = await this.prisma.claim.create({
      data: {
        workerId: worker.id,
        policyId: policy.id,
        triggerType: data.triggerType,
        triggerStart,
        triggerEnd: now,
        hoursLost: data.hoursLost,
        hourlyIncome,
        rawPayout,
        finalPayout: isFlagged ? 0 : finalPayout,
        status,
        fraudFlags,
        weatherVerified,
        mlFraudScore,
        eventDate: data.eventDate,
      },
    });

    // Instant Payout Simulation (Phase 3)
    if (!isFlagged && finalPayout > 0) {
      this.logger.log(`>>> PAYOUT: Initiating Razorpay Sandbox payout of ₹${finalPayout} to worker: ${worker.name} (UPI)`);
      
      const razorpayTxId = `pay_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await this.prisma.payment.create({
        data: {
          claimId: claim.id,
          amount: finalPayout,
          method: 'RAZORPAY_UPI_SANDBOX',
          transactionId: razorpayTxId,
          status: 'SUCCESS',
        },
      });

      // Update remaining limit
      await this.prisma.policy.update({
        where: { id: policy.id },
        data: { 
          remainingLimit: policy.remainingLimit - finalPayout,
          status: policy.remainingLimit - finalPayout <= 0 ? 'CLAIMED' : 'ACTIVE'
        },
      });

      // Update claim to PAID
      await this.prisma.claim.update({
        where: { id: claim.id },
        data: { status: 'PAID' },
      });

      // Update worker stats: reset no-claim streak, increment total claims
      await this.prisma.worker.update({
        where: { id: worker.id },
        data: {
          noClaimStreak: 0,
          totalClaims: { increment: 1 },
        },
      });
    }

    return claim;
  }

  /**
   * Simulate a trigger for demo purposes (Legacy support)
   */
  async simulateTrigger(params: {
    workerId: string;
    triggerType: string;
    hoursLost?: number;
    triggerValue?: number;
  }) {
    const policy = await this.prisma.policy.findFirst({
      where: { workerId: params.workerId, status: 'ACTIVE' },
    });
    if (!policy) throw new NotFoundException('No active policy found');

    return this.createClaim({
      policyId: policy.id,
      triggerType: params.triggerType,
      eventDate: new Date(),
      hoursLost: params.hoursLost ?? 3.5,
      triggerValue: params.triggerValue,
    });
  }
}
