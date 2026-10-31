import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicantService } from './applicant.service.js';
import { ApplicantDashboardResponseDto } from './dto/applicant-response.dto.js';

@ApiTags('Applicant Portal')
@ApiBearerAuth('JWT-auth')
@Controller('applicant')
export class ApplicantController {
  constructor(private readonly applicantService: ApplicantService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get all applicant dashboard metrics (Profile, Mentor, Team, Tasks, Notifications, Project, Progress)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully with full JSON structure.',
    type: ApplicantDashboardResponseDto,
  })
  async getDashboard(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getDashboardData(userId);
  }
}