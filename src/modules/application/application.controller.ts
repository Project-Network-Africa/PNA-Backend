import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApplicationService } from './application.service.js';
import {
  PersonalInfoStageDto,
  ProgramSelectionStageDto,
  ExperiencePortfolioStageDto,
  ReviewAndPaymentStageDto,
  AdmissionReviewDto,
} from './dto/application.dto.js';

@ApiTags('Applicant Application Form')
@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post('stage-1-personal')
  @ApiOperation({ summary: 'Stage 1: Save personal info (Supports Save & Exit or Continue)' })
  async savePersonalInfo(
    @Body() dto: PersonalInfoStageDto,
    @Body('applicationId') applicationId?: string,
  ) {
    return this.applicationService.savePersonalInfo(dto, applicationId);
  }

  @Put(':id/stage-2-program')
  @ApiOperation({ summary: 'Stage 2: Select role track and preferred cohort' })
  async saveProgramSelection(
    @Param('id') applicationId: string,
    @Body() dto: ProgramSelectionStageDto,
  ) {
    return this.applicationService.saveProgramSelection(applicationId, dto);
  }

  @Put(':id/stage-3-experience')
  @ApiOperation({ summary: 'Stage 3: Experience level, portfolio, resume link, and why join question' })
  async saveExperiencePortfolio(
    @Param('id') applicationId: string,
    @Body() dto: ExperiencePortfolioStageDto,
  ) {
    return this.applicationService.saveExperiencePortfolio(applicationId, dto);
  }

  @Post(':id/stage-4-submit')
  @ApiOperation({ summary: 'Stage 4: Review & Payment - Pay & Submit application (Sends emails & returns reference code popup)' })
  async payAndSubmit(
    @Param('id') applicationId: string,
    @Body() dto: ReviewAndPaymentStageDto,
  ) {
    return this.applicationService.payAndSubmitApplication(applicationId, dto);
  }

  @Post('admin/review')
  @ApiOperation({ summary: 'Admissions Team: Review application and accept applicant to trigger portal creation invite email' })
  async reviewAdmission(@Body() dto: AdmissionReviewDto) {
    return this.applicationService.reviewAdmission(dto);
  }
}