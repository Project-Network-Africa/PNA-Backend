import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class MessageMentorDetailDto {
  @ApiProperty({ example: 'Office Hours & Feedback Check-in' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'Hi, please share your availability for this week’s cohort check-in.' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class EditMentorDetailDto {
  @ApiPropertyOptional({ example: 'Ada' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Okafor' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'Lead Product Designer' })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  weeklyAvailabilityHours?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/ada-okafor' })
  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://adaokafor.design' })
  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  linksVerified?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  documentsChecked?: boolean;

  @ApiPropertyOptional({ example: 4.9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 'Approved' })
  @IsOptional()
  @IsString()
  verificationStatus?: 'Pending' | 'Approved' | 'Rejected';

  @ApiPropertyOptional({ example: 'Experienced design mentor' })
  @IsOptional()
  @IsString()
  bio?: string;
}

export class SuspendMentorDetailDto {
  @ApiPropertyOptional({ example: 'Temporarily suspended pending capacity & compliance review' })
  @IsOptional()
  @IsString()
  reason?: string;
}