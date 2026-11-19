import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../email/email.service.js';
import {
  PersonalInfoStageDto,
  ProgramSelectionStageDto,
  ExperiencePortfolioStageDto,
  ReviewAndPaymentStageDto,
  AdmissionReviewDto,
} from './dto/application.dto.js';

@Injectable()
export class ApplicationService {
  private supabase: SupabaseClient;

  constructor(private readonly emailService: EmailService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  // 1. STAGE 1: PERSONAL INFORMATION (Save & Exit or Continue)
  async savePersonalInfo(dto: PersonalInfoStageDto, applicationId?: string) {
    if (applicationId) {
      const { data, error } = await this.supabase
        .from('applications')
        .update({
          ...dto,
          current_stage: 1,
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);
      return { message: 'Personal information saved', application: data };
    } else {
      // Create new application draft
      if (!dto.email || !dto.firstName || !dto.lastName) {
        throw new BadRequestException('First Name, Last Name, and Email are required');
      }

      const { data, error } = await this.supabase
        .from('applications')
        .insert({
          first_name: dto.firstName,
          last_name: dto.lastName,
          email: dto.email,
          phone_number: dto.phoneNumber || '',
          country: dto.country || '',
          current_stage: 1,
          application_status: 'Draft',
        })
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);
      return { message: 'Application draft created', application: data };
    }
  }

  // 2. STAGE 2: ROLE & PROGRAM SELECTION
  async saveProgramSelection(applicationId: string, dto: ProgramSelectionStageDto) {
    const { data, error } = await this.supabase
      .from('applications')
      .update({
        track: dto.track,
        cohort_name: dto.cohortName,
        cohort_id: dto.cohortId || null,
        current_stage: 2,
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Program selection saved', application: data };
  }

  // 3. STAGE 3: EXPERIENCE & PORTFOLIO
  async saveExperiencePortfolio(applicationId: string, dto: ExperiencePortfolioStageDto) {
    const { data, error } = await this.supabase
      .from('applications')
      .update({
        experience_level: dto.experienceLevel,
        portfolio_link: dto.portfolioLink,
        linkedin_link: dto.linkedinLink,
        resume_url: dto.resumeUrl,
        why_join: dto.whyJoin,
        current_stage: 3,
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Experience & Portfolio saved', application: data };
  }

  // 4. STAGE 4: REVIEW & PAYMENT (Pay & Submit Application)
  async payAndSubmitApplication(applicationId: string, dto: ReviewAndPaymentStageDto) {
    const { data: app, error: fetchError } = await this.supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !app) {
      throw new NotFoundException('Application not found');
    }

    // Generate unique reference code e.g. #PNA-2026-08341
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const referenceCode = `#PNA-${new Date().getFullYear()}-${randomNum}`;

    const { data: updatedApp, error } = await this.supabase
      .from('applications')
      .update({
        payment_method: dto.paymentMethod,
        payment_status: 'Successful',
        reference_code: referenceCode,
        application_status: 'Submitted',
        current_stage: 4,
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Send emails to applicant and PN-Africa review teams
    await this.emailService.sendApplicationSubmissionEmails(
      app.email,
      `${app.first_name} ${app.last_name}`,
      referenceCode,
      app.cohort_name || 'Active Cohort',
      app.track || 'General Track',
    );

    return {
      message: 'Application Submitted Successfully!',
      popupDetails: {
        statusMessage: 'Application Submitted!',
        cohortAppliedFor: app.cohort_name,
        track: app.track,
        referenceCode,
      },
    };
  }

  // 5. ADMISSION REVIEW & ACCEPTANCE GATING (Admissions Team Action)
  async reviewAdmission(dto: AdmissionReviewDto) {
    const { data: app, error: fetchError } = await this.supabase
      .from('applications')
      .select('*')
      .eq('id', dto.applicantId)
      .single();

    if (fetchError || !app) {
      throw new NotFoundException('Application not found');
    }

    const newStatus = dto.status === 'Accepted' ? 'Accepted' : 'Rejected';

    await this.supabase
      .from('applications')
      .update({ application_status: newStatus })
      .eq('id', dto.applicantId);

    if (newStatus === 'Accepted') {
      const frontendUrl = process.env.FRONTEND_URL || 'https://pnafrica.com';
      const registrationLink = `${frontendUrl}/register?email=${encodeURIComponent(app.email)}&ref=${encodeURIComponent(app.reference_code || '')}`;

      await this.emailService.sendAdmissionAcceptanceEmail(
        app.email,
        `${app.first_name} ${app.last_name}`,
        registrationLink,
      );
    }

    return { message: `Application status updated to ${newStatus}` };
  }
}