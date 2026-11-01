import { ApiProperty } from '@nestjs/swagger';

export class ProjectItemDto {
  @ApiProperty({ example: 'proj-uuid-123' })
  id: string;

  @ApiProperty({ example: 'PN Africa LMS Portal' })
  name: string;

  @ApiProperty({ example: 'Build a comprehensive learning management system for bootcamp cohorts.' })
  description: string;

  @ApiProperty({ example: 'https://example.com/project-image.png', nullable: true })
  imageUrl: string | null;

  @ApiProperty({ example: 'Frontend Developer' })
  profession: string;

  @ApiProperty({ example: 'In Progress', enum: ['Not Started', 'In Progress', 'Completed'] })
  status: string;
}

export class ApplicantProjectsResponseDto {
  @ApiProperty({ type: [ProjectItemDto] })
  projects: ProjectItemDto[];
}