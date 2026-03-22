import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Worker dashboard data — enriched with real-time stats
   */
  async getWorkerDashboard(workerId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
    });

    const activePolicy = await this.prisma.policy.findFirst({
      where: {
        workerId,
        status: 'ACTIVE',
        weekEndDate: { gte: new Date() },
      },
    });

    const recentClaims = await this.prisma.claim.findMany({
      where: { workerId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { payment: true },
    });

    // Stats
    const paidClaims = recentClaims.filter((c) => c.status === 'PAID');
    const totalPayouts = paidClaims.reduce((sum, c) => sum + c.finalPayout, 0);
    
    // Protected days = unique dates with paid claims
    const protectedDays = new Set(
      paidClaims.map((c) => c.eventDate.toISOString().split('T')[0]),
    ).size;

    // Active triggers (last 24h)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const activeTriggers = await this.prisma.triggerEvent.count({
      where: { createdAt: { gte: oneDayAgo }, isActive: true },
    });

    // Coverage utilization
    const coverageUtilization = activePolicy
      ? Math.round(((activePolicy.coverageLimit - activePolicy.remainingLimit) / activePolicy.coverageLimit) * 100)
      : 0;

    // Get latest active trigger event for this worker's zone
    let activeEvent = null;
    if (worker) {
      const latestEvent = await this.prisma.triggerEvent.findFirst({
        where: {
          city: { equals: worker.city, mode: 'insensitive' },
          zone: { equals: worker.zone, mode: 'insensitive' },
          isActive: true,
          createdAt: { gte: oneDayAgo },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (latestEvent) {
        activeEvent = {
          triggerType: latestEvent.triggerType,
          city: latestEvent.city,
          zone: latestEvent.zone,
          startTime: latestEvent.startTime.toISOString(),
          value: latestEvent.triggerValue,
        };
      }
    }

    return {
      worker,
      activePolicy,
      claims: recentClaims,
      activeEvent,
      stats: {
        totalPayouts: Math.round(totalPayouts * 100) / 100,
        protectedDays,
        activeTriggers,
        coverageUtilization,
        totalClaims: recentClaims.length,
        approvedClaims: recentClaims.filter((c) => ['APPROVED', 'PAID'].includes(c.status)).length,
        flaggedClaims: recentClaims.filter((c) => c.status === 'FLAGGED').length,
      },
    };
  }

  /**
   * Admin/insurer dashboard — comprehensive analytics
   */
  async getAdminDashboard() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      activePoliciesCount,
      totalWorkers,
      weeklyPolicies,
      weeklyClaims,
      flaggedClaimsCount,
      activeTriggerEvents,
      allClaims,
    ] = await Promise.all([
      this.prisma.policy.count({ where: { status: 'ACTIVE', weekEndDate: { gte: now } } }),
      this.prisma.worker.count(),
      this.prisma.policy.findMany({ where: { status: 'ACTIVE', createdAt: { gte: weekAgo } } }),
      this.prisma.claim.findMany({ where: { status: 'PAID', createdAt: { gte: weekAgo } } }),
      this.prisma.claim.count({ where: { status: 'FLAGGED' } }),
      this.prisma.triggerEvent.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.claim.findMany({ where: { createdAt: { gte: weekAgo } }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    const totalPremiumsThisWeek = weeklyPolicies.reduce((sum, p) => sum + p.weeklyPremium, 0);
    const totalPayoutsThisWeek = weeklyClaims.reduce((sum, c) => sum + c.finalPayout, 0);
    const lossRatio = totalPremiumsThisWeek > 0
      ? Math.round((totalPayoutsThisWeek / totalPremiumsThisWeek) * 100 * 100) / 100
      : 0;

    // Trigger type distribution
    const triggerDistribution: Record<string, number> = {};
    allClaims.forEach((c) => {
      triggerDistribution[c.triggerType] = (triggerDistribution[c.triggerType] || 0) + 1;
    });

    return {
      activePolicies: activePoliciesCount,
      totalWorkers,
      totalPremiumsThisWeek: Math.round(totalPremiumsThisWeek * 100) / 100,
      totalPayoutsThisWeek: Math.round(totalPayoutsThisWeek * 100) / 100,
      lossRatio,
      activeTriggerEvents,
      flaggedClaims: flaggedClaimsCount,
      weeklyClaimsCount: weeklyClaims.length,
      triggerDistribution,
      profitability: totalPremiumsThisWeek > 0
        ? Math.round((totalPremiumsThisWeek - totalPayoutsThisWeek) * 100) / 100
        : 0,
    };
  }
}
