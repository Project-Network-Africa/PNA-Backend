import { ApiProperty } from '@nestjs/swagger';

class DeliverableDto {
  @ApiProperty({ example: 'deliv-uuid-001' })
  id: string;

  @ApiProperty({ example: 'User Authentication & JWT Integration' })
  title: string;

  @ApiProperty({ example: 'Implement signup, login, password reset, and role guards.' })
  description: string;

  @ApiProperty({ example: true })
  isCompleted: boolean;
}

class ProjectTeamMemberDto {
  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'Backend Developer' })
  profession: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;
}

class MentorFeedbackDto {
  @ApiProperty({ example: 'fb-uuid-101' })
  id: string;

  @ApiProperty({ example: 'Jane Smith' })
  mentorName: string;

  @ApiProperty({ example: 'Great progress on the database schema! Ensure error handling for JWT tokens is thoroughly tested.' })
  message: string;

  @ApiProperty({ example: '2026-07-15T14:30:00.000Z' })
  createdAt: string;
}

export class ProjectDetailResponseDto {
  @ApiProperty({ example: 'proj-uuid-123' })
  id: string;

  @ApiProperty({ example: 'PN Africa LMS Portal' })
  name: string;

  @ApiProperty({ example: 'Build a comprehensive learning management system for bootcamp cohorts.' })
  description: string;

  @ApiProperty({ example: 'https://example.com/project-image.png', nullable: true })
  imageUrl: string | null;

  @ApiProperty({ type: [DeliverableDto] })
  deliverables: DeliverableDto[];

  @ApiProperty({ type: [ProjectTeamMemberDto] })
  teamMembers: ProjectTeamMemberDto[];

  @ApiProperty({ type: [MentorFeedbackDto] })
  mentorFeedback: MentorFeedbackDto[];
}