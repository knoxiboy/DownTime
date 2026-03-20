import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'downtime-backend',
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
