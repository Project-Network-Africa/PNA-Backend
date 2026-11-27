import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AdminPaymentsQueryDto {
  @ApiPropertyOptional({
    description: 'Search by payer name, email, or transaction ID/reference',
    example: '#PNA-2026',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by programme/track or "all"',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  programme?: string;

  @ApiPropertyOptional({
    description: 'Filter by status: Paid, Failed, Partial, Refund, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by gateway/method (Paystack, Stripe, Paypal, Debit Card, Nestuge) or "all"',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  method?: string;
}

export class ResolvePaymentActionDto {
  @ApiProperty({
    enum: [
      'MARK_RECONCILED',
      'FLAG_NEED_REVIEW',
      'MARK_PAID',
      'INITIATE_REFUND',
      'APPROVE_REFUND',
    ],
    example: 'MARK_RECONCILED',
  })
  @IsIn([
    'MARK_RECONCILED',
    'FLAG_NEED_REVIEW',
    'MARK_PAID',
    'INITIATE_REFUND',
    'APPROVE_REFUND',
  ])
  actionType:
    | 'MARK_RECONCILED'
    | 'FLAG_NEED_REVIEW'
    | 'MARK_PAID'
    | 'INITIATE_REFUND'
    | 'APPROVE_REFUND';

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @ApiPropertyOptional({ example: 'Confirmed settlement with gateway statement' })
  @IsOptional()
  @IsString()
  notes?: string;
}