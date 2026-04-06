import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { neon } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = (process.env.DATABASE_URL || '').trim();
    
    if (!url) {
      throw new Error('PRISMA_SERVICE: DATABASE_URL is not defined in environment');
    }

    // Standard Neon serverless adapter setup
    const sql = neon(url);
    const adapter = new PrismaNeonHTTP(sql as any);

    super({
      adapter,
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    this.logger.log('PrismaService: Stateless Neon HTTP driver initialized (bypass port 5432).');
    // No explicit $connect() is needed for the stateless adapter.
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (e) {
      // Disconnect is harmless to fail for stateless driver
    }
  }
}
