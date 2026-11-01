import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UpdateProfileDto } from './dto/update-profile.dto.js'
import { UploadTeamFileDto } from './dto/team-workspace-response.dto.js';

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

  async getApplicationStatus(userId: string) {
    const { data: details, error } = await this.supabase
      .from('applicant_details')
      .select('submitted_at, review_at, interview_at, cohort_match_at, onboarding_at')
      .eq('profile_id', userId)
      .single();

    if (error || !details) {
      throw new NotFoundException('Applicant details not found');
    }

    const stagesConfig = [
      { key: 'submitted_at', name: 'Application submitted' },
      { key: 'review_at', name: 'Application Review' },
      { key: 'interview_at', name: 'Interview Scheduled' },
      { key: 'cohort_match_at', name: 'Cohort Match' },
      { key: 'onboarding_at', name: 'Onboarding' },
    ];

    // Cast details as Record<string, any> to satisfy TypeScript indexing
    const detailsRecord = details as Record<string, any>;

    const stages = stagesConfig.map((stg) => {
      const timestamp = detailsRecord[stg.key];
      const completed = !!timestamp;
      return {
        name: stg.name,
        completed,
        date: timestamp ? timestamp : null,
        status: completed ? 'Completed' : 'Pending',
      };
    });

    const onboardingCompleted = !!detailsRecord.onboarding_at;
    const showOnboardingChecklistButton = !onboardingCompleted;

    return {
      stages,
      showOnboardingChecklistButton,
    };
  }

  // 1. GET APPLICANT PROFILE
  async getProfile(userId: string) {
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
        bio,
        skills,
        portfolio_link,
        resume_url,
        linkedin_link,
        cohorts (name)
      `)
      .eq('profile_id', userId)
      .single();

    if (detailsError || !details) {
      throw new NotFoundException('Applicant details not configured yet');
    }

    const cohortData = details.cohorts as any;

    return {
      name: `${profile.first_name} ${profile.last_name}`,
      email: profile.email,
      profession: details.profession || '',
      cohort: cohortData?.name || 'Unassigned',
      bio: details.bio || '',
      skills: details.skills || [],
      portfolioLink: details.portfolio_link || '',
      resumeFileUrl: details.resume_url || '',
      linkedinProfile: details.linkedin_link || '',
      editProfileUrl: '/applicant/profile/edit',
    };
  }

  // 2. UPDATE APPLICANT PROFILE
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updatePayload: any = {};
    if (dto.profession !== undefined) updatePayload.profession = dto.profession;
    if (dto.bio !== undefined) updatePayload.bio = dto.bio;
    if (dto.skills !== undefined) updatePayload.skills = dto.skills;
    if (dto.portfolioLink !== undefined) updatePayload.portfolio_link = dto.portfolioLink;
    if (dto.resumeFileUrl !== undefined) updatePayload.resume_url = dto.resumeFileUrl;
    if (dto.linkedinProfile !== undefined) updatePayload.linkedin_link = dto.linkedinProfile;

    const { error } = await this.supabase
      .from('applicant_details')
      .update(updatePayload)
      .eq('profile_id', userId);

    if (error) {
      throw new NotFoundException(error.message);
    }

    return {
      message: 'Profile updated successfully',
    };
  }

  // GET ASSIGNED PROJECTS FOR APPLICANT
  async getProjects(userId: string) {
    const { data, error } = await this.supabase
      .from('applicant_projects')
      .select(`
        status,
        profession,
        projects (
          id,
          name,
          description,
          image_url
        )
      `)
      .eq('profile_id', userId);

    if (error) {
      throw new NotFoundException('Failed to retrieve assigned projects');
    }

    const projects = data?.map((item: any) => ({
      id: item.projects?.id,
      name: item.projects?.name,
      description: item.projects?.description,
      imageUrl: item.projects?.image_url,
      profession: item.profession,
      status: item.status,
    })) || [];

    return {
      projects,
    };
  }

  // GET INDIVIDUAL PROJECT DETAILS
  async getProjectDetails(userId: string, projectId: string) {
    // 1. Fetch project core info
    const { data: project, error: projError } = await this.supabase
      .from('projects')
      .select('id, name, description, image_url')
      .eq('id', projectId)
      .single();

    if (projError || !project) {
      throw new NotFoundException('Project not found');
    }

    // 2. Fetch project deliverables
    const { data: deliverables } = await this.supabase
      .from('project_deliverables')
      .select('id, title, description, is_completed')
      .eq('project_id', projectId);

    const formattedDeliverables = deliverables?.map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      isCompleted: d.is_completed,
    })) || [];

    // 3. Fetch applicant's team ID
    const { data: applicantDetail } = await this.supabase
      .from('applicant_details')
      .select('team_id')
      .eq('profile_id', userId)
      .single();

    const teamId = applicantDetail?.team_id;

    // 4. Fetch team members assigned to the same team
    let teamMembers: any[] = [];
    if (teamId) {
      const { data: members } = await this.supabase
        .from('applicant_details')
        .select(`
          profession,
          profiles (first_name, last_name, email)
        `)
        .eq('team_id', teamId);

      teamMembers = members?.map((m: any) => ({
        firstName: m.profiles.first_name,
        lastName: m.profiles.last_name,
        profession: m.profession,
        email: m.profiles.email,
      })) || [];
    }

    // 5. Fetch mentor messages/feedback concerning this project
    let mentorFeedback: any[] = [];
    if (teamId) {
      const { data: feedback } = await this.supabase
        .from('project_mentor_feedback')
        .select(`
          id,
          message,
          created_at,
          mentors (
            profiles (first_name, last_name)
          )
        `)
        .eq('project_id', projectId)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      mentorFeedback = feedback?.map((fb: any) => ({
        id: fb.id,
        mentorName: `${fb.mentors.profiles.first_name} ${fb.mentors.profiles.last_name}`,
        message: fb.message,
        createdAt: fb.created_at,
      })) || [];
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      imageUrl: project.image_url,
      deliverables: formattedDeliverables,
      teamMembers,
      mentorFeedback,
    };
  }

  // 1. GET TEAM WORKSPACE DATA (Members & Shared Files)
  async getTeamWorkspace(userId: string) {
    // Get applicant's team ID
    const { data: detail } = await this.supabase
      .from('applicant_details')
      .select('team_id')
      .eq('profile_id', userId)
      .single();

    if (!detail || !detail.team_id) {
      throw new NotFoundException('You are not assigned to any team yet');
    }

    const teamId = detail.team_id;

    // Fetch Team Name
    const { data: team } = await this.supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    // Fetch all team members & professions
    const { data: membersData } = await this.supabase
      .from('applicant_details')
      .select(`
        profession,
        profiles (id, first_name, last_name, email)
      `)
      .eq('team_id', teamId);

    const members = membersData?.map((m: any) => ({
      firstName: m.profiles.first_name,
      lastName: m.profiles.last_name,
      email: m.profiles.email,
      profession: m.profession,
    })) || [];

    // Fetch shared team files
    const { data: filesData } = await this.supabase
      .from('team_files')
      .select(`
        id,
        file_name,
        file_url,
        file_type,
        created_at,
        profiles (first_name, last_name)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    const sharedFiles = filesData?.map((f: any) => ({
      id: f.id,
      fileName: f.file_name,
      fileUrl: f.file_url,
      fileType: f.file_type,
      uploadedBy: f.profiles ? `${f.profiles.first_name} ${f.profiles.last_name}` : 'Unknown',
      createdAt: f.created_at,
    })) || [];

    return {
      teamId,
      teamName: team?.name || 'Assigned Team',
      members,
      sharedFiles,
    };
  }

  // 2. UPLOAD/SHARE FILE TO TEAM WORKSPACE
  async uploadTeamFile(userId: string, dto: UploadTeamFileDto) {
    const { data: detail } = await this.supabase
      .from('applicant_details')
      .select('team_id')
      .eq('profile_id', userId)
      .single();

    if (!detail || !detail.team_id) {
      throw new NotFoundException('You are not assigned to a team');
    }

    const { error } = await this.supabase.from('team_files').insert({
      team_id: detail.team_id,
      uploader_id: userId,
      file_name: dto.fileName,
      file_url: dto.fileUrl,
      file_type: dto.fileType,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'File shared successfully with team workspace',
    };
  }
}