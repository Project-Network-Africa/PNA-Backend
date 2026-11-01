import { ApiProperty } from '@nestjs/swagger';

class ApplicationStageDto {
  @ApiProperty({ example: 'Application submitted' })
  name: string;

  @ApiProperty({ example: true })
  completed: boolean;

  @ApiProperty({ example: '2026-07-08T10:30:00.000Z', nullable: true })
  date: string | null;

  @ApiProperty({ example: 'Completed' })
  status: string;
}

export class ApplicationStatusResponseDto {
  @ApiProperty({ type: [ApplicationStageDto] })
  stages: ApplicationStageDto[];

  @ApiProperty({ 
    example: true, 
    description: 'True and displays "Go to onboarding checklist" button only when the onboarding stage shows pending.' 
  })
  showOnboardingChecklistButton: boolean;
}