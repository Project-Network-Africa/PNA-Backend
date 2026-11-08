import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class EditProfileResponseDto {
  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: '+2348012345678' })
  phoneNumber: string;

  @ApiProperty({ example: 'Lagos, Nigeria' })
  location: string;

  @ApiProperty({ example: 'https://johndoe.dev' })
  portfolioUrl: string;

  @ApiProperty({ example: 'https://linkedin.com/in/johndoe' })
  linkedinUrl: string;

  @ApiProperty({ example: 'Passionate software engineer building scalable web applications.' })
  bio: string;

  @ApiProperty({ example: ['React', 'TypeScript', 'Node.js'] })
  skills: string[];

  @ApiProperty({ example: 'john.doe@example.com', description: 'View-only field' })
  email: string;

  @ApiProperty({ example: 'Frontend Developer', description: 'View-only field (Registered profession)' })
  profession: string;

  @ApiProperty({ example: 'Cohort 3', description: 'View-only field (Group/Cohort)' })
  cohortName: string;
}

export class UpdateEditProfileDto {
  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: '+2348012345678', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: 'Lagos, Nigeria', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: 'https://johndoe.dev', required: false })
  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;

  @ApiProperty({ example: 'https://linkedin.com/in/johndoe', required: false })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiProperty({ example: 'Passionate software engineer building scalable web applications.', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ example: ['React', 'TypeScript', 'Node.js'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}