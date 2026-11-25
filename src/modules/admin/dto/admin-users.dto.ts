import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AdminUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Search users by name or email',
    example: 'Caleb',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by role: Applicant, Mentor, Employer, Admin, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Filter by status: Active, Suspended, Unavailable, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Last activity filter: last_24h, last_7d, last_30d, inactive_30d, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  lastActivity?: string;
}

export class CreateAdminUserDto {
  @ApiProperty({ example: 'Tunde' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Bakare' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'tunde.bakare@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['Applicant', 'Mentor', 'Employer', 'Admin'], example: 'Mentor' })
  @IsIn(['Applicant', 'Mentor', 'Employer', 'Admin'])
  role: 'Applicant' | 'Mentor' | 'Employer' | 'Admin';

  @ApiPropertyOptional({ example: 'Backend Developer' })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({ example: 'Nile Tech Ltd' })
  @IsOptional()
  @IsString()
  companyName?: string;
}

export class BulkUsersActionDto {
  @ApiProperty({
    type: [String],
    example: ['11111111-1111-1111-1111-111111111111'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({
    enum: ['ACTIVATE', 'SUSPEND', 'MARK_UNAVAILABLE', 'PROMOTE_ADMIN'],
    example: 'ACTIVATE',
  })
  @IsIn(['ACTIVATE', 'SUSPEND', 'MARK_UNAVAILABLE', 'PROMOTE_ADMIN'])
  action: 'ACTIVATE' | 'SUSPEND' | 'MARK_UNAVAILABLE' | 'PROMOTE_ADMIN';
}

export class ManageAdminUserDto {
  @ApiPropertyOptional({ enum: ['Applicant', 'Mentor', 'Employer', 'Admin'] })
  @IsOptional()
  @IsIn(['Applicant', 'Mentor', 'Employer', 'Admin'])
  role?: 'Applicant' | 'Mentor' | 'Employer' | 'Admin';

  @ApiPropertyOptional({ enum: ['Active', 'Suspended', 'Unavailable'] })
  @IsOptional()
  @IsIn(['Active', 'Suspended', 'Unavailable'])
  status?: 'Active' | 'Suspended' | 'Unavailable';
}