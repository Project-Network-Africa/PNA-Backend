import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ApplicantService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  async getDashboardData(userId: string) {
    // 1. Fetch applicant profile & core details
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new NotFoundException('User profile not found');
    }

    const { data: details, error: detailsError } = await this.supabase
      .from('applicant_details')
      .select(`
        profession,
        completion_percentage,
        team_completion_percentage,
        stage,
        cohorts (id, name, start_date, end_date, project_deadline),
        mentors (
          id,
          profession,
          profiles (first_name, last_name, email)
        ),
        teams (id, name),
        projects (id, name, description, image_url)
      `)
      .eq('profile_id', userId)
      .single();

    if (detailsError || !details) {
      throw new NotFoundException('Applicant details not configured yet');
    }

    // 2. Calculate remaining weeks until project deadline
    let weeksRemaining = 0;
    const cohortData = details.cohorts as any;
    const projectDeadline = cohortData?.project_deadline;
    if (projectDeadline) {
      const diffTime = new Date(projectDeadline).getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      weeksRemaining = Math.max(0, Math.ceil(diffDays / 7));
    }

    // 3. Fetch Team Members if team exists
    let teamMembers: any[] = [];
    const teamData = details.teams as any;
    const teamId = teamData?.id;
    if (teamId) {
      const { data: members } = await this.supabase
        .from('applicant_details')
        .select(`profiles (first_name, last_name, email)`)
        .eq('team_id', teamId);

      teamMembers = members?.map((m: any) => ({
        firstName: m.profiles.first_name,
        lastName: m.profiles.last_name,
        email: m.profiles.email,
      })) || [];
    }

    // 4. Fetch Upcoming Deadlines / Tasks for Team
    let tasks: any[] = [];
    if (teamId) {
      const { data: teamTasks } = await this.supabase
        .from('tasks')
        .select('id, title, description, deadline, status')
        .eq('team_id', teamId)
        .gte('deadline', new Date().toISOString())
        .order('deadline', { ascending: true });

      tasks = teamTasks || [];
    }

    // 5. Fetch Notifications for Applicant
    const { data: notifications } = await this.supabase
      .from('notifications')
      .select('id, title, message, type, is_read, created_at')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });

    // 6. Course Progress Stages mapping
    const stagesList = ['Applied', 'Interview', 'Cohort Match', 'Onboarding', 'Active'];
    const currentStageIndex = stagesList.indexOf(details.stage);
    const progressStages = stagesList.map((stg, index) => ({
      stage: stg,
      completed: index <= currentStageIndex,
    }));

    // Format Mentor details & Action link
    const mentorDetails = details.mentors as any;
    const mentorData = mentorDetails ? {
      name: `${mentorDetails.profiles.first_name} ${mentorDetails.profiles.last_name}`,
      profession: mentorDetails.profession,
      email: mentorDetails.profiles.email,
      messageActionUrl: `/messages/mentor/${mentorDetails.id}`,
    } : null;

    const projectData = details.projects as any;

    return {
      applicant: {
        name: `${profile.first_name} ${profile.last_name}`,
        profession: details.profession,
        cohort: cohortData?.name || 'Unassigned',
        weeksRemaining,
        completionPercentage: details.completion_percentage,
        teamCompletionPercentage: details.team_completion_percentage,
      },
      mentor: mentorData,
      team: {
        teamName: teamData?.name || 'No Team Assigned',
        memberCount: teamMembers.length,
        members: teamMembers,
      },
      currentProject: projectData ? {
        name: projectData.name,
        description: projectData.description,
        imageUrl: projectData.image_url,
      } : null,
      upcomingDeadlines: tasks,
      notifications: notifications || [],
      courseProgress: {
        currentStage: details.stage,
        stages: progressStages,
      },
    };
  }
}