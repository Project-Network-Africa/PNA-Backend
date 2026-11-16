import { ApiProperty } from '@nestjs/swagger';

export class PaymentReceiptDto {
  @ApiProperty({ example: 'PNA-17210492837' })
  transactionId: string;

  @ApiProperty({ example: '2026-07-15T12:00:00.000Z' })
  date: string;

  @ApiProperty({ example: 45000 })
  amount: number;

  @ApiProperty({ example: 'Paystack' })
  paymentMethod: string;

  @ApiProperty({ example: 'paid', enum: ['paid', 'unsuccessful'] })
  status: string;

  @ApiProperty({ example: 'https://api.pnafrica.org/receipts/PNA-17210492837.pdf' })
  downloadReceiptUrl: string;
}

export class PaymentConfirmationResponseDto {
  @ApiProperty({ example: true })
  paymentSuccessful: boolean;

  @ApiProperty({ example: 'Payment successful with a check mark' })
  statusMessage: string;

  @ApiProperty({ type: PaymentReceiptDto })
  receipt: PaymentReceiptDto;

  @ApiProperty({ example: '/applicant/payments' })
  backToPaymentUrl: string;
}