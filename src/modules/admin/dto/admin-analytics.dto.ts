import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class AdminAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Comparison window for period-over-period deltas: 30d, 90d, or ytd',
    example: '90d',
  })
  @IsOptional()
  @IsIn(['30d', '90d', 'ytd'])
  period?: '30d' | '90d' | 'ytd';
}