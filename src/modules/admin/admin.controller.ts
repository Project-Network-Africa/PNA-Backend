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
}