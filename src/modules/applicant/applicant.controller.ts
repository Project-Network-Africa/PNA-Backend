import { Controller, Body, Patch, Param,Post, Get, Req, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicantService } from './applicant.service.js';
import { ApplicantDashboardResponseDto } from './dto/applicant-response.dto.js';
import { ApplicationStatusResponseDto } from './dto/application-status-response.dto.js';
import { ApplicantProfileResponseDto } from './dto/profile-response.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ApplicantProjectsResponseDto } from './dto/project-response.dto.js';
import { ProjectDetailResponseDto } from './dto/project-detail-response.dto.js';
import { UploadTeamFileDto, TeamWorkspaceResponseDto } from './dto/team-workspace-response.dto.js';
import { MentorshipResponseDto } from './dto/mentorship-response.dto.js';
import { MakePaymentDto, PaymentPageResponseDto } from './dto/payment.dto.js';
import { LearningResourcesResponseDto, SearchLearningResourceQueryDto } from './dto/learning-resources-response.dto.js';
import { NotificationsResponseDto } from './dto/notification-response.dto.js';
import { UpdateSettingsDto } from './dto/settings.dto.js';
import { EditProfileResponseDto, UpdateEditProfileDto } from './dto/edit-profile.dto.js';
import { ConfirmScheduleSessionDto, ScheduleSessionViewResponseDto } from './dto/schedule-session.dto.js';
import { OnboardingChecklistResponseDto } from './dto/onboarding-checklist.dto.js';


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

  @Get('mentorship')
  @ApiOperation({ summary: 'Get mentorship page data (Applicant profile pic & profession, schedule session action URL, session history, and mentor notes)' })
  @ApiResponse({
    status: 200,
    description: 'Mentorship data retrieved successfully.',
    type: MentorshipResponseDto,
  })
  async getMentorshipData(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getMentorshipData(userId);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payment details, outstanding balance, current cohort fee, available payment methods, and payment history' })
  @ApiResponse({
    status: 200,
    description: 'Payment information retrieved successfully.',
    type: PaymentPageResponseDto,
  })
  async getPayments(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getPaymentData(userId);
  }

  @Post('payments/pay')
  @ApiOperation({ summary: 'Make payment using chosen payment method (Paystack, Stripe, Paypal, Debit Card) and card details' })
  @ApiResponse({
    status: 201,
    description: 'Payment processed successfully.',
  })
  async makePayment(@Req() req: any, @Body() dto: MakePaymentDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.processPayment(userId, dto);
  }

  @Get('resources')
  @ApiOperation({ summary: 'Get admin-shared learning resources (.pdfs with pages, docs with pages, mp4s & videos with duration mins) with search filter' })
  @ApiResponse({
    status: 200,
    description: 'Learning resources retrieved successfully.',
    type: LearningResourcesResponseDto,
  })
  async getLearningResources(@Query() query: SearchLearningResourceQueryDto) {
    return this.applicantService.getLearningResources(query.search);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get list of notifications (mentor feedback, cohort town hall, payment success, receipts, team shared files, etc.)' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully.',
    type: NotificationsResponseDto,
  })
  async getNotifications(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getNotifications(userId);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get applicant settings (Full name, email, notification preferences, privacy toggles)' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully.' })
  async getSettings(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getSettings(userId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update applicant full name, email, notification preferences, and privacy toggles' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully.' })
  async updateSettings(@Req() req: any, @Body() dto: UpdateSettingsDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.updateSettings(userId, dto);
  }

  @Post('settings/download-data')
  @ApiOperation({ summary: 'Download applicant data export package' })
  @ApiResponse({ status: 200, description: 'Data compiled for download.' })
  async downloadData(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.downloadMyData(userId);
  }

  @Post('settings/request-deletion')
  @ApiOperation({ summary: 'Request account and data deletion' })
  @ApiResponse({ status: 201, description: 'Deletion request sent successfully.' })
  async requestDeletion(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.requestDataDeletion(userId);
  }

  @Get('settings/privacy-policy')
  @ApiOperation({ summary: 'View platform privacy policy details' })
  @ApiResponse({ status: 200, description: 'Privacy policy retrieved.' })
  getPrivacyPolicy() {
    return this.applicantService.getPrivacyPolicy();
  }

  @Get('profile/edit')
  @ApiOperation({ summary: 'Get edit profile data (editable personal info + view-only email and programme track)' })
  @ApiResponse({ status: 200, description: 'Edit profile data retrieved.', type: EditProfileResponseDto })
  async getEditProfile(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getEditProfileData(userId);
  }

  @Patch('profile/edit')
  @ApiOperation({ summary: 'Save changes made in edit profile page' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  async updateEditProfile(@Req() req: any, @Body() dto: UpdateEditProfileDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.updateEditProfileData(userId, dto);
  }

  @Get('onboarding/checklist')
  @ApiOperation({ summary: 'Get onboarding checklist progress bar (e.g. 3 of 5 steps completed), step status, and completion timestamps' })
  @ApiResponse({ status: 200, description: 'Onboarding checklist retrieved.', type: OnboardingChecklistResponseDto })
  async getOnboardingChecklist(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getOnboardingChecklist(userId);
  }

  @Get('mentorship/schedule')
  @ApiOperation({ summary: 'Get schedule session view (Applicant profile pic, name, profession, and mentor available date/time slots)' })
  @ApiResponse({ status: 200, description: 'Schedule session view loaded.', type: ScheduleSessionViewResponseDto })
  async getScheduleSessionPage(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getScheduleSessionPage(userId);
  }

  @Post('mentorship/schedule/confirm')
  @ApiOperation({ summary: 'Confirm session booking, generate Google Meet link, and dispatch email/notification to applicant and mentor' })
  @ApiResponse({ status: 201, description: 'Session confirmed and notifications dispatched.' })
  async confirmScheduleSession(@Req() req: any, @Body() dto: ConfirmScheduleSessionDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.confirmScheduleSession(userId, dto);
  }
}