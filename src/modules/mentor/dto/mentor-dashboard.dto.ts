import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignedMenteeSummaryDto {
  @ApiProperty({ example: 'user-uuid-101' })
  menteeId: string;

  @ApiProperty({ example: 'Daniel Okafor' })
  name: string;

  @ApiProperty({ example: 'https://example.com/pic.jpg', nullable: true })
  pic: string | null;

  @ApiProperty({ example: 'Backend Developer' })
  registeredProfession: string;

  @ApiProperty({ example: 'Cohort 6' })
  registeredCohort: string;

  @ApiProperty({ example: 'On Track', enum: ['On Track', 'Need Attention'] })
  status: string;
}

export class PendingReviewItemDto {
  @ApiProperty({ example: 'sub-uuid-01' })
  submissionId: string;

  @ApiProperty({ example: 'REST API Architecture - By Daniel Okafor' })
  displayTitle: string;

  @ApiProperty({ example: 'REST API Architecture' })
  title: string;

  @ApiProperty({ example: 'Daniel Okafor' })
  menteeName: string;

  @ApiProperty({ example: 'https://github.com/daniel/api-repo', nullable: true })
  submissionUrl: string | null;

  @ApiProperty({ example: '2026-11-16T14:30:00.000Z' })
  submittedAt: string;
}

export class MentorDashboardResponseDto {
  @ApiProperty({ example: 8 })
  assignedMenteesCount: number;

  @ApiProperty({ example: 3 })
  pendingReviewsCount: number;

  @ApiProperty({ example: 4 })
  upcomingMeetingsCount: number;

  @ApiProperty({ example: 94, description: 'Response rate in percentage' })
  responseRatePercentage: number;

  @ApiProperty({ type: [AssignedMenteeSummaryDto] })
  assignedMentees: AssignedMenteeSummaryDto[];

  @ApiProperty({ description: 'Upcoming calendar meetings and cohort events' })
  calendar: any[];

  @ApiProperty({ type: [PendingReviewItemDto] })
  pendingReviews: PendingReviewItemDto[];

  @ApiProperty({ description: 'Recent activities, tasks, and meetings completed' })
  recentActivity: any[];
}

export class ReviewSubmissionDto {
  @ApiProperty({ example: 'Great database indexing and clean error handling. Ready for deployment.' })
  @IsString()
  @IsNotEmpty()
  feedback: string;
}

export class MentorQuickScheduleMeetingDto {
  @ApiProperty({ example: 'user-uuid-101' })
  @IsUUID()
  @IsNotEmpty()
  menteeId: string;

  @ApiProperty({ example: 'Sprint 3 Code Review' })
  @IsString()
  @IsNotEmpty()
  sessionTitle: string;

  @ApiProperty({ example: '2026-11-20T15:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  sessionDate: string;

  @ApiProperty({ example: 'https://meet.google.com/abc-defg-hij', required: false })
  @IsString()
  @IsOptional()
  meetingLink?: string;
}

export class MentorQuickLeaveFeedbackDto {
  @ApiProperty({ example: 'user-uuid-101' })
  @IsUUID()
  @IsNotEmpty()
  menteeId: string;

  @ApiProperty({ example: 'Keep up the consistent commits on the authentication module.' })
  @IsString()
  @IsNotEmpty()
  note: string;
}

export class MentorQuickValidateProjectDto {
  @ApiProperty({ example: 'user-uuid-101' })
  @IsUUID()
  @IsNotEmpty()
  menteeId: string;

  @ApiProperty({ example: 'proj-uuid-202' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;
}