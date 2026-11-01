import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

class TeamMemberProfileDto {
  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'Frontend Developer' })
  profession: string;
}

class SharedFileDto {
  @ApiProperty({ example: 'file-uuid-123' })
  id: string;

  @ApiProperty({ example: 'Sprint_3_Plan.xlsx' })
  fileName: string;

  @ApiProperty({ example: 'https://supabase.co/storage/v1/object/public/team-files/sprint_3.xlsx' })
  fileUrl: string;

  @ApiProperty({ example: 'xlsx' })
  fileType: string;

  @ApiProperty({ example: 'John Doe' })
  uploadedBy: string;

  @ApiProperty({ example: '2026-07-15T10:00:00.000Z' })
  createdAt: string;
}

export class TeamWorkspaceResponseDto {
  @ApiProperty({ example: 'team-uuid-999' })
  teamId: string;

  @ApiProperty({ example: 'Alpha Coders' })
  teamName: string;

  @ApiProperty({ type: [TeamMemberProfileDto] })
  members: TeamMemberProfileDto[];

  @ApiProperty({ type: [SharedFileDto] })
  sharedFiles: SharedFileDto[];
}

export class UploadTeamFileDto {
  @ApiProperty({ example: 'PRD_PN_Africa.docx' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'https://supabase.co/storage/v1/object/public/team-files/prd.docx' })
  @IsUrl({}, { message: 'Invalid file URL format' })
  fileUrl: string;

  @ApiProperty({ example: 'docx' })
  @IsString()
  @IsNotEmpty()
  fileType: string;
}