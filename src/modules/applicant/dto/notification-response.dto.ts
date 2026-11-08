import { ApiProperty } from '@nestjs/swagger';

class NotificationItemDto {
  @ApiProperty({ example: 'notif-uuid-123' })
  id: string;

  @ApiProperty({ example: 'Mentor Feedback' })
  title: string;

  @ApiProperty({ example: 'Mentor left new feedback on project PN Africa LMS Portal' })
  message: string;

  @ApiProperty({ example: 'mentor', enum: ['payment', 'cohort', 'mentor', 'pna_info', 'general'] })
  type: string;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2026-07-15T14:30:00.000Z' })
  createdAt: string;
}

export class NotificationsResponseDto {
  @ApiProperty({ type: [NotificationItemDto] })
  notifications: NotificationItemDto[];
}