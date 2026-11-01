import { IsOptional, IsString, IsArray, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Frontend Developer', required: false })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiProperty({ example: 'Passionate software engineer building scalable web applications.', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ example: ['React', 'TypeScript', 'Node.js'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ example: 'https://johndoe.dev', required: false })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid portfolio URL format' })
  portfolioLink?: string;

  @ApiProperty({ example: 'https://supabase.co/storage/...', required: false })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid resume file URL format' })
  resumeFileUrl?: string;

  @ApiProperty({ example: 'https://linkedin.com/in/johndoe', required: false })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid LinkedIn URL format' })
  linkedinProfile?: string;
}