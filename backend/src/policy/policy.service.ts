import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PremiumService } from '../premium/premium.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  constructor(
    private prisma: PrismaService,
    private premiumService: PremiumService,
  ) {}

  async createPolicy(params: { workerId: string; coveragePct: number }) {
    // Fetch worker
    const worker = await this.prisma.worker.findUnique({
      where: { id: params.workerId },
    });
    if (!worker) throw new NotFoundException('Worker not found');

    // Calculate premium
    const premium = await this.premiumService.calculatePremium({
      dailyIncome: worker.dailyIncome,
      city: worker.city,
      zone: worker.zone,
      coveragePct: params.coveragePct,
      workingHours: worker.workingHours,
    });

    // Create policy with week boundaries
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return this.prisma.policy.create({
      data: {
        workerId: params.workerId,
        coveragePct: params.coveragePct,
        coverageLimit: premium.coverageLimit,
        weeklyPremium: premium.weeklyPremium,
        riskScore: premium.riskScore,
        status: 'ACTIVE',
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        remainingLimit: premium.coverageLimit,
      },
    });
  }

  async getActivePolicy(workerId: string) {
    const now = new Date();
    const policy = await this.prisma.policy.findFirst({
      where: {
        workerId,
        status: 'ACTIVE',
        weekEndDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    return policy;
  }

  async getPolicyById(id: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
      include: { claims: true },
    });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  /**
   * Reset remaining_limit every Monday at 00:00 IST for all active policies
   */
  @Cron('0 0 * * 1', { timeZone: 'Asia/Kolkata' })
  async resetWeeklyLimits() {
    this.logger.log('Running weekly policy limit reset...');

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Reset all active policies
    const result = await this.prisma.policy.updateMany({
      where: { status: 'ACTIVE' },
      data: {
        remainingLimit: undefined, // Will be set per-policy below
        weekStartDate: now,
        weekEndDate: weekEnd,
      },
    });

    // Reset remaining limit to coverage limit for each policy individually
    const activePolicies = await this.prisma.policy.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const policy of activePolicies) {
      await this.prisma.policy.update({
        where: { id: policy.id },
        data: { remainingLimit: policy.coverageLimit },
      });
    }

    this.logger.log(`Reset ${activePolicies.length} policies`);
  }
}
