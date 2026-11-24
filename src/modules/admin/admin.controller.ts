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
}