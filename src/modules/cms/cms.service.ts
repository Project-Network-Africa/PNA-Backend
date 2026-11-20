import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class CmsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async getContentBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from('cms_contents')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !data) throw new NotFoundException(`CMS content '${slug}' not found`);
    return data;
  }

  async getAllBySection(section: string) {
    const { data, error } = await this.supabase
      .from('cms_contents')
      .select('*')
      .eq('section', section)
      .eq('is_published', true)
      .order('created_at', { ascending: true });

    if (error) throw new NotFoundException(error.message);
    return data;
  }
}