import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

class ConversationItemDto {
  @ApiProperty({ example: 'user-uuid-456' })
  recipientId: string;

  @ApiProperty({ example: 'Jane Smith' })
  name: string;

  @ApiProperty({ example: 'Senior Product Designer' })
  profession: string;

  @ApiProperty({ example: 'mentor', enum: ['mentor', 'team-mate'] })
  roleType: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: 'Hey, please review the sprint wireframes.' })
  lastMessage: string;

  @ApiProperty({ example: '2 hours ago' })
  timeAgo: string;
}

export class ConversationsListResponseDto {
  @ApiProperty({ type: [ConversationItemDto] })
  conversations: ConversationItemDto[];
}

class ChatMessageItemDto {
  @ApiProperty({ example: 'msg-uuid-001' })
  id: string;

  @ApiProperty({ example: 'user-uuid-456' })
  senderId: string;

  @ApiProperty({ example: 'Hello team, let’s sync at 2 PM.' })
  message: string;

  @ApiProperty({ example: '2026-07-15T10:00:00.000Z' })
  createdAt: string;
}

export class ChatThreadResponseDto {
  @ApiProperty({ example: 'Jane Smith' })
  name: string;

  @ApiProperty({ example: 'Senior Product Designer' })
  profession: string;

  @ApiProperty({ example: 'mentor', enum: ['mentor', 'team-mate'] })
  roleType: string;

  @ApiProperty({ type: [ChatMessageItemDto] })
  chats: ChatMessageItemDto[];
}

export class SendMessageDto {
  @ApiProperty({ example: 'user-uuid-456' })
  @IsUUID()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({ example: 'Sounds good! I will be ready.' })
  @IsString()
  @IsNotEmpty()
  message: string;
}