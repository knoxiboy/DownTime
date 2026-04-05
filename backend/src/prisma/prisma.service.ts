import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import * as ws from 'ws';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

neonConfig.webSocketConstructor = ws;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Load .env manually so DATABASE_URL is available
    const envPaths = [
      join(process.cwd(), '.env'),
      join(__dirname, '..', '..', '.env'),
      join(__dirname, '..', '..', '..', '.env'),
    ];
    for (const p of envPaths) {
      if (existsSync(p)) {
        dotenv.config({ path: p, override: true });
        break;
      }
    }

    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);

    // @ts-ignore - Prisma Typescript definitions for driver adapters can be mismatched
    super({ adapter, log: ['error', 'warn'] });
  }

  async onModuleInit() {
    // Neon serverless databases sleep after inactivity.
    this.logger.log('PrismaService initialized with Neon WebSocket adapter.');
    this.warmUpDatabase();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Tries to wake up the Neon compute in the background without crashing the app.
   */
  private async warmUpDatabase(maxRetries = 10, delayMs = 3000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await (this as any).$queryRaw`SELECT 1`;
        this.logger.log(`✅ Neon Database is warm and connected over WebSockets! (attempt ${attempt})`);
        return;
      } catch (err: any) {
        if (attempt < maxRetries) {
          const wait = Math.min(delayMs * attempt, 15000);
          this.logger.warn(`⏳ Waking up Neon... ${err.message}. Retrying in ${wait / 1000}s`);
          await new Promise((r) => setTimeout(r, wait));
        } else {
          this.logger.error(`❌ Could not warm up database. Will connect on first API request.`);
        }
      }
    }
  }
}
