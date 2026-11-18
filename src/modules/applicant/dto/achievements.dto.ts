import { ApiProperty } from '@nestjs/swagger';

class BadgeItemDto {
  @ApiProperty({ example: 'badge-uuid-01' })
  id: string;

  @ApiProperty({ example: 'Fast starter' })
  badgeName: string;

  @ApiProperty({ example: 'Completed onboarding within 24 hours' })
  description: string;

  @ApiProperty({ example: 'Cohort 6' })
  cohortName: string;

  @ApiProperty({ example: '2026-07-02T10:00:00.000Z' })
  earnedAt: string;
}

class ProgramCertificateDto {
  @ApiProperty({ example: 'Downloadable Cohort Certificate' })
  title: string;

  @ApiProperty({ example: true, description: 'True if course completion < 100%' })
  isLocked: boolean;

  @ApiProperty({ example: 85 })
  currentCompletionPercentage: number;

  @ApiProperty({ example: null, nullable: true, description: 'Populated only when completion is 100%' })
  downloadUrl: string | null;
}

export class AchievementsResponseDto {
  @ApiProperty({ type: [BadgeItemDto] })
  badges: BadgeItemDto[];

  @ApiProperty({ type: ProgramCertificateDto })
  programCertificate: ProgramCertificateDto;
}