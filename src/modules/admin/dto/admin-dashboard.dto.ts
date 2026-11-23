import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Cohort UUID or "all" (default: "all")',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  cohortId?: string;

  @ApiPropertyOptional({
    description: 'Lookback window in days (e.g., 7, 30, 90)',
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;

  @ApiPropertyOptional({
    description: 'Lookback window in hours (overrides days if supplied, e.g., 24, 48)',
    example: 24,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  hours?: number;
}

export class CreateCohortDto {
  @ApiProperty({ example: 'Cohort 5 - September, 2027' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2027-09-01' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2027-11-30' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ example: '2027-11-25T23:59:59Z' })
  @IsString()
  @IsNotEmpty()
  projectDeadline: string;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  feeAmount?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;
}

export class InviteMentorDto {
  @ApiProperty({ example: 'Ada' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'ada.mentor@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Backend Engineering' })
  @IsString()
  @IsNotEmpty()
  profession: string;

  @ApiPropertyOptional({ example: 'Senior Node.js & Distributed Systems Architect' })
  @IsOptional()
  @IsString()
  bio?: string;
}

export class PublishContentDto {
  @ApiProperty({ example: 'cohort-announcement' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'announcements' })
  @IsString()
  @IsNotEmpty()
  section: string;

  @ApiProperty({ example: 'Cohort 4 Onboarding Kickoff' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Welcome to PN Africa!' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'Orientation holds this Friday at 4:00 PM WAT.' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ example: 'https://cdn.pnafrica.com/banner.png' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}