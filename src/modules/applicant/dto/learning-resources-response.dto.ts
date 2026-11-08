import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchLearningResourceQueryDto {
  @ApiProperty({ example: 'design', required: false, description: 'Search keyword to filter resources by title or type' })
  @IsOptional()
  @IsString()
  search?: string;
}

class LearningResourceItemDto {
  @ApiProperty({ example: 'res-uuid-001' })
  id: string;

  @ApiProperty({ example: 'Design System 101' })
  title: string;

  @ApiProperty({ example: 'Comprehensive guide to building scalable design systems.' })
  description: string;

  @ApiProperty({ example: 'pdf', enum: ['pdf', 'doc', 'mp4', 'video', 'link'] })
  fileType: string;

  @ApiProperty({ example: 'https://supabase.co/storage/v1/object/public/resources/design_system.pdf' })
  fileUrl: string;

  @ApiProperty({ example: 45, nullable: true, description: 'Number of pages (for PDFs and docs)' })
  pagesCount: number | null;

  @ApiProperty({ example: 12, nullable: true, description: 'Duration in minutes (for MP4s and videos)' })
  durationMins: number | null;

  @ApiProperty({ example: '2026-07-01T10:00:00.000Z' })
  createdAt: string;
}

export class LearningResourcesResponseDto {
  @ApiProperty({ type: [LearningResourceItemDto] })
  resources: LearningResourceItemDto[];
}