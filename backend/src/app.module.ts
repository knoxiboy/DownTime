import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WorkerModule } from './worker/worker.module';
import { RiskModule } from './risk/risk.module';
import { PremiumModule } from './premium/premium.module';
import { PolicyModule } from './policy/policy.module';
import { FraudModule } from './fraud/fraud.module';
import { TriggerModule } from './trigger/trigger.module';
import { ClaimsModule } from './claims/claims.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: ['.env', '../.env', '.env.local']
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    PrismaModule,
    WorkerModule,
    RiskModule,
    PremiumModule,
    PolicyModule,
    FraudModule,
    TriggerModule,
    ClaimsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
