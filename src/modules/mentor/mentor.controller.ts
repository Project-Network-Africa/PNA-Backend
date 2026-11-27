import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MentorGuard } from '../auth/guards/mentor.guard.js';
import { MentorService } from './mentor.service.js';
import {
  MentorDashboardResponseDto,
  MentorQuickScheduleMeetingDto,
  MentorQuickLeaveFeedbackDto,
} from './dto/mentor-dashboard.dto.js';
import { MenteeDetailResponseDto } from './dto/assigned-mentees.dto.js';
import {
  CreateBroadcastDto,
  MenteesQueryDto,
  ReviewDecisionDto,
  UpdateMentorSettingsDto,
  UpdateWeeklyHoursDto,
} from './dto/mentor-pages.dto.js';

@ApiTags('Mentor Portal')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, MentorGuard)
@Controller('mentor')
export class MentorController {
  constructor(private readonly mentorService: MentorService) {}

  // --- Dashboard ---
  @Get('dashboard')
  @ApiOperation({ summary: 'Mentor Dashboard (counts, mentees, pending reviews, upcoming meetings, response rate, recent activity)' })
  @ApiResponse({ status: 200, type: MentorDashboardResponseDto })
  getDashboard(@Req() req: any) {
    return this.mentorService.getDashboard(req.mentor);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Notification bell: latest 50 notifications + unread count' })
  getNotifications(@Req() req: any) {
    return this.mentorService.getNotifications(req.mentor);
  }

  // --- Mentees ---
  @Get('mentees')
  @ApiOperation({ summary: 'Assigned Mentees table (filter: on_track | needs_attention)' })
  getAssignedMentees(@Req() req: any, @Query() query: MenteesQueryDto) {
    return this.mentorService.getAssignedMenteesTable(req.mentor, query.status);
  }

  @Get('mentees/:menteeId')
  @ApiOperation({ summary: 'Mentee detail (profile, cohort week, progress, projects, private notes)' })
  @ApiResponse({ status: 200, type: MenteeDetailResponseDto })
  getMenteeDetail(@Req() req: any, @Param('menteeId', ParseUUIDPipe) menteeId: string) {
    return this.mentorService.getMenteeDetail(req.mentor, menteeId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Mentee Analytics (avg completion, satisfaction, response rate, avg days to review, per-mentee progress + monthly change)' })
  getAnalytics(@Req() req: any) {
    return this.mentorService.getAnalytics(req.mentor);
  }

  // --- Reviews / Project Validation ---
  @Get('reviews')
  @ApiOperation({ summary: 'Reviews Queue: pending submissions' })
  getReviewQueue(@Req() req: any) {
    return this.mentorService.getReviewQueue(req.mentor);
  }

  @Get('reviews/:submissionId')
  @ApiOperation({ summary: 'Project Validation: submission detail + review criteria' })
  getReview(@Req() req: any, @Param('submissionId', ParseUUIDPipe) submissionId: string) {
    return this.mentorService.getReview(req.mentor, submissionId);
  }

  @Post('reviews/:submissionId')
  @ApiOperation({ summary: 'Approve or request changes on a submission (approve also completes the linked project)' })
  decideReview(
    @Req() req: any,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: ReviewDecisionDto,
  ) {
    return this.mentorService.decideReview(req.mentor, submissionId, dto);
  }

  // --- Feedback ---
  @Get('feedback')
  @ApiOperation({ summary: 'Feedback history' })
  getFeedback(@Req() req: any) {
    return this.mentorService.getFeedbackHistory(req.mentor);
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Send feedback to an assigned mentee' })
  leaveFeedback(@Req() req: any, @Body() dto: MentorQuickLeaveFeedbackDto) {
    return this.mentorService.leaveFeedback(req.mentor, dto);
  }

  // --- Sessions / Calendar ---
  @Post('sessions')
  @ApiOperation({ summary: 'Schedule a meeting with an assigned mentee' })
  scheduleSession(@Req() req: any, @Body() dto: MentorQuickScheduleMeetingDto) {
    return this.mentorService.scheduleSession(req.mentor, dto);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Upcoming agenda: meetings, review due dates, cohort events (sorted by date)' })
  getCalendar(@Req() req: any) {
    return this.mentorService.getCalendar(req.mentor);
  }

  // --- Availability ---
  @Get('availability')
  @ApiOperation({ summary: 'Weekly office hours + weekly capacity (booked this week / capacity)' })
  getAvailability(@Req() req: any) {
    return this.mentorService.getAvailability(req.mentor);
  }

  @Put('availability')
  @ApiOperation({ summary: 'Save weekly office hours (send the days to change)' })
  updateAvailability(@Req() req: any, @Body() dto: UpdateWeeklyHoursDto) {
    return this.mentorService.updateAvailability(req.mentor, dto);
  }

  // --- Cohort Broadcast ---
  @Get('broadcasts')
  @ApiOperation({ summary: 'Broadcast history + assigned mentee count' })
  getBroadcasts(@Req() req: any) {
    return this.mentorService.getBroadcasts(req.mentor);
  }

  @Post('broadcasts')
  @ApiOperation({ summary: 'Send a broadcast to all assigned mentees (delivered as notifications)' })
  sendBroadcast(@Req() req: any, @Body() dto: CreateBroadcastDto) {
    return this.mentorService.sendBroadcast(req.mentor, dto);
  }

  // --- Resources ---
  @Get('resources')
  @ApiOperation({ summary: 'Mentor resource library grouped by category' })
  getResources() {
    return this.mentorService.getResources();
  }

  // --- Settings ---
  @Get('settings')
  @ApiOperation({ summary: 'Mentor settings (email is read-only)' })
  getSettings(@Req() req: any) {
    return this.mentorService.getSettings(req.mentor);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update name, weekly capacity, profile visibility' })
  updateSettings(@Req() req: any, @Body() dto: UpdateMentorSettingsDto) {
    return this.mentorService.updateSettings(req.mentor, dto);
  }

  @Post('settings/download-data')
  @ApiOperation({ summary: 'Export my mentor data' })
  downloadMyData(@Req() req: any) {
    return this.mentorService.downloadMyData(req.mentor);
  }
}
