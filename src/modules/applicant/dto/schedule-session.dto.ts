import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

class MentorAvailabilitySlotDto {
  @ApiProperty({ example: 'slot-uuid-999' })
  slotId: string;

  @ApiProperty({ example: '2026-07-25' })
  availableDate: string;

  @ApiProperty({ example: '14:00:00' })
  startTime: string;

  @ApiProperty({ example: '15:00:00' })
  endTime: string;

  @ApiProperty({ example: 'WAT' })
  timezone: string;

  @ApiProperty({ example: 'Saturday 25 July 14:00 WAT' })
  displayLabel: string;

  @ApiProperty({ example: false })
  isSelected: boolean;
}

export class ScheduleSessionViewResponseDto {
  @ApiProperty({ example: 'https://example.com/profile.jpg', nullable: true })
  profilePic: string | null;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: 'Frontend Developer' })
  registeredProfession: string;

  @ApiProperty({ example: 'Jane Smith' })
  mentorName: string;

  @ApiProperty({ type: [MentorAvailabilitySlotDto] })
  availableSlots: MentorAvailabilitySlotDto[];
}

export class ConfirmScheduleSessionDto {
  @ApiProperty({ example: 'slot-uuid-999' })
  @IsUUID()
  @IsNotEmpty()
  slotId: string;

  @ApiProperty({ example: 'Portfolio & Code Review' })
  @IsString()
  @IsNotEmpty()
  sessionTitle: string;
}