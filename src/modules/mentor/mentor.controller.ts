import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MentorService } from './mentor.service.js';
import {
  MentorDashboardResponseDto,
  ReviewSubmissionDto,
  MentorQuickScheduleMeetingDto,
  MentorQuickLeaveFeedbackDto,
  MentorQuickValidateProjectDto,
} from './dto/mentor-dashboard.dto.js';
import { MenteeDetailResponseDto } from './dto/assigned-mentees.dto.js';

@ApiTags('Mentor Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mentor')
export class MentorController {
  constructor(private readonly mentorService: MentorService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get Mentor Dashboard (mentee count, pending reviews, upcoming meetings, response rate %, mentees list, calendar, recent activity)',
  })
  @ApiResponse({ status: 200, description: 'Mentor dashboard retrieved.', type: MentorDashboardResponseDto })
  async getDashboard(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.mentorService.getDashboard(userId);
  }

  @Post('reviews/:submissionId')
  @ApiOperation({ summary: 'Submit review feedback for a pending mentee submission ("Review" button action)' })
  @ApiResponse({ status: 201, description: 'Submission reviewed successfully.' })
  async reviewSubmission(
    @Req() req: any,
    @Param('submissionId') submissionId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.mentorService.reviewSubmission(userId, submissionId, dto);
  }

  @Post('quick-actions/schedule-meeting')
  @ApiOperation({ summary: 'Quick Action: Schedule Meeting with a mentee' })
  @ApiResponse({ status: 201, description: 'Meeting scheduled successfully.' })
  async quickScheduleMeeting(@Req() req: any, @Body() dto: MentorQuickScheduleMeetingDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.mentorService.quickScheduleMeeting(userId, dto);
  }

  @Post('quick-actions/leave-feedback')
  @ApiOperation({ summary: 'Quick Action: Leave feedback note for a mentee' })
  @ApiResponse({ status: 201, description: 'Feedback left successfully.' })
  async quickLeaveFeedback(@Req() req: any, @Body() dto: MentorQuickLeaveFeedbackDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.mentorService.quickLeaveFeedback(userId, dto);
  }

  @Post('quick-actions/validate-project')
  @ApiOperation({ summary: 'Quick Action: Validate and complete a mentee project' })
  @ApiResponse({ status: 201, description: 'Project validated successfully.' })
  async quickValidateProject(@Req() req: any, @Body() dto: MentorQuickValidateProjectDto) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.mentorService.quickValidateProject(userId, dto);
  }

  @Get('mentees')
  @ApiOperation({ summary: 'Get Assigned Mentees tabular list (pic, name, program, status, last activity)' })
  @ApiResponse({ status: 200, description: 'Assigned mentees table retrieved.' })
  async getAssignedMentees(@Req() req: any) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.mentorService.getAssignedMenteesTable(userId);
  }

  @Get('mentees/:menteeId')
  @ApiOperation({
    summary: 'Get Mentee Detail page (pic, name, profession, cohort, progress bar, message route, projects, private notes)',
  })
  @ApiResponse({ status: 200, description: 'Mentee details retrieved.', type: MenteeDetailResponseDto })
  async getMenteeDetail(@Req() req: any, @Param('menteeId') menteeId: string) {
    const userId = req.user?.id || req.headers['user-id'];
    return this.mentorService.getMenteeDetail(userId, menteeId);
  }
}