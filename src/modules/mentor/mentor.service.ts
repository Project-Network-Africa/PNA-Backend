import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MentorQuickScheduleMeetingDto, MentorQuickLeaveFeedbackDto } from './dto/mentor-dashboard.dto.js';
import {
  CreateBroadcastDto,
  ReviewDecisionDto,
  UpdateMentorSettingsDto,
  UpdateWeeklyHoursDto,
} from './dto/mentor-pages.dto.js';
import {
  cohortWeeks,
  fullName,
  menteeStatus,
  monthlyProgressDelta,
  startOfIsoWeek,
  startOfMonth,
  timeAgo,
} from './mentor.utils.js';

/** Set by MentorGuard on req.mentor */
export type MentorCtx = { id: string; profile_id: string };

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_REVIEW_CRITERIA = ['Meets brief requirements', 'Clear information hierarchy', 'Consistent component usage'];
const PRIVACY_POLICY_URL = 'https://pnafrica.com/privacy-policy';

@Injectable()
export class MentorService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  private async assertAssigned(mentorId: string, menteeId: string) {
    const { data } = await this.supabase
      .from('applicant_details')
      .select('profile_id')
      .eq('profile_id', menteeId)
      .eq('mentor_id', mentorId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Assigned mentee not found');
  }

  private async logAndNotify(
    mentorId: string,
    activity: { title: string; type: string },
    notification?: { profileId: string; title: string; message: string; type?: string },
  ) {
    await Promise.all([
      this.supabase.from('mentor_activities').insert({
        mentor_id: mentorId,
        activity_title: activity.title,
        activity_type: activity.type,
      }),
      notification &&
        this.supabase.from('notifications').insert({
          profile_id: notification.profileId,
          title: notification.title,
          message: notification.message,
          type: notification.type || 'mentor',
        }),
    ]);
  }

  private async responseRate(mentorId: string): Promise<number> {
    const [{ count: total }, { count: reviewed }] = await Promise.all([
      this.supabase.from('mentee_submissions').select('id', { count: 'exact', head: true }).eq('mentor_id', mentorId),
      this.supabase
        .from('mentee_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('mentor_id', mentorId)
        .neq('status', 'Pending Review'),
    ]);
    return total ? Math.round(((reviewed || 0) / total) * 100) : 100;
  }

  // ==========================================
  // DASHBOARD
  // ==========================================
  async getDashboard(mentor: MentorCtx) {
    const nowIso = new Date().toISOString();

    const [{ data: menteesData }, { data: reviewsData }, { data: sessionsData }, responseRatePercentage, { data: activitiesData }] =
      await Promise.all([
        this.supabase
          .from('applicant_details')
          .select('profile_id, profession, completion_percentage, profiles (id, first_name, last_name, avatar_url), cohorts (id, name)')
          .eq('mentor_id', mentor.id),
        this.supabase
          .from('mentee_submissions')
          .select('id, title, submission_url, submitted_at, profiles:mentee_id (first_name, last_name)')
          .eq('mentor_id', mentor.id)
          .eq('status', 'Pending Review')
          .order('submitted_at', { ascending: false }),
        this.supabase
          .from('mentor_sessions')
          .select('id, session_title, session_date, meeting_link, profiles:profile_id (first_name, last_name)')
          .eq('mentor_id', mentor.id)
          .eq('status', 'Scheduled')
          .gte('session_date', nowIso)
          .order('session_date', { ascending: true }),
        this.responseRate(mentor.id),
        this.supabase
          .from('mentor_activities')
          .select('id, activity_title, activity_type, created_at')
          .eq('mentor_id', mentor.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

    const assignedMentees = (menteesData || []).map((m: any) => ({
      menteeId: m.profile_id,
      name: fullName(m.profiles),
      pic: m.profiles?.avatar_url || null,
      registeredProfession: m.profession,
      registeredCohort: m.cohorts?.name || 'Unassigned Cohort',
      status: menteeStatus(Number(m.completion_percentage || 0)),
    }));

    const pendingReviews = (reviewsData || []).map((r: any) => {
      const menteeName = fullName(r.profiles);
      return {
        submissionId: r.id,
        displayTitle: `${r.title} - By ${menteeName}`,
        title: r.title,
        menteeName,
        submissionUrl: r.submission_url,
        submittedAt: r.submitted_at,
      };
    });

    const calendar = (sessionsData || []).map((s: any) => ({
      id: s.id,
      title: s.session_title,
      menteeName: fullName(s.profiles),
      date: s.session_date,
      meetingLink: s.meeting_link,
    }));

    const recentActivity = (activitiesData || []).map((a: any) => ({
      id: a.id,
      title: a.activity_title,
      type: a.activity_type,
      timeAgo: timeAgo(a.created_at),
      createdAt: a.created_at,
    }));

    return {
      assignedMenteesCount: assignedMentees.length,
      pendingReviewsCount: pendingReviews.length,
      upcomingMeetingsCount: calendar.length,
      responseRatePercentage,
      assignedMentees,
      calendar,
      pendingReviews,
      recentActivity,
    };
  }

  async getNotifications(mentor: MentorCtx) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('id, title, message, type, is_read, created_at')
      .eq('profile_id', mentor.profile_id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new BadRequestException(error.message);

    const notifications = (data || []).map((n: any) => ({ ...n, timeAgo: timeAgo(n.created_at) }));
    return { unreadCount: notifications.filter((n) => !n.is_read).length, notifications };
  }

  // ==========================================
  // ASSIGNED MENTEES
  // ==========================================
  async getAssignedMenteesTable(mentor: MentorCtx, status?: 'on_track' | 'needs_attention') {
    const { data: menteesData, error } = await this.supabase
      .from('applicant_details')
      .select('profile_id, profession, completion_percentage, profiles (id, first_name, last_name, avatar_url, updated_at)')
      .eq('mentor_id', mentor.id);

    if (error) throw new BadRequestException(error.message);

    const mentees = await Promise.all(
      (menteesData || []).map(async (m: any) => {
        const { data: latestMsg } = await this.supabase
          .from('messages')
          .select('created_at')
          .or(`sender_id.eq.${m.profile_id},recipient_id.eq.${m.profile_id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          menteeId: m.profile_id,
          pic: m.profiles?.avatar_url || null,
          name: fullName(m.profiles),
          program: m.profession,
          status: menteeStatus(Number(m.completion_percentage || 0)),
          lastActivity: timeAgo(latestMsg?.created_at || m.profiles?.updated_at),
        };
      }),
    );

    const wanted = status === 'on_track' ? 'On Track' : status === 'needs_attention' ? 'Needs Attention' : null;
    return { mentees: wanted ? mentees.filter((m) => m.status === wanted) : mentees };
  }

  async getMenteeDetail(mentor: MentorCtx, menteeId: string) {
    const { data: detail, error } = await this.supabase
      .from('applicant_details')
      .select('profile_id, profession, completion_percentage, profiles (id, first_name, last_name, avatar_url), cohorts (id, name, start_date, end_date)')
      .eq('profile_id', menteeId)
      .eq('mentor_id', mentor.id)
      .maybeSingle();

    if (error || !detail) throw new NotFoundException('Assigned mentee not found');

    const [{ data: projectsData }, { data: notesData }] = await Promise.all([
      this.supabase.from('applicant_projects').select('project_id, status, projects (id, name)').eq('profile_id', menteeId),
      this.supabase
        .from('mentee_private_notes')
        .select('id, note, created_at')
        .eq('mentee_id', menteeId)
        .eq('mentor_id', mentor.id)
        .order('created_at', { ascending: false }),
    ]);

    const cohort = detail.cohorts as any;
    const weeks = cohortWeeks(cohort?.start_date, cohort?.end_date);

    return {
      menteeId: detail.profile_id,
      pic: (detail.profiles as any)?.avatar_url || null,
      name: fullName(detail.profiles as any),
      registeredProfession: detail.profession,
      cohort: cohort?.name || 'Active Cohort',
      cohortProgressPercentage: Number(detail.completion_percentage || 0),
      currentWeek: weeks?.currentWeek ?? null,
      totalWeeks: weeks?.totalWeeks ?? null,
      messageRoute: `/mentor/messages/${detail.profile_id}`,
      projects: (projectsData || []).map((p: any) => ({
        projectId: p.project_id,
        projectName: p.projects?.name || 'Cohort Project',
        status: p.status === 'Completed' ? 'Completed' : 'In Review',
      })),
      privateNotes: (notesData || []).map((n: any) => ({ id: n.id, note: n.note, createdAt: n.created_at })),
    };
  }

  // ==========================================
  // MENTEE ANALYTICS
  // ==========================================
  async getAnalytics(mentor: MentorCtx) {
    const [{ data: menteesData }, { data: mentorRow }, responseRatePercentage, { data: reviewed }] = await Promise.all([
      this.supabase
        .from('applicant_details')
        .select('profile_id, completion_percentage, profiles (first_name, last_name)')
        .eq('mentor_id', mentor.id),
      this.supabase.from('mentors').select('rating, ratings_count').eq('id', mentor.id).single(),
      this.responseRate(mentor.id),
      this.supabase
        .from('mentee_submissions')
        .select('submitted_at, reviewed_at')
        .eq('mentor_id', mentor.id)
        .not('reviewed_at', 'is', null),
    ]);

    const mentees = menteesData || [];
    const ids = mentees.map((m: any) => m.profile_id);
    const { data: history } = ids.length
      ? await this.supabase
          .from('applicant_progress_history')
          .select('profile_id, old_percentage, new_percentage, recorded_at')
          .in('profile_id', ids)
          .order('recorded_at', { ascending: true })
      : { data: [] as any[] };

    const monthStart = startOfMonth(new Date());
    const progress = mentees.map((m: any) => {
      const current = Number(m.completion_percentage || 0);
      const rows = (history || []).filter((h: any) => h.profile_id === m.profile_id);
      return {
        menteeId: m.profile_id,
        name: fullName(m.profiles),
        completionPercentage: current,
        changeThisMonth: monthlyProgressDelta(rows, current, monthStart),
      };
    });

    const avgCompletionRate = progress.length
      ? Math.round(progress.reduce((s, p) => s + p.completionPercentage, 0) / progress.length)
      : 0;

    const reviewDays = (reviewed || []).map(
      (r: any) => (new Date(r.reviewed_at).getTime() - new Date(r.submitted_at).getTime()) / 86400000,
    );
    const avgDaysToReview = reviewDays.length
      ? Math.round((reviewDays.reduce((s, d) => s + d, 0) / reviewDays.length) * 10) / 10
      : null;

    const ratingsCount = Number(mentorRow?.ratings_count || 0);

    return {
      avgCompletionRate,
      // null until at least one mentee has rated (column default is a placeholder, not a real rating)
      avgMenteeSatisfaction: ratingsCount ? Number(Number(mentorRow!.rating).toFixed(1)) : null,
      ratingsCount,
      responseRatePercentage,
      avgDaysToReview,
      progress,
    };
  }

  // ==========================================
  // REVIEWS QUEUE + PROJECT VALIDATION
  // ==========================================
  async getReviewQueue(mentor: MentorCtx) {
    const { data, error } = await this.supabase
      .from('mentee_submissions')
      .select('id, title, submitted_at, due_at, profiles:mentee_id (first_name, last_name)')
      .eq('mentor_id', mentor.id)
      .eq('status', 'Pending Review')
      .order('submitted_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);

    return {
      reviews: (data || []).map((r: any) => ({
        submissionId: r.id,
        title: r.title,
        menteeName: fullName(r.profiles),
        submittedAt: r.submitted_at,
        submittedAgo: timeAgo(r.submitted_at),
        dueAt: r.due_at,
      })),
    };
  }

  async getReview(mentor: MentorCtx, submissionId: string) {
    const { data: s } = await this.supabase
      .from('mentee_submissions')
      .select('id, title, submission_url, status, submitted_at, due_at, review_feedback, review_criteria, reviewed_at, mentee_id, profiles:mentee_id (first_name, last_name)')
      .eq('id', submissionId)
      .eq('mentor_id', mentor.id)
      .maybeSingle();
    if (!s) throw new NotFoundException('Submission not found');

    return {
      submissionId: s.id,
      title: s.title,
      submissionUrl: s.submission_url,
      status: s.status,
      menteeId: s.mentee_id,
      menteeName: fullName(s.profiles as any),
      submittedAt: s.submitted_at,
      dueAt: s.due_at,
      criteria: DEFAULT_REVIEW_CRITERIA,
      checkedCriteria: s.review_criteria || [],
      feedback: s.review_feedback,
      reviewedAt: s.reviewed_at,
    };
  }

  async decideReview(mentor: MentorCtx, submissionId: string, dto: ReviewDecisionDto) {
    const { data: submission } = await this.supabase
      .from('mentee_submissions')
      .select('id, title, mentee_id, project_id')
      .eq('id', submissionId)
      .eq('mentor_id', mentor.id)
      .maybeSingle();
    if (!submission) throw new NotFoundException('Submission not found');

    const approved = dto.decision === 'approve';
    const { error } = await this.supabase
      .from('mentee_submissions')
      .update({
        status: approved ? 'Validated' : 'Changes Requested',
        review_feedback: dto.feedback ?? null,
        review_criteria: dto.criteria ?? [],
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);
    if (error) throw new BadRequestException(error.message);

    // Approving a project submission completes the mentee's project (what quick-actions/validate-project did)
    if (approved && submission.project_id) {
      const { error: projErr } = await this.supabase
        .from('applicant_projects')
        .update({ status: 'Completed' })
        .eq('profile_id', submission.mentee_id)
        .eq('project_id', submission.project_id);
      if (projErr) throw new BadRequestException(projErr.message);
    }

    await this.logAndNotify(
      mentor.id,
      { title: `${approved ? 'Approved' : 'Requested changes on'}: ${submission.title}`, type: approved ? 'Validation' : 'Review' },
      {
        profileId: submission.mentee_id,
        title: approved ? 'Submission Approved' : 'Changes Requested',
        message: approved
          ? `Your mentor approved "${submission.title}".${dto.feedback ? ` ${dto.feedback}` : ''}`
          : `Your mentor requested changes on "${submission.title}": ${dto.feedback}`,
      },
    );

    return { message: approved ? 'Submission approved' : 'Changes requested' };
  }

  // ==========================================
  // FEEDBACK
  // ==========================================
  async getFeedbackHistory(mentor: MentorCtx) {
    const { data, error } = await this.supabase
      .from('mentor_notes')
      .select('id, note, created_at, profile_id, profiles:profile_id (first_name, last_name)')
      .eq('mentor_id', mentor.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new BadRequestException(error.message);

    return {
      feedback: (data || []).map((f: any) => ({
        id: f.id,
        menteeId: f.profile_id,
        menteeName: fullName(f.profiles),
        note: f.note,
        createdAt: f.created_at,
      })),
    };
  }

  async leaveFeedback(mentor: MentorCtx, dto: MentorQuickLeaveFeedbackDto) {
    await this.assertAssigned(mentor.id, dto.menteeId);

    const { data, error } = await this.supabase
      .from('mentor_notes')
      .insert({ mentor_id: mentor.id, profile_id: dto.menteeId, note: dto.note })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    await this.logAndNotify(
      mentor.id,
      { title: 'Left mentorship feedback note for mentee', type: 'Feedback' },
      { profileId: dto.menteeId, title: 'New Mentor Feedback', message: dto.note },
    );

    return { message: 'Feedback left successfully', feedback: data };
  }

  // ==========================================
  // SESSIONS + CALENDAR
  // ==========================================
  async scheduleSession(mentor: MentorCtx, dto: MentorQuickScheduleMeetingDto) {
    await this.assertAssigned(mentor.id, dto.menteeId);

    const { data, error } = await this.supabase
      .from('mentor_sessions')
      .insert({
        mentor_id: mentor.id,
        profile_id: dto.menteeId,
        session_title: dto.sessionTitle,
        session_date: dto.sessionDate,
        status: 'Scheduled',
        meeting_link: dto.meetingLink || 'https://meet.google.com/pna-mentorship',
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    await this.logAndNotify(
      mentor.id,
      { title: `Scheduled meeting: ${dto.sessionTitle}`, type: 'Meeting' },
      {
        profileId: dto.menteeId,
        title: 'New Mentorship Meeting Scheduled',
        message: `Your mentor scheduled "${dto.sessionTitle}" for ${new Date(dto.sessionDate).toLocaleString()}.`,
      },
    );

    return { message: 'Meeting scheduled successfully', session: data };
  }

  async getCalendar(mentor: MentorCtx) {
    const now = new Date();
    const nowIso = now.toISOString();
    const todayIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

    const [{ data: sessions }, { data: reviews }, { data: mentees }] = await Promise.all([
      this.supabase
        .from('mentor_sessions')
        .select('id, session_title, session_date, meeting_link, profiles:profile_id (first_name, last_name)')
        .eq('mentor_id', mentor.id)
        .eq('status', 'Scheduled')
        .gte('session_date', nowIso),
      this.supabase
        .from('mentee_submissions')
        .select('id, title, due_at, profiles:mentee_id (first_name, last_name)')
        .eq('mentor_id', mentor.id)
        .eq('status', 'Pending Review')
        .gte('due_at', todayIso),
      this.supabase.from('applicant_details').select('cohort_id').eq('mentor_id', mentor.id),
    ]);

    const cohortIds = [...new Set((mentees || []).map((m: any) => m.cohort_id).filter(Boolean))];
    const { data: events } = cohortIds.length
      ? await this.supabase
          .from('cohort_calendar_events')
          .select('id, title, event_type, event_date, description')
          .in('cohort_id', cohortIds)
          .gte('event_date', nowIso)
      : { data: [] as any[] };

    const items = [
      ...(sessions || []).map((s: any) => ({
        id: s.id,
        type: 'meeting',
        title: s.session_title,
        menteeName: fullName(s.profiles),
        date: s.session_date,
        meetingLink: s.meeting_link,
      })),
      ...(reviews || []).map((r: any) => ({
        id: r.id,
        type: 'review_due',
        title: `${r.title} review due`,
        menteeName: fullName(r.profiles),
        date: r.due_at,
      })),
      ...(events || []).map((e: any) => ({
        id: e.id,
        type: 'event',
        title: e.title,
        eventType: e.event_type,
        description: e.description,
        date: e.event_date,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { items };
  }

  // ==========================================
  // AVAILABILITY MANAGER
  // ==========================================
  async getAvailability(mentor: MentorCtx) {
    const weekStart = startOfIsoWeek(new Date());
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

    const [{ data: rows, error }, { data: mentorRow }, { count: booked }] = await Promise.all([
      this.supabase
        .from('mentor_weekly_hours')
        .select('day_of_week, start_time, end_time, enabled')
        .eq('mentor_id', mentor.id),
      this.supabase.from('mentors').select('weekly_capacity').eq('id', mentor.id).single(),
      this.supabase
        .from('mentor_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('mentor_id', mentor.id)
        .in('status', ['Scheduled', 'In Session', 'Completed'])
        .gte('session_date', weekStart.toISOString())
        .lt('session_date', weekEnd.toISOString()),
    ]);
    if (error) throw new BadRequestException(error.message);

    const byDay = new Map((rows || []).map((r: any) => [r.day_of_week, r]));
    const weeklyHours = DAY_NAMES.map((dayName, i) => {
      const r: any = byDay.get(i + 1);
      return {
        day: i + 1,
        dayName,
        enabled: Boolean(r?.enabled),
        startTime: r?.start_time?.slice(0, 5) ?? null,
        endTime: r?.end_time?.slice(0, 5) ?? null,
      };
    });

    return {
      weeklyHours,
      weeklyCapacity: { booked: booked || 0, capacity: Number(mentorRow?.weekly_capacity || 10) },
    };
  }

  async updateAvailability(mentor: MentorCtx, dto: UpdateWeeklyHoursDto) {
    for (const d of dto.days) {
      if (d.enabled && d.startTime! >= d.endTime!) {
        throw new BadRequestException(`${DAY_NAMES[d.day - 1]}: startTime must be before endTime`);
      }
    }

    const nowIso = new Date().toISOString();
    const { error } = await this.supabase.from('mentor_weekly_hours').upsert(
      dto.days.map((d) => ({
        mentor_id: mentor.id,
        day_of_week: d.day,
        enabled: d.enabled,
        start_time: d.enabled ? d.startTime : null,
        end_time: d.enabled ? d.endTime : null,
        updated_at: nowIso,
      })),
      { onConflict: 'mentor_id,day_of_week' },
    );
    if (error) throw new BadRequestException(error.message);

    return this.getAvailability(mentor);
  }

  // ==========================================
  // COHORT BROADCAST
  // ==========================================
  async getBroadcasts(mentor: MentorCtx) {
    const [{ data, error }, { count }] = await Promise.all([
      this.supabase
        .from('mentor_broadcasts')
        .select('id, message, recipients_count, created_at')
        .eq('mentor_id', mentor.id)
        .order('created_at', { ascending: false })
        .limit(50),
      this.supabase.from('applicant_details').select('profile_id', { count: 'exact', head: true }).eq('mentor_id', mentor.id),
    ]);
    if (error) throw new BadRequestException(error.message);

    return {
      assignedMenteesCount: count || 0,
      broadcasts: (data || []).map((b: any) => ({
        id: b.id,
        message: b.message,
        recipientsCount: b.recipients_count,
        createdAt: b.created_at,
        timeAgo: timeAgo(b.created_at),
      })),
    };
  }

  async sendBroadcast(mentor: MentorCtx, dto: CreateBroadcastDto) {
    const { data: mentees } = await this.supabase.from('applicant_details').select('profile_id').eq('mentor_id', mentor.id);
    if (!mentees?.length) throw new BadRequestException('You have no assigned mentees to broadcast to');

    const { data: broadcast, error } = await this.supabase
      .from('mentor_broadcasts')
      .insert({ mentor_id: mentor.id, message: dto.message, recipients_count: mentees.length })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    const { error: notifyErr } = await this.supabase.from('notifications').insert(
      mentees.map((m: any) => ({ profile_id: m.profile_id, title: 'Message from your mentor', message: dto.message, type: 'mentor' })),
    );
    if (notifyErr) throw new BadRequestException(notifyErr.message);

    await this.logAndNotify(mentor.id, { title: `Sent broadcast to ${mentees.length} mentees`, type: 'Broadcast' });

    return { message: 'Broadcast sent', broadcast };
  }

  // ==========================================
  // RESOURCE LIBRARY
  // ==========================================
  async getResources() {
    const { data, error } = await this.supabase
      .from('learning_resources')
      .select('id, title, description, file_type, file_url, category')
      .eq('audience', 'mentor')
      .order('title', { ascending: true });
    if (error) throw new BadRequestException(error.message);

    const groups = new Map<string, any[]>();
    for (const r of data || []) {
      if (!groups.has(r.category)) groups.set(r.category, []);
      groups.get(r.category)!.push({ id: r.id, title: r.title, description: r.description, fileType: r.file_type, downloadUrl: r.file_url });
    }
    return { categories: [...groups].map(([category, resources]) => ({ category, resources })) };
  }

  // ==========================================
  // SETTINGS
  // ==========================================
  async getSettings(mentor: MentorCtx) {
    const [{ data: profile }, { data: mentorRow }] = await Promise.all([
      this.supabase.from('profiles').select('first_name, last_name, email').eq('id', mentor.profile_id).single(),
      this.supabase.from('mentors').select('weekly_capacity, show_profile_to_mentees').eq('id', mentor.id).single(),
    ]);

    return {
      fullName: fullName(profile),
      email: profile?.email ?? null, // read-only
      weeklyCapacity: mentorRow?.weekly_capacity ?? 10,
      showProfileToMentees: mentorRow?.show_profile_to_mentees ?? true,
      privacyPolicyUrl: PRIVACY_POLICY_URL,
    };
  }

  async updateSettings(mentor: MentorCtx, dto: UpdateMentorSettingsDto) {
    const nowIso = new Date().toISOString();

    if (dto.fullName !== undefined) {
      const [first, ...rest] = dto.fullName.trim().split(/\s+/);
      const { error } = await this.supabase
        .from('profiles')
        .update({ first_name: first, last_name: rest.join(' '), updated_at: nowIso })
        .eq('id', mentor.profile_id);
      if (error) throw new BadRequestException(error.message);
    }

    const mentorPatch: Record<string, unknown> = {};
    if (dto.weeklyCapacity !== undefined) mentorPatch.weekly_capacity = dto.weeklyCapacity;
    if (dto.showProfileToMentees !== undefined) mentorPatch.show_profile_to_mentees = dto.showProfileToMentees;
    if (Object.keys(mentorPatch).length) {
      const { error } = await this.supabase.from('mentors').update(mentorPatch).eq('id', mentor.id);
      if (error) throw new BadRequestException(error.message);
    }

    return this.getSettings(mentor);
  }

  async downloadMyData(mentor: MentorCtx) {
    const [profile, mentorRow, sessions, feedback, broadcasts, weeklyHours] = await Promise.all([
      this.supabase.from('profiles').select('*').eq('id', mentor.profile_id).single(),
      this.supabase.from('mentors').select('*').eq('id', mentor.id).single(),
      this.supabase.from('mentor_sessions').select('*').eq('mentor_id', mentor.id),
      this.supabase.from('mentor_notes').select('*').eq('mentor_id', mentor.id),
      this.supabase.from('mentor_broadcasts').select('*').eq('mentor_id', mentor.id),
      this.supabase.from('mentor_weekly_hours').select('*').eq('mentor_id', mentor.id),
    ]);

    return {
      message: 'User data compiled successfully for download',
      exportData: {
        profile: profile.data,
        mentor: mentorRow.data,
        sessions: sessions.data,
        feedback: feedback.data,
        broadcasts: broadcasts.data,
        weeklyHours: weeklyHours.data,
        exportedAt: new Date().toISOString(),
      },
    };
  }
}
