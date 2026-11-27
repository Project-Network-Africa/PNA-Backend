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
import { MentorshipResponseDto, RateMentorDto } from './dto/mentorship-response.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MakePaymentDto, PaymentPageResponseDto } from './dto/payment.dto.js';
import { LearningResourcesResponseDto, SearchLearningResourceQueryDto } from './dto/learning-resources-response.dto.js';
import { NotificationsResponseDto } from './dto/notification-response.dto.js';
import { UpdateSettingsDto, DeactivateAccountSuccessResponseDto } from './dto/settings.dto.js';
import { EditProfileResponseDto, UpdateEditProfileDto } from './dto/edit-profile.dto.js';
import { ConfirmScheduleSessionDto, ScheduleSessionViewResponseDto } from './dto/schedule-session.dto.js';
import { OnboardingChecklistResponseDto } from './dto/onboarding-checklist.dto.js';
import { PaymentConfirmationResponseDto } from './dto/payment-confirmation.dto.js';
import { CohortOverviewResponseDto } from './dto/cohort-overview.dto.js';
import { SendMessageDto, ConversationsListResponseDto, ChatThreadResponseDto } from './dto/messages.dto.js';
import { CalendarResponseDto } from './dto/calendar-response.dto.js';
import { AchievementsResponseDto } from './dto/achievements.dto.js';
import { ReferralPageResponseDto, SendReferralInviteDto } from './dto/referral.dto.js';
import { HelpAndSupportResponseDto, CreateSupportTicketDto } from './dto/support.dto.js';


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

  @Get('cohort/overview')
  @ApiOperation({ summary: 'Get cohort overview (registered profession, cohort name, progress bar weeks remaining, curriculum schedule, and team mentors)' })
  @ApiResponse({ status: 200, description: 'Cohort overview retrieved.', type: CohortOverviewResponseDto })
  async getCohortOverview(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getCohortOverview(userId);
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

  @Post('mentorship/rating')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Rate my assigned mentor 1-5 (one rating per mentor, re-submitting updates it)' })
  async rateMentor(@Req() req: any, @Body() dto: RateMentorDto) {
    return this.applicantService.rateMentor(req.user.id, dto);
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

  @Get('payments/confirmation/:paymentId')
  @ApiOperation({ summary: 'Get payment confirmation details, receipt (transaction id, date, amount, method, status), and download URL' })
  @ApiResponse({ status: 200, description: 'Payment confirmation retrieved.', type: PaymentConfirmationResponseDto })
  async getPaymentConfirmation(@Req() req: any, @Param('paymentId') paymentId: string) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getPaymentConfirmation(userId, paymentId);
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

  @Post('settings/deactivate')
  @ApiOperation({ summary: 'Deactivate account when confirming deactivation, returning popup message "Your account has been deactivated"' })
  @ApiResponse({ status: 201, description: 'Account deactivated.', type: DeactivateAccountSuccessResponseDto })
  async deactivateAccount(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.deactivateAccount(userId);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get conversations list with team-mates and mentor, last sent message, and relative time ago' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully.', type: ConversationsListResponseDto })
  async getConversations(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getConversationsList(userId);
  }

  @Get('messages/:recipientId')
  @ApiOperation({ summary: 'Get message screen with recipient name, profession, mentor/team-mate indicator, and chat history' })
  @ApiResponse({ status: 200, description: 'Chat thread retrieved successfully.', type: ChatThreadResponseDto })
  async getChatThread(@Req() req: any, @Param('recipientId') recipientId: string) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getChatThread(userId, recipientId);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send message using typing message bar and send button' })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  async sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.sendMessage(userId, dto);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get all upcoming cohort agenda (Events, sessions, deadlines, payments) with day, date, and time' })
  @ApiResponse({ status: 200, description: 'Calendar agenda retrieved successfully.', type: CalendarResponseDto })
  async getCalendarAgenda(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getCalendarAgenda(userId);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Get earned badges (current & past cohorts) and Program Certificate (locked until 100% completion)' })
  @ApiResponse({ status: 200, description: 'Achievements retrieved successfully.', type: AchievementsResponseDto })
  async getAchievements(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getAchievements(userId);
  }

  @Get('referrals')
  @ApiOperation({ summary: 'Get personal referral link, reward progress bar (3 joins = 1 free mentorship month), and invited friends list' })
  @ApiResponse({ status: 200, description: 'Referral program data retrieved.', type: ReferralPageResponseDto })
  async getReferrals(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getReferralData(userId);
  }

  @Post('referrals/invite')
  @ApiOperation({ summary: 'Send an email invitation containing the applicant referral link' })
  @ApiResponse({ status: 201, description: 'Referral invitation email sent.' })
  async sendReferralInvite(@Req() req: any, @Body() dto: SendReferralInviteDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.sendReferralInvite(userId, dto);
  }

  @Get('support')
  @ApiOperation({ summary: 'Get FAQs and applicant support tickets with resolved/unresolved status' })
  @ApiResponse({ status: 200, description: 'Help and support data retrieved.', type: HelpAndSupportResponseDto })
  async getHelpAndSupport(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.getHelpAndSupport(userId);
  }

  @Post('support/tickets')
  @ApiOperation({ summary: 'Contact support button action to submit a new support ticket to the PNA team' })
  @ApiResponse({ status: 201, description: 'Support ticket created successfully.' })
  async createSupportTicket(@Req() req: any, @Body() dto: CreateSupportTicketDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.applicantService.createSupportTicket(userId, dto);
  }
}