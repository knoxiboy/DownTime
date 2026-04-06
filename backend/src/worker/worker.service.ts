import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkerDto, UpdateWorkerDto } from './dto/worker.dto';

@Injectable()
export class WorkerService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkerDto) {
    try {
      return await this.prisma.worker.create({
        data: {
          name: dto.name,
          phone: dto.phone,
          city: dto.city,
          zone: dto.zone,
          platform: dto.platform,
          dailyIncome: dto.dailyIncome,
          workingHours: dto.workingHours ?? 8,
          workStartHour: dto.workStartHour ?? 9,
          workEndHour: dto.workEndHour ?? 19,
        },
      });
    } catch (err: any) {
      console.error('[WorkerService] Registration Error:', err.message, err.stack);
      throw err;
    }
  }

  async findById(id: string) {
    const worker = await this.prisma.worker.findUnique({ where: { id } });
    if (!worker) throw new NotFoundException(`Worker ${id} not found`);
    return worker;
  }

  async update(id: string, dto: UpdateWorkerDto) {
    await this.findById(id);
    return this.prisma.worker.update({ where: { id }, data: dto });
  }

  async findAll() {
    return this.prisma.worker.findMany();
  }

  async findByPhone(phone: string) {
    return this.prisma.worker.findUnique({ where: { phone } });
  }
}
