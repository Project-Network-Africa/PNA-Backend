import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import {
  AdminDashboardQueryDto,
  CreateCohortDto,
  InviteMentorDto,
  PublishContentDto,
} from './dto/admin-dashboard.dto.js';
import {
  AdminApplicantsQueryDto,
  AssignApplicantMentorDto,
  ResolveApplicantRiskDto,
} from './dto/admin-applicants.dto.js';
import {
  AdminMentorsQueryDto,
  ContactMentorDto,
  AdminInviteMentorDto,
} from './dto/admin-mentors.dto.js';
import {
  AdminUsersQueryDto,
  CreateAdminUserDto,
  BulkUsersActionDto,
  ManageAdminUserDto,
} from './dto/admin-users.dto.js';
import {
  AdminProjectsQueryDto,
  CreateAdminProjectDto,
  ReviewAdminProjectDto,
} from './dto/admin-projects.dto.js';
import {
  AdminPaymentsQueryDto,
  ResolvePaymentActionDto,
  
} from './dto/admin-payments-page.dto.js';
import {
  AdminCohortsQueryDto,
  CreateAdminCohortPageDto,
  UpdateAdminCohortPageDto,
} from './dto/admin-cohorts-page.dto.js';

@ApiTags('Admin Portal - Dashboard')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Get complete Admin Dashboard overview (Metrics, Funnel, Urgent Actions, Cohort Health, Mentor Capacity, Employer Activity, Payments, Alerts, Audit Logs)',
  })
  async getDashboard(@Query() query: AdminDashboardQueryDto) {
    return this.adminService.getDashboardOverview(query);
  }

  @Get('dashboard/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="pna-admin-dashboard-report.csv"')
  @ApiOperation({ summary: 'Export filtered Admin Dashboard report as CSV' })
  async exportReport(@Query() query: AdminDashboardQueryDto) {
    return this.adminService.exportDashboardReportCsv(query);
  }

  // Quick Action 1: Create Cohort (Group)
  @Post('cohorts')
  @ApiOperation({ summary: 'Quick Action: Create a new cohort group' })
  async createCohort(@Body() dto: CreateCohortDto) {
    return this.adminService.createCohort(dto);
  }

  // Quick Action 2: Invite Mentor
  @Post('mentors/invite')
  @ApiOperation({ summary: 'Quick Action: Invite a new mentor via email' })
  async inviteMentor(@Body() dto: InviteMentorDto) {
    return this.adminService.inviteMentor(dto);
  }

  // Quick Action 3: Publish CMS Content
  @Post('content/publish')
  @ApiOperation({ summary: 'Quick Action: Publish announcement or CMS content' })
  async publishContent(@Body() dto: PublishContentDto) {
    return this.adminService.publishContent(dto);
  }

  // Urgent Action Resolver (Mentor, Employer, Failed Payment)
  @Patch('urgent-actions/:category/:id')
  @ApiOperation({ summary: 'Resolve, approve, or verify an urgent dashboard action item' })
  async resolveUrgentAction(
    @Param('category') category: 'mentor' | 'employer' | 'review' | 'payment',
    @Param('id') id: string,
    @Body('status') status: 'Approved' | 'Verified' | 'Rejected' | 'Resolved',
  ) {
    return this.adminService.resolveUrgentAction(category, id, status);
  }

  @Get('applicants')
  @ApiOperation({
    summary:
      'Get Admin Applicants page metrics, search/filter options, and tabular applicant rows',
  })
  async getApplicants(@Query() query: AdminApplicantsQueryDto) {
    return this.adminService.getApplicantsPageData(query);
  }

  @Get('applicants/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="pna-admin-applicants.csv"')
  @ApiOperation({ summary: 'Export filtered applicants list as CSV' })
  async exportApplicants(@Query() query: AdminApplicantsQueryDto) {
    return this.adminService.exportApplicantsCsv(query);
  }

  @Get('applicants/:id')
  @ApiOperation({ summary: 'View detailed record for a single applicant' })
  async getApplicantDetail(@Param('id') id: string) {
    return this.adminService.getApplicantDetailById(id);
  }

  @Patch('applicants/:id/assign-mentor')
  @ApiOperation({ summary: 'Assign a mentor to an unassigned applicant' })
  async assignMentor(
    @Param('id') id: string,
    @Body() dto: AssignApplicantMentorDto,
  ) {
    return this.adminService.assignMentorToApplicant(id, dto);
  }

  @Patch('applicants/:id/resolve-risk')
  @ApiOperation({ summary: 'Resolve high risk issues for an applicant' })
  async resolveApplicantRisk(
    @Param('id') id: string,
    @Body() dto: ResolveApplicantRiskDto,
  ) {
    return this.adminService.resolveApplicantRisk(id, dto);
  }

  @Get('mentors')
  @ApiOperation({
    summary:
      'Get Admin Mentors page metrics, search/filter controls, and tabular mentor rows',
  })
  async getMentors(@Query() query: AdminMentorsQueryDto) {
    return this.adminService.getMentorsPageData(query);
  }

  @Get('mentors/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="pna-admin-mentors.csv"')
  @ApiOperation({ summary: 'Export filtered mentors list as CSV' })
  async exportMentors(@Query() query: AdminMentorsQueryDto) {
    return this.adminService.exportMentorsCsv(query);
  }

  @Get('mentors/:id')
  @ApiOperation({ summary: 'View mentor details, assigned mentees, and submissions' })
  async getMentorDetail(@Param('id') id: string) {
    return this.adminService.getMentorDetailById(id);
  }

  @Post('mentors/:id/reviews/:submissionId')
  @ApiOperation({ summary: 'Review or validate an overdue mentee submission for a mentor' })
  async reviewMentorSubmission(
    @Param('id') mentorId: string,
    @Param('submissionId') submissionId: string,
    @Body('status') status: 'Reviewed' | 'Validated',
    @Body('reviewFeedback') reviewFeedback?: string,
  ) {
    return this.adminService.reviewMentorSubmission(
      mentorId,
      submissionId,
      status || 'Reviewed',
      reviewFeedback,
    );
  }

  @Post('mentors/:id/contact')
  @ApiOperation({ summary: 'Send an in-app notification and email to a mentor' })
  async contactMentor(@Param('id') id: string, @Body() dto: ContactMentorDto) {
    return this.adminService.contactMentor(id, dto);
  }

  // ==========================================
  // ADMIN USERS PAGE ROUTES
  // ==========================================
  @Get('users')
  @ApiOperation({
    summary: 'Get Admin Users page metrics, filter controls, and tabular user rows',
  })
  async getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.getUsersPageData(query);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user account from the Admin Users page' })
  async createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createAdminUser(dto);
  }

  @Post('users/bulk-action')
  @ApiOperation({ summary: 'Run bulk actions on selected users' })
  async bulkUsersAction(@Body() dto: BulkUsersActionDto) {
    return this.adminService.bulkUsersAction(dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'View user details and permission level' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Manage/update user role or status' })
  async manageUser(@Param('id') id: string, @Body() dto: ManageAdminUserDto) {
    return this.adminService.manageUser(id, dto);
  }

  // ==========================================
  // ADMIN PROJECTS PAGE ROUTES
  // ==========================================
  @Get('projects')
  @ApiOperation({
    summary: 'Get Admin Projects page metrics, filter controls, and tabular project rows',
  })
  async getProjects(@Query() query: AdminProjectsQueryDto) {
    return this.adminService.getProjectsPageData(query);
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create a new cohort project' })
  async createProject(@Body() dto: CreateAdminProjectDto) {
    return this.adminService.createAdminProject(dto);
  }

  @Get('projects/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="pna-admin-projects.csv"')
  @ApiOperation({ summary: 'Export filtered projects list as CSV' })
  async exportProjects(@Query() query: AdminProjectsQueryDto) {
    return this.adminService.exportProjectsCsv(query);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'View project details, deliverables, and feedback' })
  async getProjectDetail(@Param('id') id: string) {
    return this.adminService.getProjectDetailById(id);
  }

  @Patch('projects/:id/review')
  @ApiOperation({ summary: 'Review or approve a project' })
  async reviewProject(
    @Param('id') id: string,
    @Body() dto: ReviewAdminProjectDto,
  ) {
    return this.adminService.reviewAdminProject(id, dto);
  }

  @Get('cohorts')
  @ApiOperation({
    summary: 'Get Admin Cohorts page metrics, search/filter controls, and tabular cohort rows',
  })
  async getCohortsPage(@Query() query: AdminCohortsQueryDto) {
    return this.adminService.getCohortsPageData(query);
  }

  @Post('cohorts')
  @ApiOperation({ summary: 'Create a new cohort' })
  async createCohortPage(@Body() dto: CreateAdminCohortPageDto) {
    return this.adminService.createAdminCohortPage(dto);
  }

  @Get('cohorts/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="pna-admin-cohorts.csv"')
  @ApiOperation({ summary: 'Export filtered cohorts as CSV' })
  async exportCohortsPage(@Query() query: AdminCohortsQueryDto) {
    return this.adminService.exportCohortsCsv(query);
  }

  @Get('cohorts/:id')
  @ApiOperation({ summary: 'View cohort details, learners, projects, and curriculum modules' })
  async getCohortDetail(@Param('id') id: string) {
    return this.adminService.getCohortDetailById(id);
  }

  @Patch('cohorts/:id')
  @ApiOperation({ summary: 'Edit cohort details, schedule, capacity, or status' })
  async updateCohortPage(
    @Param('id') id: string,
    @Body() dto: UpdateAdminCohortPageDto,
  ) {
    return this.adminService.updateAdminCohortPage(id, dto);
  }
}