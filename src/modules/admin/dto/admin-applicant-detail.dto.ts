import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ApproveApplicantsDto {
  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsUUID()
  mentorId?: string;

  @ApiPropertyOptional({ example: 'Strong portfolio and clear motivation' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class RejectApplicantsDto {
  @ApiPropertyOptional({ example: 'Incomplete portfolio submission for current cohort' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'Rejected after admissions review' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class AssignApplicantsMentorDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  @IsNotEmpty()
  mentorId: string;

  @ApiPropertyOptional({ example: 'Assigned to Product Design mentor track' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}