import { Controller, Body, Patch,Param,Post, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicantService } from './applicant.service.js';
import { ApplicantDashboardResponseDto } from './dto/applicant-response.dto.js';
import { ApplicationStatusResponseDto } from './dto/application-status-response.dto.js';
import { ApplicantProfileResponseDto } from './dto/profile-response.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ApplicantProjectsResponseDto } from './dto/project-response.dto.js';
import { ProjectDetailResponseDto } from './dto/project-detail-response.dto.js';
import { UploadTeamFileDto, TeamWorkspaceResponseDto } from './dto/team-workspace-response.dto.js';

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

  @Get('status')
  @ApiOperation({ summary: 'Get applicant application status stages and onboarding checklist visibility' })
  @ApiResponse({
    status: 200,
    description: 'Application status retrieved successfully with stage checkmarks and button visibility.',
    type: ApplicationStatusResponseDto,
  })
  async getApplicationStatus(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getApplicationStatus(userId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get applicant profile details, skills, links, and edit profile action URL' })
  @ApiResponse({
    status: 200,
    description: 'Profile details retrieved successfully.',
    type: ApplicantProfileResponseDto,
  })
  async getProfile(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update applicant profile details (Bio, Skills, Links, Resume)' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully.',
  })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.updateProfile(userId, dto);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get list of projects assigned to applicant with name, description, image, profession, and status' })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully.',
    type: ApplicantProjectsResponseDto,
  })
  async getProjects(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getProjects(userId);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get details for a specific project (Image, Name, Deliverables, Teammates, Mentor Feedback)' })
  @ApiResponse({
    status: 200,
    description: 'Project details retrieved successfully.',
    type: ProjectDetailResponseDto,
  })
  async getProjectDetails(@Req() req: any, @Param('id') projectId: string) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getProjectDetails(userId, projectId);
  }

  @Get('team/workspace')
  @ApiOperation({ summary: 'Get team workspace details (All team members with professions, and shared downloadable files)' })
  @ApiResponse({
    status: 200,
    description: 'Team workspace data retrieved successfully.',
    type: TeamWorkspaceResponseDto,
  })
  async getTeamWorkspace(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getTeamWorkspace(userId);
  }

  @Post('team/files')
  @ApiOperation({ summary: 'Share a file (.fig, .xlsx, .doc, prd, sprint plan) with your team' })
  @ApiResponse({
    status: 201,
    description: 'File shared successfully.',
  })
  async uploadTeamFile(@Req() req: any, @Body() dto: UploadTeamFileDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.uploadTeamFile(userId, dto);
  }
}