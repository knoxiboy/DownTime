import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workerId = 'user-seed-123';

  // 1. Create Worker
  const worker = await prisma.worker.upsert({
    where: { id: workerId },
    update: {},
    create: {
      id: workerId,
      name: 'Rahul Kumar',
      phone: '9876543210',
      city: 'hyderabad',
      zone: 'Kondapur',
      platform: 'zepto',
      dailyIncome: 700,
      workingHours: 10,
    },
  });

  console.log('Upserted worker:', worker.name);

  // 2. Create an Active Policy
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of current week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7); // End of current week

  const coveragePct = 0.7;
  const coverageLimit = 700 * 7 * coveragePct; // daily * 7 * pct

  const policy = await prisma.policy.create({
    data: {
      workerId: worker.id,
      coveragePct,
      coverageLimit,
      weeklyPremium: 150,
      riskScore: 45,
      status: 'ACTIVE',
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      remainingLimit: coverageLimit - 250, // simulated some usage
    },
  });

  console.log('Created active policy for:', worker.name);

  // 3. Create some past claims
  const claim1 = await prisma.claim.create({
    data: {
      workerId: worker.id,
      policyId: policy.id,
      triggerType: 'RAIN',
      triggerStart: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      triggerEnd: new Date(now.getTime() - 22 * 60 * 60 * 1000),
      hoursLost: 2,
      hourlyIncome: 70,
      rawPayout: 140,
      finalPayout: 140,
      status: 'PAID',
      eventDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
  });

  const claim2 = await prisma.claim.create({
    data: {
      workerId: worker.id,
      policyId: policy.id,
      triggerType: 'AQI',
      triggerStart: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      triggerEnd: new Date(now.getTime() - 44 * 60 * 60 * 1000),
      hoursLost: 4,
      hourlyIncome: 70,
      rawPayout: 280,
      finalPayout: 280,
      status: 'PAID',
      eventDate: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
  });

  console.log('Created sample claims');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
