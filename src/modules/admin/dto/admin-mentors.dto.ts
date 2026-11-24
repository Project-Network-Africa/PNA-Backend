import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminMentorsQueryDto {
  @ApiPropertyOptional({
    description: 'Search mentors by name, email, or expertise/profession',
    example: 'Product Manager',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by expertise/profession or "all"',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  expertise?: string;

  @ApiPropertyOptional({
    description: 'Filter by availability: Available, Limited, Full, Inactive, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiPropertyOptional({
    description: 'Filter by verification status: Verified, Pending, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  verification?: string;
}

export class ContactMentorDto {
  @ApiProperty({ example: 'Mentor Review Reminder' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'Hi, please complete pending mentee submissions due this week.' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class AdminInviteMentorDto {
  @ApiProperty({ example: 'Ada' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'ada.okafor@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Product Manager' })
  @IsString()
  @IsNotEmpty()
  profession: string;

  @ApiPropertyOptional({ example: 'Lead PM with 6+ years mentoring early-stage teams' })
  @IsOptional()
  @IsString()
  bio?: string;
}