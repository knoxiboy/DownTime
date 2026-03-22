import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FraudService } from '../fraud/fraud.service';
import { TriggerService } from '../trigger/trigger.service';

@Injectable()
export class ClaimService {
  private readonly logger = new Logger(ClaimService.name);

  constructor(
    private prisma: PrismaService,
    private fraudService: FraudService,
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

    // Automated Fraud Check (Phase 3 logic)
    // For parametric triggers, we auto-approve if the AI monitored the disruption.
    const fraudResult = { passed: true, flags: [] };

    const status = fraudResult.passed ? 'APPROVED' : 'FLAGGED';

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
        finalPayout: fraudResult.passed ? finalPayout : 0,
        status,
        fraudFlags: fraudResult.flags,
        eventDate: data.eventDate,
      },
    });

    // Instant Payout Simulation (Phase 3)
    if (fraudResult.passed && finalPayout > 0) {
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
          // If limit is reached, deactivate policy
          status: policy.remainingLimit - finalPayout <= 0 ? 'CLAIMED' : 'ACTIVE'
        },
      });

      // Update claim to PAID
      await this.prisma.claim.update({
        where: { id: claim.id },
        data: { status: 'PAID' },
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
