import { ApiProperty } from '@nestjs/swagger';

class ApplicantMentorshipProfileDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', nullable: true })
  profilePic: string | null;

  @ApiProperty({ example: 'Product Designer' })
  profession: string;

  @ApiProperty({ example: '/applicant/mentorship/schedule', description: 'Action URL/endpoint to schedule session with mentor' })
  scheduleSessionActionUrl: string;
}

class SessionHistoryDto {
  @ApiProperty({ example: 'sess-uuid-123' })
  id: string;

  @ApiProperty({ example: 'Portfolio Review' })
  sessionTitle: string;

  @ApiProperty({ example: '2026-07-20T14:00:00.000Z' })
  sessionTimeAndDate: string;

  @ApiProperty({ example: 'Completed', enum: ['Completed', 'In Session', 'Scheduled'] })
  status: string;

  @ApiProperty({ example: 'https://zoom.us/j/123456789', nullable: true })
  meetingLink: string | null;
}

class MentorNoteDto {
  @ApiProperty({ example: 'note-uuid-456' })
  id: string;

  @ApiProperty({ example: 'Jane Smith' })
  mentorName: string;

  @ApiProperty({ example: 'Great improvements on your UI wireframes. Make sure to refine the user journey on checkout.' })
  note: string;

  @ApiProperty({ example: '2026-07-10T11:30:00.000Z' })
  createdAt: string;
}

export class MentorshipResponseDto {
  @ApiProperty({ type: ApplicantMentorshipProfileDto })
  applicant: ApplicantMentorshipProfileDto;

  @ApiProperty({ type: [SessionHistoryDto] })
  sessionHistory: SessionHistoryDto[];

  @ApiProperty({ type: [MentorNoteDto] })
  mentorNotes: MentorNoteDto[];
}