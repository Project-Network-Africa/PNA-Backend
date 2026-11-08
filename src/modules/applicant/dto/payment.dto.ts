import { IsEnum, IsNotEmpty, IsNumber, IsString, Min, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethodEnum {
  PAYSTACK = 'Paystack',
  STRIPE = 'Stripe',
  PAYPAL = 'Paypal',
  DEBIT_CARD = 'Debit Card',
}

class CardDetailsDto {
  @ApiProperty({ example: '4532XXXXXXXX1234' })
  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @ApiProperty({ example: '12/28' })
  @IsString()
  @IsNotEmpty()
  expiry: string;

  @ApiProperty({ example: '888' })
  @IsString()
  @IsNotEmpty()
  cvc: string;
}

export class MakePaymentDto {
  @ApiProperty({ example: 45000, description: 'Amount applicant wants to pay towards outstanding balance' })
  @IsNumber()
  @Min(100, { message: 'Minimum payment amount is 100' })
  amount: number;

  @ApiProperty({ enum: PaymentMethodEnum, example: PaymentMethodEnum.PAYSTACK })
  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;

  @ApiProperty({ type: CardDetailsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CardDetailsDto)
  cardDetails: CardDetailsDto;
}

class PaymentHistoryItemDto {
  @ApiProperty({ example: 'pay-uuid-001' })
  id: string;

  @ApiProperty({ example: 'Cohort 3 Tuition Fee' })
  paymentTitle: string;

  @ApiProperty({ example: 22500 })
  amountPaid: number;

  @ApiProperty({ example: 'Successful', enum: ['Successful', 'Unsuccessful', 'Pending'] })
  status: string;

  @ApiProperty({ example: 'Paystack' })
  paymentMethod: string;

  @ApiProperty({ example: 'https://api.pnafrica.org/receipts/pay-uuid-001.pdf', nullable: true })
  receiptDownloadUrl: string | null;

  @ApiProperty({ example: '2026-07-15T12:00:00.000Z' })
  createdAt: string;
}

export class PaymentPageResponseDto {
  @ApiProperty({ example: 22500, description: 'Current outstanding balance (carries over unpaid debt to new cohorts)' })
  outstandingBalance: number;

  @ApiProperty({ example: 45000, description: 'Total payment required for the current cohort' })
  currentCohortFee: number;

  @ApiProperty({ example: 'Make Payment', description: 'Button label next to outstanding balance' })
  makePaymentButtonLabel: string;

  @ApiProperty({ enum: PaymentMethodEnum, isArray: true, example: ['Paystack', 'Stripe', 'Paypal', 'Debit Card'] })
  availablePaymentMethods: string[];

  @ApiProperty({ type: [PaymentHistoryItemDto] })
  paymentHistory: PaymentHistoryItemDto[];
}