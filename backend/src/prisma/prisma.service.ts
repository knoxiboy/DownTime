import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';


@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 1. Try to find .env in various locations
    const possiblePaths = [
      join(process.cwd(), '.env'),
      join(process.cwd(), '..', '.env'),
      join(__dirname, '..', '..', '.env'), // relative to src/prisma
      join(__dirname, '..', '..', '..', '.env'), // relative to dist/src/prisma
    ];

    console.log('PRISMA_SERVICE: Searching for .env in:', possiblePaths);
    
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        console.log('PRISMA_SERVICE: Found .env at:', path);
        dotenv.config({ path, override: true });
        break;
      }
    }
    
    const url = (process.env.DATABASE_URL || '').trim();
    console.log('PRISMA_SERVICE: Using DATABASE_URL from environment variable. Length: ', url.length);

    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    console.log('PRISMA_SERVICE: Using native TCP connection to Neon database');
    try {
      await this.$connect();
      console.log('PRISMA_SERVICE: ✅ Native driver initialized and connected successfully!');
    } catch (err) {
      console.error('PRISMA_SERVICE: ❌ Initialization failed!', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

