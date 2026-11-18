import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendReferralInviteDto {
  @ApiProperty({ example: 'friend@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

class RewardProgressDto {
  @ApiProperty({ example: 2, description: 'Number of referred friends who joined' })
  joinedCount: number;

  @ApiProperty({ example: 3, description: 'Target number of joined referrals needed' })
  targetCount: number;

  @ApiProperty({ example: 67, description: 'Progress bar fill percentage' })
  progressPercentage: number;

  @ApiProperty({ example: false })
  rewardUnlocked: boolean;

  @ApiProperty({ example: '1 Free Month of Mentorship Credits' })
  rewardTitle: string;
}

export class ReferralPageResponseDto {
  @ApiProperty({ example: 'https://pnafrica.com/refer/john-doe' })
  referralLink: string;

  @ApiProperty({ type: RewardProgressDto })
  rewardProgress: RewardProgressDto;

  @ApiProperty({ example: [{ email: 'friend@example.com', status: 'Joined', sentAt: '2026-07-10T10:00:00Z' }] })
  invitedList: any[];
}