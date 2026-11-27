import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AdminProjectsQueryDto {
  @ApiPropertyOptional({
    description: 'Search projects by name, employer, cohort, mentor, or team',
    example: 'Cadi',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by cohort UUID or "all"',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  cohortId?: string;

  @ApiPropertyOptional({
    description: 'Filter by review status: On track, At risk, Approve, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  review?: string;

  @ApiPropertyOptional({
    description: 'Filter by project health: Healthy, At risk, Critical, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  health?: string;
}

export class CreateAdminProjectDto {
  @ApiProperty({ example: 'PN Africa Talent Marketplace' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Build multi-role marketplace for cohort placement' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  @IsNotEmpty()
  cohortId: string;

  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222' })
  @IsOptional()
  @IsUUID()
  employerId?: string;

  @ApiPropertyOptional({ example: '33333333-3333-3333-3333-333333333333' })
  @IsOptional()
  @IsUUID()
  mentorId?: string;

  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ example: '2026-12-20T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @ApiPropertyOptional({ example: 'https://example.com/project.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class ReviewAdminProjectDto {
  @ApiProperty({
    enum: ['On track', 'At risk', 'Approve'],
    example: 'Approve',
  })
  @IsIn(['On track', 'At risk', 'Approve'])
  reviewStatus: 'On track' | 'At risk' | 'Approve';

  @ApiPropertyOptional({ enum: ['Healthy', 'At risk', 'Critical'] })
  @IsOptional()
  @IsIn(['Healthy', 'At risk', 'Critical'])
  healthStatus?: 'Healthy' | 'At risk' | 'Critical';

  @ApiPropertyOptional({ example: 'Milestone approved for Demo Day' })
  @IsOptional()
  @IsString()
  feedback?: string;
}