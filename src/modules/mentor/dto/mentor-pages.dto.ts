import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class MenteesQueryDto {
  @ApiProperty({ required: false, enum: ['on_track', 'needs_attention'] })
  @IsOptional()
  @IsIn(['on_track', 'needs_attention'])
  status?: 'on_track' | 'needs_attention';
}

export class ReviewDecisionDto {
  @ApiProperty({ enum: ['approve', 'request_changes'] })
  @IsIn(['approve', 'request_changes'])
  decision: 'approve' | 'request_changes';

  @ApiProperty({ required: false, type: [String], example: ['Meets brief requirements', 'Clear information hierarchy'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  criteria?: string[];

  @ApiProperty({ required: false, description: 'Required when requesting changes' })
  @ValidateIf((o) => o.decision === 'request_changes' || o.feedback !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  feedback?: string;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WeeklyHoursDayDto {
  @ApiProperty({ example: 1, description: '1 = Monday ... 7 = Sunday' })
  @IsInt()
  @Min(1)
  @Max(7)
  day: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: '14:00', required: false })
  @ValidateIf((o) => o.enabled)
  @Matches(TIME, { message: 'startTime must be HH:MM' })
  startTime?: string;

  @ApiProperty({ example: '16:00', required: false })
  @ValidateIf((o) => o.enabled)
  @Matches(TIME, { message: 'endTime must be HH:MM' })
  endTime?: string;
}

export class UpdateWeeklyHoursDto {
  @ApiProperty({ type: [WeeklyHoursDayDto] })
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique((d: WeeklyHoursDayDto) => d.day)
  @ValidateNested({ each: true })
  @Type(() => WeeklyHoursDayDto)
  days: WeeklyHoursDayDto[];
}

export class CreateBroadcastDto {
  @ApiProperty({ example: 'Reminder: cohort town hall is this Friday at 4 PM.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}

export class UpdateMentorSettingsDto {
  @ApiProperty({ required: false, example: 'Amara Okafor' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @ApiProperty({ required: false, example: 10, description: 'Max sessions per week' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  weeklyCapacity?: number;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  showProfileToMentees?: boolean;
}
