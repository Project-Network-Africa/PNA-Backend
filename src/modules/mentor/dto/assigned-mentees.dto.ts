import { ApiProperty } from '@nestjs/swagger';

export class AssignedMenteeTableRowDto {
  @ApiProperty({ example: 'user-uuid-101' })
  menteeId: string;

  @ApiProperty({ example: 'https://example.com/pic.jpg', nullable: true })
  pic: string | null;

  @ApiProperty({ example: 'Daniel Okafor' })
  name: string;

  @ApiProperty({ example: 'Backend Developer', description: 'Program / Registered Profession' })
  program: string;

  @ApiProperty({ example: 'On Track', enum: ['On Track', 'Need Attention'] })
  status: string;

  @ApiProperty({ example: '3 hrs ago', description: 'Time since last activity in mins, hrs, or days' })
  lastActivity: string;
}

class MenteeAssignedProjectDto {
  @ApiProperty({ example: 'proj-uuid-202' })
  projectId: string;

  @ApiProperty({ example: 'Fintech Payment Gateway' })
  projectName: string;

  @ApiProperty({ example: 'In Review', enum: ['In Review', 'Completed'] })
  status: string;
}

class PrivateNoteFromMenteeDto {
  @ApiProperty({ example: 'note-uuid-01' })
  id: string;

  @ApiProperty({ example: 'Hi mentor, I struggled slightly with Redis caching this week but resolved it.' })
  note: string;

  @ApiProperty({ example: '2026-11-15T18:20:00.000Z' })
  createdAt: string;
}

export class MenteeDetailResponseDto {
  @ApiProperty({ example: 'user-uuid-101' })
  menteeId: string;

  @ApiProperty({ example: 'https://example.com/pic.jpg', nullable: true })
  pic: string | null;

  @ApiProperty({ example: 'Daniel Okafor' })
  name: string;

  @ApiProperty({ example: 'Backend Developer' })
  registeredProfession: string;

  @ApiProperty({ example: 'Cohort 6' })
  cohort: string;

  @ApiProperty({ example: 75, description: 'Cohort progress percentage for progress bar' })
  cohortProgressPercentage: number;

  @ApiProperty({ example: '/mentor/messages/user-uuid-101', description: 'Route triggered by clicking Message button' })
  messageRoute: string;

  @ApiProperty({ type: [MenteeAssignedProjectDto] })
  projects: MenteeAssignedProjectDto[];

  @ApiProperty({ type: [PrivateNoteFromMenteeDto] })
  privateNotes: PrivateNoteFromMenteeDto[];
}