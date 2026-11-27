import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';


export enum UserRole {
  APPLICANT = 'Applicant',
  MENTOR = 'Mentor',
  EMPLOYER = 'Employer',
  ADMIN = 'Admin',
}

export class AdminEmailLoginDto {
  @ApiProperty({
    description: 'Registered Admin email configured in ADMIN_EMAILS',
    example: 'ceo@pnafrica.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyAdminLoginDto {
  @ApiProperty({ description: 'Verification token received in the admin email' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class RegisterAcceptedUserDto {
  @ApiProperty({
    description: 'Email address used in your accepted Applicant or Mentor application',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password to use across the PN Africa platform',
    minLength: 8,
    example: 'StrongPass@2026',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Confirm password (must match password)',
    minLength: 8,
    example: 'StrongPass@2026',
  })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}

export class LoginDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPass@2026' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Registered Applicant or Mentor email address',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({
    description: 'Verification token from the password reset email link',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Registered Applicant or Mentor email address',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    minLength: 8,
    example: 'NewStrongPass@2026',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Confirm new password (must match password)',
    minLength: 8,
    example: 'NewStrongPass@2026',
  })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}

export class SubmitMentorApplicationDto {
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
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Product Design' })
  @IsString()
  @IsNotEmpty()
  profession: string;

  @ApiProperty({ example: 6 })
  @IsInt()
  @Min(1)
  yearsOfExperience: number;

  @ApiProperty({ example: 6 })
  @IsInt()
  @Min(1)
  weeklyAvailabilityHours: number;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/ada-okafor' })
  @IsOptional()
  @IsString()
  linkedinLink?: string;

  @ApiPropertyOptional({ example: 'https://adaokafor.design' })
  @IsOptional()
  @IsString()
  portfolioLink?: string;

  @ApiPropertyOptional({ example: 'https://storage.supabase.co/.../cv.pdf' })
  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @ApiPropertyOptional({ example: 'Passionate about mentoring emerging designers.' })
  @IsOptional()
  @IsString()
  bio?: string;
}