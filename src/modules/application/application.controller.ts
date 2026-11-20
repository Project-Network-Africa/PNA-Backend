import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApplicationService } from './application.service.js';
import type{ UploadedResumeFile } from './application.service.js';
import {
  PersonalInfoStageDto,
  ProgramSelectionStageDto,
  ExperiencePortfolioStageDto,
  InitializePaymentDto,
  VerifyPaymentDto,
  AdmissionReviewDto,
} from './dto/application.dto.js';

@ApiTags('Applicant Application Form')
@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  // STAGE 1: Personal Information
  @Post('stage-1-personal')
  @ApiOperation({ summary: 'Stage 1: Save personal info (Supports Save & Exit or Continue)' })
  async savePersonalInfo(
    @Body() dto: PersonalInfoStageDto,
    @Body('applicationId') applicationId?: string,
  ) {
    return this.applicationService.savePersonalInfo(dto, applicationId);
  }

  // STAGE 2: Tracks & Cohorts ONLY (No payment here)
  @Get('stage-2-options')
  @ApiOperation({ summary: 'Stage 2: Get available tracks and cohorts from Supabase' })
  async getStage2Options() {
    return this.applicationService.getStage2Options();
  }

  @Put(':id/stage-2-program')
  @ApiOperation({ summary: 'Stage 2: Save selected track and cohort' })
  async saveProgramSelection(
    @Param('id') applicationId: string,
    @Body() dto: ProgramSelectionStageDto,
  ) {
    return this.applicationService.saveProgramSelection(applicationId, dto);
  }

  // STAGE 3: Experience & Portfolio with actual CV File Upload (multipart/form-data)
  @Put(':id/stage-3-experience')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Stage 3: Upload CV file and save experience, portfolio, and whyJoin' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['experienceLevel', 'whyJoin', 'resume'],
      properties: {
        experienceLevel: { type: 'string', enum: ['Beginner', 'Some Experience', 'Experienced'] },
        portfolioLink: { type: 'string' },
        linkedinLink: { type: 'string' },
        whyJoin: { type: 'string' },
        resume: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('resume'))
  async saveExperiencePortfolio(
    @Param('id') applicationId: string,
    @Body() dto: ExperiencePortfolioStageDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB max
          new FileTypeValidator({
            fileType: /(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document)/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    resume?: UploadedResumeFile,
  ) {
    return this.applicationService.saveExperiencePortfolio(applicationId, dto, resume);
  }

  // STAGE 4: Review & Payment (Paystack & Nestuge)
  @Get(':id/stage-4-summary')
  @ApiOperation({
    summary: 'Stage 4: Get application review summary, cohort fee, and payment methods (Paystack & Nestuge)',
  })
  async getStage4Summary(@Param('id') applicationId: string) {
    return this.applicationService.getStage4ReviewSummary(applicationId);
  }

  @Post(':id/stage-4-initialize-payment')
  @ApiOperation({ summary: 'Stage 4A: Initialize Paystack or Nestuge checkout link' })
  async initializeStage4Payment(
    @Param('id') applicationId: string,
    @Body() dto: InitializePaymentDto,
  ) {
    return this.applicationService.initializeStage4Payment(applicationId, dto);
  }

  @Post(':id/stage-4-verify-submit')
  @ApiOperation({
    summary: 'Stage 4B: Verify Paystack/Nestuge payment, generate #PNA reference code, and send emails',
  })
  async verifyAndSubmitApplication(
    @Param('id') applicationId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.applicationService.verifyAndSubmitApplication(applicationId, dto);
  }

  // ADMISSIONS TEAM REVIEW
  @Post('admin/review')
  @ApiOperation({ summary: 'Admissions Team: Accept/Reject application and send portal creation link' })
  async reviewAdmission(@Body() dto: AdmissionReviewDto) {
    return this.applicationService.reviewAdmission(dto);
  }
}