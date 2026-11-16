import { ApiProperty } from '@nestjs/swagger';

class CalendarAgendaItemDto {
  @ApiProperty({ example: 'cal-uuid-001' })
  id: string;

  @ApiProperty({ example: 'Cohort Town Hall' })
  title: string;

  @ApiProperty({ example: 'Event', enum: ['Event', 'Session', 'Deadline', 'Payment'] })
  eventType: string;

  @ApiProperty({ example: 'Friday' })
  dayOfWeek: string;

  @ApiProperty({ example: '2026-07-24' })
  date: string;

  @ApiProperty({ example: '10:00 AM WAT' })
  time: string;

  @ApiProperty({ example: '2026-07-24T10:00:00.000Z' })
  eventTimestamp: string;

  @ApiProperty({ example: 'Monthly sync with all cohort participants and leadership.', nullable: true })
  description: string | null;
}

export class CalendarResponseDto {
  @ApiProperty({ type: [CalendarAgendaItemDto] })
  agenda: CalendarAgendaItemDto[];
}