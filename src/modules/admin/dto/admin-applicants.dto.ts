import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdminApplicantsQueryDto {
  @ApiPropertyOptional({
    description: 'Search applicants by name, email, track, cohort, or reference code',
    example: 'Caleb',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by program/track (e.g., BACKEND_DEVELOPER, Backend Developer) or "all"',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  program?: string;

  @ApiPropertyOptional({
    description: 'Filter by cohort UUID or "all"',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  cohortId?: string;

  @ApiPropertyOptional({
    description: 'Filter by stage: Onboarding, Interviewing, Applied, Matched, Review, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  stage?: string;
}

export class AssignApplicantMentorDto {
  @ApiProperty({ example: 'd4b9f7e1-1234-4a5b-8c9d-0e1f2a3b4c5d' })
  @IsUUID()
  @IsNotEmpty()
  mentorId: string;
}

export class ResolveApplicantRiskDto {
  @ApiProperty({
    enum: ['MARK_PAYMENT_PAID', 'ADVANCE_STAGE', 'MARK_FOLLOWED_UP', 'REJECT_APPLICATION'],
    example: 'MARK_PAYMENT_PAID',
  })
  @IsIn(['MARK_PAYMENT_PAID', 'ADVANCE_STAGE', 'MARK_FOLLOWED_UP', 'REJECT_APPLICATION'])
  resolutionType:
    | 'MARK_PAYMENT_PAID'
    | 'ADVANCE_STAGE'
    | 'MARK_FOLLOWED_UP'
    | 'REJECT_APPLICATION';

  @ApiPropertyOptional({
    example: 'Payment verified manually via bank transfer receipt',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}