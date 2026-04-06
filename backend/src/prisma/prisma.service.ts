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
export class PrismaService extends PrismaClient implements OnModuleInit {
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
    this.logger.log('PrismaService initialized with Neon WebSocket adapter.');
    // In a serverless environment like Vercel, we don't want to wait 30s to warm up if the 
    // function only has 10s to execute. Connection will happen on first request.
  }
}
