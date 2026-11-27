import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AdminContentQueryDto {
  @ApiPropertyOptional({
    description: 'Search content items by title, slug, category, type, or author',
    example: 'Product Design',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by content type (e.g., Blog Post, Event, Guide) or "all"',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by category (e.g., Alumni, Product) or "all"',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by author name or "all"',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({
    description: 'Filter by status: Published, Draft, Scheduled, Needs Review, or all',
    example: 'all',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Start of date range filter (YYYY-MM-DD or ISO string)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End of date range filter (YYYY-MM-DD or ISO string)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Sort order: last_updated_desc (default) or last_updated_asc',
    example: 'last_updated_desc',
  })
  @IsOptional()
  @IsIn(['last_updated_desc', 'last_updated_asc'])
  sort?: 'last_updated_desc' | 'last_updated_asc';
}

export class CreateAdminContentDto {
  @ApiProperty({ example: 'Product Design Guide' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'product-design-guide' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'guides' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty({ example: 'Blog Post' })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({ example: 'Product' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: 'Caleb' })
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional({
    enum: ['Published', 'Draft', 'Scheduled', 'Needs Review'],
    example: 'Draft',
  })
  @IsOptional()
  @IsIn(['Published', 'Draft', 'Scheduled', 'Needs Review'])
  status?: 'Published' | 'Draft' | 'Scheduled' | 'Needs Review';

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: '2026-12-05T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  publishDate?: string;

  @ApiPropertyOptional({ example: 'A comprehensive guide to product design workflows.' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ example: 'https://example.com/banner.png' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class UpdateAdminContentDto {
  @ApiPropertyOptional({ example: 'Community Demo Day' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Event' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({ example: 'Alumni' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Caleb' })
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional({
    enum: ['Published', 'Draft', 'Scheduled', 'Needs Review'],
  })
  @IsOptional()
  @IsIn(['Published', 'Draft', 'Scheduled', 'Needs Review'])
  status?: 'Published' | 'Draft' | 'Scheduled' | 'Needs Review';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: '2026-12-10T14:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  publishDate?: string;

  @ApiPropertyOptional({ example: 'Updated content body' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ example: 'Ready for publish' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class BulkContentActionDto {
  @ApiProperty({
    type: [String],
    example: ['11111111-1111-1111-1111-111111111111'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  contentIds: string[];

  @ApiProperty({
    enum: [
      'PUBLISH',
      'MOVE_TO_DRAFT',
      'SUBMIT_FOR_REVIEW',
      'FEATURE',
      'UNFEATURE',
      'DELETE',
    ],
    example: 'PUBLISH',
  })
  @IsIn([
    'PUBLISH',
    'MOVE_TO_DRAFT',
    'SUBMIT_FOR_REVIEW',
    'FEATURE',
    'UNFEATURE',
    'DELETE',
  ])
  action:
    | 'PUBLISH'
    | 'MOVE_TO_DRAFT'
    | 'SUBMIT_FOR_REVIEW'
    | 'FEATURE'
    | 'UNFEATURE'
    | 'DELETE';
}