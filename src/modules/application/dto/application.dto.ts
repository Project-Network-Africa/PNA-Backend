import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum TrackEnum {
  PRODUCT_DESIGN = 'Product design',
  FRONTEND_DEV = 'Frontend developer',
  BACKEND_DEV = 'backend developer',
  PRODUCT_MANAGER = 'product manager',
  BUSINESS_ANALYST = 'Business analyst',
  PROJECT_COORDINATOR = 'project coordinator',
  PROJECT_MANAGER = 'project manager',
}

export enum ExperienceLevelEnum {
  BEGINNER = 'Beginner',
  SOME_EXPERIENCE = 'Some Experience',
  EXPERIENCED = 'Experienced',
}

export class PersonalInfoStageDto {
  @ApiProperty({ example: 'Caleb', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Okafor', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'caleb@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+2348012345678', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'Nigeria', required: false })
  @IsString()
  @IsOptional()
  country?: string;
}

export class ProgramSelectionStageDto {
  @ApiProperty({ enum: TrackEnum, example: TrackEnum.BACKEND_DEV })
  @IsEnum(TrackEnum)
  @IsNotEmpty()
  track: TrackEnum;

  @ApiProperty({ example: 'Cohort 4 - Match, 2027' })
  @IsString()
  @IsNotEmpty()
  cohortName: string;

  @ApiProperty({ example: 'cohort-uuid-123', required: false })
  @IsString()
  @IsOptional()
  cohortId?: string;
}

export class ExperiencePortfolioStageDto {
  @ApiProperty({ enum: ExperienceLevelEnum, example: ExperienceLevelEnum.SOME_EXPERIENCE })
  @IsEnum(ExperienceLevelEnum)
  @IsNotEmpty()
  experienceLevel: ExperienceLevelEnum;

  @ApiProperty({ example: 'https://github.com/caleb', required: false })
  @IsString()
  @IsOptional()
  portfolioLink?: string;

  @ApiProperty({ example: 'https://linkedin.com/in/caleb', required: false })
  @IsString()
  @IsOptional()
  linkedinLink?: string;

  @ApiProperty({ example: 'https://example.com/resume.pdf', required: false })
  @IsString()
  @IsOptional()
  resumeUrl?: string;

  @ApiProperty({ example: 'I want to build scalable backend multi-agent systems.' })
  @IsString()
  @IsNotEmpty()
  whyJoin: string;
}

export class ReviewAndPaymentStageDto {
  @ApiProperty({ example: 'Paystack' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}

export class AdmissionReviewDto {
  @ApiProperty({ example: 'user-uuid-applicant-123' })
  @IsString()
  @IsNotEmpty()
  applicantId: string;

  @ApiProperty({ example: 'Accepted', enum: ['Accepted', 'Rejected'] })
  @IsString()
  @IsNotEmpty()
  status: string;
}