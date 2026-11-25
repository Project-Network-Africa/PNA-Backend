import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AdminCohortsQueryDto {
  @ApiPropertyOptional({
    description: 'Search cohorts by name or programme',
    example: 'Cohort 3',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by programme (e.g., Software Engineering, Backend Developer) or "all"',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  programme?: string;

  @ApiPropertyOptional({
    description: 'Filter by status: Active, Complete, Draft, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter cohorts starting or running on/after ISO date (YYYY-MM-DD)',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class CreateAdminCohortPageDto {
  @ApiProperty({ example: 'Cohort 5 - June 2027' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Software Engineering' })
  @IsString()
  @IsNotEmpty()
  programme: string;

  @ApiProperty({ example: '2027-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2027-08-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: '2027-08-25T23:59:59.000Z' })
  @IsDateString()
  deadline: string;

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ example: 45000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feeAmount?: number;

  @ApiPropertyOptional({ enum: ['Active', 'Complete', 'Draft'], example: 'Draft' })
  @IsOptional()
  @IsIn(['Active', 'Complete', 'Draft'])
  status?: 'Active' | 'Complete' | 'Draft';
}

export class UpdateAdminCohortPageDto {
  @ApiPropertyOptional({ example: 'Cohort 4 - March, 2027' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Software Engineering' })
  @IsOptional()
  @IsString()
  programme?: string;

  @ApiPropertyOptional({ example: '2027-03-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-05-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '2027-05-25T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: ['Active', 'Complete', 'Draft'] })
  @IsOptional()
  @IsIn(['Active', 'Complete', 'Draft'])
  status?: 'Active' | 'Complete' | 'Draft';
}