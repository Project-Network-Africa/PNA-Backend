import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ReviewSubmissionDto,
  MentorQuickScheduleMeetingDto,
  MentorQuickLeaveFeedbackDto,
  MentorQuickValidateProjectDto,
} from './dto/mentor-dashboard.dto.js';

@Injectable()
export class MentorService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  private async getMentorRecord(userId: string) {
    const { data: mentor, error } = await this.supabase
      .from('mentors')
      .select('id, profile_id, profession')
      .eq('profile_id', userId)
      .single();

    if (error || !mentor) {
      throw new NotFoundException('Mentor profile not found');
    }
    return mentor;
  }

  private formatTimeAgo(dateString: string | null): string {
    if (!dateString) return 'No activity yet';
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  // ==========================================
  // 1. MENTOR DASHBOARD PAGE
  // ==========================================
  async getDashboard(userId: string) {
    const mentor = await this.getMentorRecord(userId);

    // A. Fetch assigned mentees
    const { data: menteesData } = await this.supabase
      .from('applicant_details')
      .select(`
        profile_id,
        profession,
        completion_percentage,
        profiles (id, first_name, last_name, avatar_url, updated_at),
        cohorts (id, name)
      `)
      .eq('mentor_id', mentor.id);

    const assignedMentees = (menteesData || []).map((m: any) => {
      const completion = Number(m.completion_percentage || 0);
      // Determine On Track vs Need Attention (e.g., < 40% completion flags Need Attention)
      const status = completion >= 40 ? 'On Track' : 'Need Attention';

      return {
        menteeId: m.profile_id,
        name: `${m.profiles?.first_name || ''} ${m.profiles?.last_name || ''}`.trim(),
        pic: m.profiles?.avatar_url || null,
        registeredProfession: m.profession,
        registeredCohort: m.cohorts?.name || 'Unassigned Cohort',
        status,
      };
    });

    // B. Fetch pending reviews
    const { data: reviewsData } = await this.supabase
      .from('mentee_submissions')
      .select(`
        id,
        title,
        submission_url,
        submitted_at,
        profiles:mentee_id (first_name, last_name)
      `)
      .eq('mentor_id', mentor.id)
      .eq('status', 'Pending Review')
      .order('submitted_at', { ascending: false });

    const pendingReviews = (reviewsData || []).map((r: any) => {
      const menteeName = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.trim();
      return {
        submissionId: r.id,
        displayTitle: `${r.title} - By ${menteeName}`,
        title: r.title,
        menteeName,
        submissionUrl: r.submission_url,
        submittedAt: r.submitted_at,
      };
    });

    // C. Fetch upcoming meetings & calendar items
    const nowIso = new Date().toISOString();
    const { data: sessionsData } = await this.supabase
      .from('mentor_sessions')
      .select(`
        id,
        session_title,
        session_date,
        status,
        meeting_link,
        profiles:profile_id (first_name, last_name)
      `)
      .eq('mentor_id', mentor.id)
      .gte('session_date', nowIso)
      .eq('status', 'Scheduled')
      .order('session_date', { ascending: true });

    const calendar = (sessionsData || []).map((s: any) => ({
      id: s.id,
      title: s.session_title,
      menteeName: `${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`.trim(),
      date: s.session_date,
      meetingLink: s.meeting_link,
    }));

    // D. Calculate Response Rate (%)
    const { count: totalSubmissions } = await this.supabase
      .from('mentee_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('mentor_id', mentor.id);

    const { count: reviewedSubmissions } = await this.supabase
      .from('mentee_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('mentor_id', mentor.id)
      .neq('status', 'Pending Review');

    const responseRatePercentage =
      totalSubmissions && totalSubmissions > 0
        ? Math.round(((reviewedSubmissions || 0) / totalSubmissions) * 100)
        : 100;

    // E. Fetch Recent Activity
    const { data: activitiesData } = await this.supabase
      .from('mentor_activities')
      .select('id, activity_title, activity_type, created_at')
      .eq('mentor_id', mentor.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentActivity = (activitiesData || []).map((a: any) => ({
      id: a.id,
      title: a.activity_title,
      type: a.activity_type,
      timeAgo: this.formatTimeAgo(a.created_at),
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

  // ==========================================
  // 2. PENDING REVIEW BUTTON ACTION
  // ==========================================
  async reviewSubmission(userId: string, submissionId: string, dto: ReviewSubmissionDto) {
    const mentor = await this.getMentorRecord(userId);

    const { data: submission, error: fetchError } = await this.supabase
      .from('mentee_submissions')
      .select('id, title, mentee_id')
      .eq('id', submissionId)
      .eq('mentor_id', mentor.id)
      .single();

    if (fetchError || !submission) {
      throw new NotFoundException('Submission not found');
    }

    const { error } = await this.supabase
      .from('mentee_submissions')
      .update({
        status: 'Reviewed',
        review_feedback: dto.feedback,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Log activity & notify mentee
    await this.supabase.from('mentor_activities').insert({
      mentor_id: mentor.id,
      activity_title: `Reviewed submission: ${submission.title}`,
      activity_type: 'Review',
    });

    await this.supabase.from('notifications').insert({
      profile_id: submission.mentee_id,
      title: 'Work Reviewed by Mentor',
      message: `Your mentor reviewed "${submission.title}": ${dto.feedback}`,
      type: 'mentor',
    });

    return { message: 'Submission reviewed successfully' };
  }

  // ==========================================
  // 3. QUICK ACTIONS ('Schedule Meeting', 'Leave feedback', 'Validate project')
  // ==========================================
  async quickScheduleMeeting(userId: string, dto: MentorQuickScheduleMeetingDto) {
    const mentor = await this.getMentorRecord(userId);

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

    await this.supabase.from('mentor_activities').insert({
      mentor_id: mentor.id,
      activity_title: `Scheduled meeting: ${dto.sessionTitle}`,
      activity_type: 'Meeting',
    });

    await this.supabase.from('notifications').insert({
      profile_id: dto.menteeId,
      title: 'New Mentorship Meeting Scheduled',
      message: `Your mentor scheduled "${dto.sessionTitle}" for ${new Date(dto.sessionDate).toLocaleString()}.`,
      type: 'mentor',
    });

    return { message: 'Meeting scheduled successfully', session: data };
  }

  async quickLeaveFeedback(userId: string, dto: MentorQuickLeaveFeedbackDto) {
    const mentor = await this.getMentorRecord(userId);

    const { data, error } = await this.supabase
      .from('mentor_notes')
      .insert({
        mentor_id: mentor.id,
        profile_id: dto.menteeId,
        note: dto.note,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.supabase.from('mentor_activities').insert({
      mentor_id: mentor.id,
      activity_title: 'Left mentorship feedback note for mentee',
      activity_type: 'Feedback',
    });

    await this.supabase.from('notifications').insert({
      profile_id: dto.menteeId,
      title: 'New Mentor Feedback',
      message: dto.note,
      type: 'mentor',
    });

    return { message: 'Feedback left successfully', feedback: data };
  }

  async quickValidateProject(userId: string, dto: MentorQuickValidateProjectDto) {
    const mentor = await this.getMentorRecord(userId);

    const { error } = await this.supabase
      .from('applicant_projects')
      .update({ status: 'Completed' })
      .eq('profile_id', dto.menteeId)
      .eq('project_id', dto.projectId);

    if (error) throw new BadRequestException(error.message);

    await this.supabase.from('mentor_activities').insert({
      mentor_id: mentor.id,
      activity_title: 'Validated and approved mentee project',
      activity_type: 'Validation',
    });

    await this.supabase.from('notifications').insert({
      profile_id: dto.menteeId,
      title: 'Project Validated!',
      message: 'Your mentor has validated and marked your project as Completed.',
      type: 'cohort',
    });

    return { message: 'Project validated successfully' };
  }

  // ==========================================
  // 4. ASSIGNED MENTEES TABLE PAGE
  // ==========================================
  async getAssignedMenteesTable(userId: string) {
    const mentor = await this.getMentorRecord(userId);

    const { data: menteesData, error } = await this.supabase
      .from('applicant_details')
      .select(`
        profile_id,
        profession,
        completion_percentage,
        profiles (id, first_name, last_name, avatar_url, updated_at)
      `)
      .eq('mentor_id', mentor.id);

    if (error) throw new BadRequestException(error.message);

    const mentees = await Promise.all(
      (menteesData || []).map(async (m: any) => {
        // Check latest activity timestamp from messages or submissions
        const { data: latestMsg } = await this.supabase
          .from('messages')
          .select('created_at')
          .or(`sender_id.eq.${m.profile_id},recipient_id.eq.${m.profile_id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastTimestamp = latestMsg?.created_at || m.profiles?.updated_at;
        const completion = Number(m.completion_percentage || 0);

        return {
          menteeId: m.profile_id,
          pic: m.profiles?.avatar_url || null,
          name: `${m.profiles?.first_name || ''} ${m.profiles?.last_name || ''}`.trim(),
          program: m.profession,
          status: completion >= 40 ? 'On Track' : 'Need Attention',
          lastActivity: this.formatTimeAgo(lastTimestamp),
        };
      }),
    );

    return { mentees };
  }

  // ==========================================
  // 5. MENTEE DETAIL PAGE (On Clicking Any Mentee)
  // ==========================================
  async getMenteeDetail(userId: string, menteeId: string) {
    const mentor = await this.getMentorRecord(userId);

    const { data: detail, error } = await this.supabase
      .from('applicant_details')
      .select(`
        profile_id,
        profession,
        completion_percentage,
        profiles (id, first_name, last_name, avatar_url),
        cohorts (id, name)
      `)
      .eq('profile_id', menteeId)
      .eq('mentor_id', mentor.id)
      .single();

    if (error || !detail) {
      throw new NotFoundException('Assigned mentee not found');
    }

    // Fetch assigned projects and map status to 'In Review' or 'Completed'
    const { data: projectsData } = await this.supabase
      .from('applicant_projects')
      .select(`
        project_id,
        status,
        projects (id, name)
      `)
      .eq('profile_id', menteeId);

    const projects = (projectsData || []).map((p: any) => ({
      projectId: p.project_id,
      projectName: p.projects?.name || 'Cohort Project',
      status: p.status === 'Completed' ? 'Completed' : 'In Review',
    }));

    // Fetch private notes sent from mentee to mentor
    const { data: notesData } = await this.supabase
      .from('mentee_private_notes')
      .select('id, note, created_at')
      .eq('mentee_id', menteeId)
      .eq('mentor_id', mentor.id)
      .order('created_at', { ascending: false });

    const privateNotes = (notesData || []).map((n: any) => ({
      id: n.id,
      note: n.note,
      createdAt: n.created_at,
    }));

    return {
      menteeId: detail.profile_id,
      pic: (detail.profiles as any)?.avatar_url || null,
      name: `${(detail.profiles as any)?.first_name || ''} ${(detail.profiles as any)?.last_name || ''}`.trim(),
      registeredProfession: detail.profession,
      cohort: (detail.cohorts as any)?.name || 'Active Cohort',
      cohortProgressPercentage: Number(detail.completion_percentage || 0),
      messageRoute: `/mentor/messages/${detail.profile_id}`,
      projects,
      privateNotes,
    };
  }
}