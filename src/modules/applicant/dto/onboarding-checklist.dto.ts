import { ApiProperty } from '@nestjs/swagger';

class OnboardingStepItemDto {
  @ApiProperty({ example: 'step-uuid-101' })
  id: string;

  @ApiProperty({ example: 'Submit KYC & Identity Verification' })
  stepTitle: string;

  @ApiProperty({ example: 'Upload government-issued ID and emergency contact info.' })
  stepDescription: string;

  @ApiProperty({ example: 1 })
  stepOrder: number;

  @ApiProperty({ example: true })
  isCompleted: boolean;

  @ApiProperty({ example: 'Completed', enum: ['Completed', 'Pending'] })
  status: string;

  @ApiProperty({ example: '2026-07-10T14:20:00.000Z', nullable: true })
  completedAt: string | null;
}

export class OnboardingChecklistResponseDto {
  @ApiProperty({ example: 3 })
  completedStepsCount: number;

  @ApiProperty({ example: 5 })
  totalStepsCount: number;

  @ApiProperty({ example: '3 of 5 steps completed' })
  progressIndicatorLabel: string;

  @ApiProperty({ example: 60.0, description: 'Percentage for progress bar' })
  progressPercentage: number;

  @ApiProperty({ type: [OnboardingStepItemDto] })
  steps: OnboardingStepItemDto[];
}