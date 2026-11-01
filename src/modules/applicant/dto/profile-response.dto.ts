import { ApiProperty } from '@nestjs/swagger';

export class ApplicantProfileResponseDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'Frontend Developer' })
  profession: string;

  @ApiProperty({ example: 'Cohort 3' })
  cohort: string;

  @ApiProperty({ example: 'Passionate software engineer building scalable web applications.' })
  bio: string;

  @ApiProperty({ example: ['React', 'TypeScript', 'Node.js', 'TailwindCSS'] })
  skills: string[];

  @ApiProperty({ example: 'https://johndoe.dev' })
  portfolioLink: string;

  @ApiProperty({ example: 'https://supabase.co/storage/v1/object/public/resumes/john_resume.pdf' })
  resumeFileUrl: string;

  @ApiProperty({ example: 'https://linkedin.com/in/johndoe' })
  linkedinProfile: string;

  @ApiProperty({ example: '/applicant/profile/edit', description: 'Route/action URL leading to the edit profile page' })
  editProfileUrl: string;
}