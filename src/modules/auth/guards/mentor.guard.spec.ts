import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { MentorGuard } from './mentor.guard.js';

function guardReturning(mentor: any) {
  const guard = new MentorGuard();
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: mentor }) };
  (guard as any).supabase = { from: () => query };
  return guard;
}

function ctx(req: any) {
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('MentorGuard', () => {
  it('rejects requests without an authenticated user', async () => {
    await expect(guardReturning(null).canActivate(ctx({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects users with no mentors row', async () => {
    await expect(guardReturning(null).canActivate(ctx({ user: { id: 'u1' } }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects inactive or unapproved mentors', async () => {
    const inactive = guardReturning({ id: 'm1', profile_id: 'u1', is_active: false, verification_status: 'Approved' });
    const pending = guardReturning({ id: 'm1', profile_id: 'u1', is_active: true, verification_status: 'Pending' });
    await expect(inactive.canActivate(ctx({ user: { id: 'u1' } }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(pending.canActivate(ctx({ user: { id: 'u1' } }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows approved active mentors and attaches req.mentor', async () => {
    const req: any = { user: { id: 'u1' } };
    const guard = guardReturning({ id: 'm1', profile_id: 'u1', is_active: true, verification_status: 'Approved' });
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.mentor).toEqual({ id: 'm1', profile_id: 'u1' });
  });
});
