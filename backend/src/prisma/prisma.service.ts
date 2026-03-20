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
        dotenv.config({ path });
        break;
      }
    }
    
    // Final fallback for hackathon environment flakiness
    const FALLBACK_URL = 'postgresql://neondb_owner:npg_prgXBvC3e6DM@ep-gentle-resonance-amyt7r03-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
    const url = process.env.DATABASE_URL || FALLBACK_URL;
    
    console.log('PRISMA_SERVICE: Using DATABASE_URL:', !!process.env.DATABASE_URL ? 'FROM ENV' : 'FROM HARDCODED FALLBACK');

    super({

      datasources: {
        db: {
          url: url,
        },
      },
      log: ['error', 'info', 'warn'],
    });
  }

  async onModuleInit() {
    console.log('PRISMA_SERVICE: Connecting to database...');
    try {
      await this.$connect();
      console.log('PRISMA_SERVICE: ✅ Connected to Neon database successfully!');
    } catch (err) {
      console.error('PRISMA_SERVICE: ❌ Connection failed!', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

