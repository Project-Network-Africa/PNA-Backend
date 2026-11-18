import { Module } from '@nestjs/common';
import { MentorController } from './mentor.controller.js';
import { MentorService } from './mentor.service.js';

@Module({
  controllers: [MentorController],
  providers: [MentorService],
  exports: [MentorService],
})
export class MentorModule {}