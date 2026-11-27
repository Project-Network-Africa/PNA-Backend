import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use after JwtAuthGuard. Checks the mentors table (not the JWT role claim, which signup lets users pick)
// and attaches req.mentor = { id, profile_id }.
@Injectable()
export class MentorGuard implements CanActivate {
  private supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    const { data: mentor } = await this.supabase
      .from('mentors')
      .select('id, profile_id, is_active, verification_status')
      .eq('profile_id', userId)
      .maybeSingle();

    if (!mentor || mentor.is_active === false || mentor.verification_status !== 'Approved') {
      throw new ForbiddenException('Mentor access only');
    }

    req.mentor = { id: mentor.id, profile_id: mentor.profile_id };
    return true;
  }
}
