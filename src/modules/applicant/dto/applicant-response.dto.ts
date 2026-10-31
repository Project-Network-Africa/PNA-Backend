import { ApiProperty } from '@nestjs/swagger';

class ApplicantSummaryDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'Frontend Developer' })
  profession: string;

  @ApiProperty({ example: 'Cohort 3' })
  cohort: string;

  @ApiProperty({ example: 6 })
  weeksRemaining: number;

  @ApiProperty({ example: 75.0 })
  completionPercentage: number;

  @ApiProperty({ example: 80.0 })
  teamCompletionPercentage: number;
}

class MentorSummaryDto {
  @ApiProperty({ example: 'Jane Smith' })
  name: string;

  @ApiProperty({ example: 'Senior Fullstack Engineer' })
  profession: string;

  @ApiProperty({ example: 'jane.smith@pnafrica.org' })
  email: string;

  @ApiProperty({ example: '/messages/mentor/uuid-here' })
  messageActionUrl: string;
}

class TeamMemberDto {
  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;
}

class TeamSummaryDto {
  @ApiProperty({ example: 'Alpha Coders' })
  teamName: string;

  @ApiProperty({ example: 3 })
  memberCount: number;

  @ApiProperty({ type: [TeamMemberDto] })
  members: TeamMemberDto[];
}

class ProjectSummaryDto {
  @ApiProperty({ example: 'PN Africa LMS' })
  name: string;

  @ApiProperty({ example: 'Learning management system for bootcamp talent.' })
  description: string;

  @ApiProperty({ example: 'https://example.com/image.png' })
  imageUrl: string;
}

class TaskDto {
  @ApiProperty({ example: 'task-uuid-123' })
  id: string;

  @ApiProperty({ example: 'Submit API Documentation' })
  title: string;

  @ApiProperty({ example: 'Complete Swagger docs for all modules' })
  description: string;

  @ApiProperty({ example: '2026-07-20T12:00:00.000Z' })
  deadline: string;

  @ApiProperty({ example: 'Pending' })
  status: string;
}

class NotificationDto {
  @ApiProperty({ example: 'notif-uuid-456' })
  id: string;

  @ApiProperty({ example: 'Cohort Update' })
  title: string;

  @ApiProperty({ example: 'Week 3 mentorship session scheduled.' })
  message: string;

  @ApiProperty({ example: 'cohort' })
  type: string;

  @ApiProperty({ example: false })
  is_read: boolean;

  @ApiProperty({ example: '2026-07-10T10:00:00.000Z' })
  created_at: string;
}

class StageProgressDto {
  @ApiProperty({ example: 'Applied' })
  stage: string;

  @ApiProperty({ example: true })
  completed: boolean;
}

class CourseProgressDto {
  @ApiProperty({ example: 'Onboarding' })
  currentStage: string;

  @ApiProperty({ type: [StageProgressDto] })
  stages: StageProgressDto[];
}

export class ApplicantDashboardResponseDto {
  @ApiProperty({ type: ApplicantSummaryDto })
  applicant: ApplicantSummaryDto;

  @ApiProperty({ type: MentorSummaryDto, nullable: true })
  mentor: MentorSummaryDto | null;

  @ApiProperty({ type: TeamSummaryDto })
  team: TeamSummaryDto;

  @ApiProperty({ type: ProjectSummaryDto, nullable: true })
  currentProject: ProjectSummaryDto | null;

  @ApiProperty({ type: [TaskDto] })
  upcomingDeadlines: TaskDto[];

  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];

  @ApiProperty({ type: CourseProgressDto })
  courseProgress: CourseProgressDto;
}