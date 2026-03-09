import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [PrismaModule, ContactModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
