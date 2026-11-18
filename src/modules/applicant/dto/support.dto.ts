import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({ example: 'Unable to download payment receipt' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'When I click download receipt on my last Paystack payment, nothing happens.' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

class FaqItemDto {
  @ApiProperty({ example: 'faq-uuid-01' })
  id: string;

  @ApiProperty({ example: 'How do I schedule a session with my mentor?' })
  question: string;

  @ApiProperty({ example: 'Go to the Mentorship page and click Schedule Session to pick from available time slots.' })
  answer: string;
}

class SupportTicketItemDto {
  @ApiProperty({ example: 'ticket-uuid-01' })
  id: string;

  @ApiProperty({ example: 'Unable to download payment receipt' })
  subject: string;

  @ApiProperty({ example: 'When I click download receipt on my last Paystack payment, nothing happens.' })
  message: string;

  @ApiProperty({ example: 'Resolved', enum: ['Open', 'In Progress', 'Resolved'] })
  status: string;

  @ApiProperty({ example: true })
  isResolved: boolean;

  @ApiProperty({ example: '2026-07-14T15:30:00.000Z' })
  createdAt: string;
}

export class HelpAndSupportResponseDto {
  @ApiProperty({ type: [FaqItemDto] })
  faqs: FaqItemDto[];

  @ApiProperty({ type: [SupportTicketItemDto] })
  supportTickets: SupportTicketItemDto[];
}