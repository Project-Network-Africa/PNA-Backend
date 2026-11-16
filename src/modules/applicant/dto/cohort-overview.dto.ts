import { ApiProperty } from '@nestjs/swagger';

class CurriculumModuleItemDto {
  @ApiProperty({ example: 'mod-uuid-01' })
  id: string;

  @ApiProperty({ example: 'Module 1: Foundation' })
  title: string;

  @ApiProperty({ example: 'Completed', enum: ['Completed', 'In Progress', 'Upcoming'] })
  status: string;
}

class TeamMentorItemDto {
  @ApiProperty({ example: 'Jane Smith' })
  mentorName: string;

  @ApiProperty({ example: 'Senior Product Designer' })
  profession: string;

  @ApiProperty({ example: 'https://example.com/mentor.jpg', nullable: true })
  avatarUrl: string | null;
}

export class CohortOverviewResponseDto {
  @ApiProperty({ example: 'Frontend Developer' })
  registeredProfession: string;

  @ApiProperty({ example: 'Cohort 3' })
  cohortName: string;

  @ApiProperty({ example: 'Week 8 of 12', description: 'Progress description based on project deadline' })
  weeksRemainingLabel: string;

  @ApiProperty({ example: 66, description: 'Percentage progress bar filled up' })
  progressPercentage: number;

  @ApiProperty({ type: [CurriculumModuleItemDto] })
  curriculumSchedule: CurriculumModuleItemDto[];

  @ApiProperty({ type: [TeamMentorItemDto] })
  teamMentors: TeamMentorItemDto[];
}