import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UpdateProfileDto } from './dto/update-profile.dto.js'
import { UploadTeamFileDto } from './dto/team-workspace-response.dto.js';
import { MakePaymentDto } from './dto/payment.dto.js';
import axios from 'axios';
import { UpdateSettingsDto } from './dto/settings.dto.js';
import { UpdateEditProfileDto } from './dto/edit-profile.dto.js';
import { EmailService } from '../email/email.service.js';
import { ConfirmScheduleSessionDto } from './dto/schedule-session.dto.js';


@Injectable()
@Injectable()
export class ApplicantService {
  private supabase: SupabaseClient;

  constructor(private readonly emailService: EmailService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || '',
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

    return { message: 'Profile updated successfully' };
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

    return { projects };
  }

  async getProjectDetails(userId: string, projectId: string) {
    const { data: project, error: projError } = await this.supabase
      .from('projects')
      .select('id, name, description, image_url')
      .eq('id', projectId)
      .single();

    if (projError || !project) {
      throw new NotFoundException('Project not found');
    }

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

    const { data: applicantDetail } = await this.supabase
      .from('applicant_details')
      .select('team_id')
      .eq('profile_id', userId)
      .single();

    const teamId = applicantDetail?.team_id;

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
    const { data: detail } = await this.supabase
      .from('applicant_details')
      .select('team_id')
      .eq('profile_id', userId)
      .single();

    if (!detail || !detail.team_id) {
      throw new NotFoundException('You are not assigned to any team yet');
    }

    const teamId = detail.team_id;

    const { data: team } = await this.supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

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

    return { message: 'File shared successfully with team workspace' };
  }


  // GET MENTORSHIP PAGE DATA
  async getMentorshipData(userId: string) {
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new NotFoundException('User profile not found');
    }

    const { data: details, error: detailsError } = await this.supabase
      .from('applicant_details')
      .select('profession')
      .eq('profile_id', userId)
      .single();

    if (detailsError || !details) {
      throw new NotFoundException('Applicant details not configured yet');
    }

    const { data: sessions } = await this.supabase
      .from('mentor_sessions')
      .select('id, session_title, session_date, status, meeting_link')
      .eq('profile_id', userId)
      .order('session_date', { ascending: false });

    const sessionHistory = sessions?.map((s: any) => ({
      id: s.id,
      sessionTitle: s.session_title,
      sessionTimeAndDate: s.session_date,
      status: s.status,
      meetingLink: s.meeting_link,
    })) || [];

    const { data: notes } = await this.supabase
      .from('mentor_notes')
      .select(`
        id,
        note,
        created_at,
        mentors (
          profiles (first_name, last_name)
        )
      `)
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });

    const mentorNotes = notes?.map((n: any) => ({
      id: n.id,
      mentorName: n.mentors?.profiles ? `${n.mentors.profiles.first_name} ${n.mentors.profiles.last_name}` : 'Assigned Mentor',
      note: n.note,
      createdAt: n.created_at,
    })) || [];

    return {
      applicant: {
        name: `${profile.first_name} ${profile.last_name}`,
        profilePic: profile.avatar_url || null,
        profession: details.profession,
        scheduleSessionActionUrl: '/applicant/mentorship/schedule',
      },
      sessionHistory,
      mentorNotes,
    };
  }

  async getPaymentData(userId: string) {
    const { data: applicantDetail } = await this.supabase
      .from('applicant_details')
      .select('cohort_id, cohorts (id, name, fee_amount)')
      .eq('profile_id', userId)
      .single();

    const currentCohort = applicantDetail?.cohorts as any;
    const currentCohortFee = currentCohort?.fee_amount || 45000.00;

    let { data: balanceRecord } = await this.supabase
      .from('applicant_balances')
      .select('*')
      .eq('profile_id', userId)
      .single();

    if (!balanceRecord) {
      const { data: newBalance } = await this.supabase
        .from('applicant_balances')
        .insert({
          profile_id: userId,
          cohort_id: currentCohort?.id || null,
          total_due: currentCohortFee,
          amount_paid: 0.00,
          outstanding_balance: currentCohortFee,
        })
        .select()
        .single();
      balanceRecord = newBalance;
    } else {
      if (currentCohort && balanceRecord.cohort_id !== currentCohort.id && balanceRecord.outstanding_balance > 0) {
        const carriedOverDebt = balanceRecord.outstanding_balance;
        const newTotalDue = Number(currentCohortFee) + Number(carriedOverDebt);
        const newOutstanding = newTotalDue - Number(balanceRecord.amount_paid);

        const { data: updatedBalance } = await this.supabase
          .from('applicant_balances')
          .update({
            cohort_id: currentCohort.id,
            total_due: newTotalDue,
            outstanding_balance: Math.max(0, newOutstanding),
          })
          .eq('profile_id', userId)
          .select()
          .single();
        balanceRecord = updatedBalance;
      } else if (currentCohort && !balanceRecord.cohort_id) {
        await this.supabase
          .from('applicant_balances')
          .update({ cohort_id: currentCohort.id, total_due: currentCohortFee, outstanding_balance: currentCohortFee - balanceRecord.amount_paid })
          .eq('profile_id', userId);
        balanceRecord.outstanding_balance = currentCohortFee - balanceRecord.amount_paid;
      }
    }

    const { data: payments } = await this.supabase
      .from('payments')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });

    const paymentHistory = payments?.map((p: any) => ({
      id: p.id,
      paymentTitle: p.payment_title,
      amountPaid: p.amount_paid,
      status: p.status,
      paymentMethod: p.payment_method,
      receiptDownloadUrl: p.receipt_url || `/applicant/payments/${p.id}/receipt`,
      createdAt: p.created_at,
    })) || [];

    return {
      outstandingBalance: Number(balanceRecord?.outstanding_balance || currentCohortFee),
      currentCohortFee: Number(currentCohortFee),
      makePaymentButtonLabel: 'Make Payment',
      availablePaymentMethods: ['Paystack', 'Stripe', 'Paypal', 'Debit Card'],
      paymentHistory,
    };
  }

  async processPayment(userId: string, dto: MakePaymentDto) {
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new BadRequestException('Applicant profile not found');
    }

    const { data: balanceRecord } = await this.supabase
      .from('applicant_balances')
      .select('*')
      .eq('profile_id', userId)
      .single();

    if (!balanceRecord) {
      throw new BadRequestException('Applicant balance account not found');
    }

    if (dto.amount > balanceRecord.outstanding_balance) {
      throw new BadRequestException(`Payment amount cannot exceed outstanding balance of ₦${balanceRecord.outstanding_balance}`);
    }

    let paymentStatus = 'Successful';
    let transactionReference = `PNA-${Date.now()}`;

    const { data: paymentRecord, error: payError } = await this.supabase
      .from('payments')
      .insert({
        profile_id: userId,
        payment_title: 'Cohort Tuition Part-Payment / Full Payment',
        amount_paid: dto.amount,
        payment_method: dto.paymentMethod,
        status: paymentStatus,
        reference: transactionReference,
        receipt_url: `https://api.pnafrica.org/applicant/payments/receipt/${transactionReference}.pdf`,
      })
      .select()
      .single();

    if (payError) {
      throw new BadRequestException(payError.message);
    }

    if (paymentStatus === 'Successful') {
      const newAmountPaid = Number(balanceRecord.amount_paid) + Number(dto.amount);
      const newOutstanding = Number(balanceRecord.total_due) - newAmountPaid;

      await this.supabase
        .from('applicant_balances')
        .update({
          amount_paid: newAmountPaid,
          outstanding_balance: Math.max(0, newOutstanding),
        })
        .eq('profile_id', userId);
    }

    return {
      message: paymentStatus === 'Successful' ? `Successfully paid ₦${dto.amount} with ${dto.paymentMethod}` : 'Payment initialization failed',
      status: paymentStatus,
      amountPaid: dto.amount,
      paymentMethod: dto.paymentMethod,
      reference: transactionReference,
      receiptDownloadUrl: paymentRecord.receipt_url,
    };
  }

  // 1. GET LEARNING RESOURCES (With optional search bar filtering)
  async getLearningResources(searchQuery?: string) {
    let query = this.supabase
      .from('learning_resources')
      .select('id, title, description, file_type, file_url, pages_count, duration_mins, created_at')
      .order('created_at', { ascending: false });

    if (searchQuery && searchQuery.trim() !== '') {
      query = query.ilike('title', `%${searchQuery.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new NotFoundException('Failed to retrieve learning resources');
    }

    const resources = data?.map((res: any) => ({
      id: res.id,
      title: res.title,
      description: res.description,
      fileType: res.file_type,
      fileUrl: res.file_url,
      pagesCount: res.pages_count,
      durationMins: res.duration_mins,
      createdAt: res.created_at,
    })) || [];

    return { resources };
  }

  async getNotifications(userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('id, title, message, type, is_read, created_at')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotFoundException('Failed to retrieve notifications');
    }

    const notifications = data?.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      createdAt: n.created_at,
    })) || [];

    return { notifications };
  }

  async getSettings(userId: string) {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    let { data: settings } = await this.supabase
      .from('applicant_settings')
      .select('*')
      .eq('profile_id', userId)
      .single();

    if (!settings) {
      const { data: newSettings } = await this.supabase
        .from('applicant_settings')
        .insert({ profile_id: userId })
        .select()
        .single();
      settings = newSettings;
    }

    return {
      fullName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      email: profile?.email || '',
      notificationPreferences: {
        emailMentorsFeedback: settings.email_mentors_feedback,
        emailDeadlines: settings.email_deadlines,
        smsSessionReminder: settings.sms_session_reminder,
      },
      privacyAndData: {
        showProfileToEmployers: settings.show_profile_to_employers,
        allowAnalyticsCookies: settings.allow_analytics_cookies,
      },
    };
  }

  // 2. UPDATE SETTINGS
  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const profileUpdate: any = {};
    if (dto.firstName) profileUpdate.first_name = dto.firstName;
    if (dto.lastName) profileUpdate.last_name = dto.lastName;
    if (dto.email) profileUpdate.email = dto.email;

    if (Object.keys(profileUpdate).length > 0) {
      await this.supabase.from('profiles').update(profileUpdate).eq('id', userId);
    }

    const settingsUpdate: any = {};
    if (dto.emailMentorsFeedback !== undefined) settingsUpdate.email_mentors_feedback = dto.emailMentorsFeedback;
    if (dto.emailDeadlines !== undefined) settingsUpdate.email_deadlines = dto.emailDeadlines;
    if (dto.smsSessionReminder !== undefined) settingsUpdate.sms_session_reminder = dto.smsSessionReminder;
    if (dto.showProfileToEmployers !== undefined) settingsUpdate.show_profile_to_employers = dto.showProfileToEmployers;
    if (dto.allowAnalyticsCookies !== undefined) settingsUpdate.allow_analytics_cookies = dto.allowAnalyticsCookies;

    if (Object.keys(settingsUpdate).length > 0) {
      await this.supabase.from('applicant_settings').update(settingsUpdate).eq('profile_id', userId);
    }

    return { message: 'Settings updated successfully' };
  }

  async downloadMyData(userId: string) {
    const { data: profile } = await this.supabase.from('profiles').select('*').eq('id', userId).single();
    const { data: details } = await this.supabase.from('applicant_details').select('*').eq('profile_id', userId).single();
    const { data: payments } = await this.supabase.from('payments').select('*').eq('profile_id', userId);

    return {
      message: 'User data compiled successfully for download',
      exportData: { profile, details, payments, exportedAt: new Date().toISOString() },
    };
  }

  async requestDataDeletion(userId: string) {
    const { data: profile } = await this.supabase.from('profiles').select('email, first_name').eq('id', userId).single();
    
    if (profile) {
      await this.emailService.sendDataDeletionNotification(profile.email, profile.first_name);
    }

    return { message: 'Data deletion request submitted successfully. Check your email for confirmation.' };
  }

  getPrivacyPolicy() {
    return {
      policyTitle: 'PN Africa Privacy Policy',
      lastUpdated: '2026-01-01',
      summary: 'PN Africa respects your privacy and is committed to protecting your personal data in accordance with global data protection regulations.',
      fullTextUrl: 'https://pnafrica.org/privacy-policy',
    };
  }

  // 4. GET EDIT PROFILE VIEW DATA
  async getEditProfileData(userId: string) {
    const { data: profile } = await this.supabase.from('profiles').select('first_name, last_name, email').eq('id', userId).single();
    const { data: details } = await this.supabase
      .from('applicant_details')
      .select('profession, bio, skills, portfolio_link, linkedin_link, phone_number, location, cohorts (name)')
      .eq('profile_id', userId)
      .single();

    const cohortData = details?.cohorts as any;

    return {
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      phoneNumber: details?.phone_number || '',
      location: details?.location || '',
      portfolioUrl: details?.portfolio_link || '',
      linkedinUrl: details?.linkedin_link || '',
      bio: details?.bio || '',
      skills: details?.skills || [],
      email: profile?.email || '',
      profession: details?.profession || '',
      cohortName: cohortData?.name || 'Unassigned',
    };
  }

  async updateEditProfileData(userId: string, dto: UpdateEditProfileDto) {
    const profileUpdate: any = {};
    if (dto.firstName) profileUpdate.first_name = dto.firstName;
    if (dto.lastName) profileUpdate.last_name = dto.lastName;

    if (Object.keys(profileUpdate).length > 0) {
      await this.supabase.from('profiles').update(profileUpdate).eq('id', userId);
    }

    const detailsUpdate: any = {};
    if (dto.phoneNumber !== undefined) detailsUpdate.phone_number = dto.phoneNumber;
    if (dto.location !== undefined) detailsUpdate.location = dto.location;
    if (dto.portfolioUrl !== undefined) detailsUpdate.portfolio_link = dto.portfolioUrl;
    if (dto.linkedinUrl !== undefined) detailsUpdate.linkedin_link = dto.linkedinUrl;
    if (dto.bio !== undefined) detailsUpdate.bio = dto.bio;
    if (dto.skills !== undefined) detailsUpdate.skills = dto.skills;

    if (Object.keys(detailsUpdate).length > 0) {
      await this.supabase.from('applicant_details').update(detailsUpdate).eq('profile_id', userId);
    }

    return { message: 'Profile updated successfully' };
  }

  async getOnboardingChecklist(userId: string) {
    let { data: steps } = await this.supabase
      .from('onboarding_checklist')
      .select('*')
      .eq('profile_id', userId)
      .order('step_order', { ascending: true });

    if (!steps || steps.length === 0) {
      const defaultSteps = [
        { profile_id: userId, step_title: 'Complete Applicant Profile', step_description: 'Add bio, skills, and portfolio URL', step_order: 1, is_completed: true, completed_at: new Date().toISOString() },
        { profile_id: userId, step_title: 'Submit KYC & Identity Verification', step_description: 'Upload ID document', step_order: 2, is_completed: true, completed_at: new Date().toISOString() },
        { profile_id: userId, step_title: 'Join Team Slack/Discord Channel', step_description: 'Connect with team workspace', step_order: 3, is_completed: true, completed_at: new Date().toISOString() },
        { profile_id: userId, step_title: 'Schedule First Mentorship Session', step_description: 'Pick a session slot with your mentor', step_order: 4, is_completed: false, completed_at: null },
        { profile_id: userId, step_title: 'Review Cohort Code of Conduct', step_description: 'Accept bootcamp terms & guidelines', step_order: 5, is_completed: false, completed_at: null },
      ];

      const { data: insertedSteps } = await this.supabase
        .from('onboarding_checklist')
        .insert(defaultSteps)
        .select();

      steps = insertedSteps || [];
    }

    const totalStepsCount = steps.length;
    const completedStepsCount = steps.filter((s) => s.is_completed).length;
    const progressPercentage = Math.round((completedStepsCount / totalStepsCount) * 100);

    const formattedSteps = steps.map((s) => ({
      id: s.id,
      stepTitle: s.step_title,
      stepDescription: s.step_description,
      stepOrder: s.step_order,
      isCompleted: s.is_completed,
      status: s.is_completed ? 'Completed' : 'Pending',
      completedAt: s.completed_at ? new Date(s.completed_at).toLocaleString() : null,
    }));

    return {
      completedStepsCount,
      totalStepsCount,
      progressIndicatorLabel: `${completedStepsCount} of ${totalStepsCount} steps completed`,
      progressPercentage,
      steps: formattedSteps,
    };
  }


  // 2. GET SCHEDULE A SESSION PAGE DATA
  async getScheduleSessionPage(userId: string) {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', userId)
      .single();

    const { data: details } = await this.supabase
      .from('applicant_details')
      .select('profession, mentor_id, mentors (id, profiles (first_name, last_name))')
      .eq('profile_id', userId)
      .single();

    const mentorId = details?.mentor_id;
    const mentorData = details?.mentors as any;

    let availableSlots: any[] = [];
    if (mentorId) {
      const { data: slots } = await this.supabase
        .from('mentor_availability')
        .select('*')
        .eq('mentor_id', mentorId)
        .eq('is_booked', false)
        .order('available_date', { ascending: true });

      availableSlots = slots?.map((s) => {
        const dateObj = new Date(`${s.available_date}T${s.start_time}`);
        const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeStr = s.start_time.slice(0, 5);
        return {
          slotId: s.id,
          availableDate: s.available_date,
          startTime: s.start_time,
          endTime: s.end_time,
          timezone: s.timezone || 'WAT',
          displayLabel: `${dayStr} ${timeStr} ${s.timezone || 'WAT'}`,
          isSelected: false,
        };
      }) || [];
    }

    return {
      profilePic: profile?.avatar_url || null,
      fullName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
      registeredProfession: details?.profession || '',
      mentorName: mentorData?.profiles ? `${mentorData.profiles.first_name} ${mentorData.profiles.last_name}` : 'Assigned Mentor',
      availableSlots,
    };
  }

  async confirmScheduleSession(userId: string, dto: ConfirmScheduleSessionDto) {
    const { data: slot, error: slotErr } = await this.supabase
      .from('mentor_availability')
      .select('*, mentors (id, profile_id, profiles (first_name, last_name, email))')
      .eq('id', dto.slotId)
      .single();

    if (slotErr || !slot || slot.is_booked) {
      throw new BadRequestException('Selected time slot is invalid or already booked');
    }

    const { data: applicantProfile } = await this.supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

      if (!applicantProfile) {
      throw new BadRequestException('Applicant profile not found');
    }

    const mentorProfile = slot.mentors.profiles;

    const sessionDateObj = new Date(`${slot.available_date}T${slot.start_time}`);
    const formattedDateString = `${sessionDateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })} at ${slot.start_time.slice(0, 5)} ${slot.timezone || 'WAT'}`;

    const googleMeetLink = `https://meet.google.com/pna-${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 5)}`;

    const { data: sessionRecord } = await this.supabase
      .from('mentor_sessions')
      .insert({
        mentor_id: slot.mentor_id,
        profile_id: userId,
        session_title: dto.sessionTitle,
        session_date: sessionDateObj.toISOString(),
        status: 'Scheduled',
        meeting_link: googleMeetLink,
      })
      .select()
      .single();

    await this.supabase.from('mentor_availability').update({ is_booked: true }).eq('id', dto.slotId);

    const notificationMessage = `Mentorship Session scheduled: ${dto.sessionTitle} on ${formattedDateString}. Google Meet Link: ${googleMeetLink}`;

    await this.supabase.from('notifications').insert([
      { profile_id: userId, title: 'Session Confirmed', message: notificationMessage, type: 'mentor' },
      { profile_id: mentorProfile.id || slot.mentors.profile_id, title: 'New Mentorship Session Booked', message: `Applicant ${applicantProfile.first_name} ${applicantProfile.last_name} booked a session: ${dto.sessionTitle} on ${formattedDateString}.`, type: 'mentor' },
    ]);

    await this.emailService.applicantSessionSchedule(
      applicantProfile.email,
      applicantProfile.first_name,
      `${mentorProfile.first_name} ${mentorProfile.last_name}`,
      dto.sessionTitle,
      formattedDateString,
      googleMeetLink,
    );

    await this.emailService.mentorSessionSchedule(
      mentorProfile.email,
      mentorProfile.first_name,
      `${applicantProfile.first_name} ${applicantProfile.last_name}`,
      dto.sessionTitle,
      formattedDateString,
      googleMeetLink,
    );

    return {
      message: `Session confirmed for ${formattedDateString}`,
      confirmButtonText: `Confirm Session - ${formattedDateString}`,
      googleMeetLink,
      sessionDetails: {
        id: sessionRecord.id,
        sessionTitle: dto.sessionTitle,
        dateTime: formattedDateString,
        applicantName: `${applicantProfile.first_name} ${applicantProfile.last_name}`,
        mentorName: `${mentorProfile.first_name} ${mentorProfile.last_name}`,
      },
    };
  }
}