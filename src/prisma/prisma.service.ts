import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString = process.env.DATABASE_URL as string;

    const adapter = new PrismaPg({ connectionString });

    super({
      adapter,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
