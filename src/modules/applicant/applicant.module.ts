import { Module } from '@nestjs/common';
import { ApplicantController } from './applicant.controller.js';
import { ApplicantService } from './applicant.service.js';

@Module({
  imports: [],
  controllers: [ApplicantController],
  providers: [ApplicantService],
  exports: [ApplicantService], 
})
export class ApplicantModule {}