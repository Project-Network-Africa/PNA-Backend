import { Module } from '@nestjs/common';
import { ApplicantController } from './applicant.controller.js';
import { ApplicantService } from './applicant.service.js';
import { TeamChatGateway } from './team-chat.gateway.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [EmailModule],
  controllers: [ApplicantController],
  providers: [ApplicantService, TeamChatGateway],
  exports: [ApplicantService], 
})
export class ApplicantModule {}