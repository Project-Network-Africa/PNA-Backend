import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { EmailService } from '../email/email.service.js';
import {
  PersonalInfoStageDto,
  ProgramSelectionStageDto,
  ExperiencePortfolioStageDto,
  InitializePaymentDto,
  VerifyPaymentDto,
  PaymentMethodEnum,
  AdmissionReviewDto,
} from './dto/application.dto.js';

export interface UploadedResumeFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class ApplicationService {
  private supabase: SupabaseClient;

  constructor(private readonly emailService: EmailService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }


  // ==========================================
  // STAGE 1: PERSONAL INFORMATION
  // ==========================================
  async savePersonalInfo(dto: PersonalInfoStageDto, applicationId?: string) {
    if (applicationId) {
      const { data, error } = await this.supabase
        .from('applications')
        .update({
          first_name: dto.firstName,
          last_name: dto.lastName,
          email: dto.email,
          phone_number: dto.phoneNumber,
          country: dto.country,
          current_stage: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);
      return { message: 'Personal information saved', application: data };
    }

    if (!dto.email || !dto.firstName || !dto.lastName) {
      throw new BadRequestException('First Name, Last Name, and Email are required');
    }

    const { data, error } = await this.supabase
      .from('applications')
      .upsert(
        {
          first_name: dto.firstName,
          last_name: dto.lastName,
          email: dto.email,
          phone_number: dto.phoneNumber || '',
          country: dto.country || '',
          current_stage: 1,
          application_status: 'Draft',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' },
      )
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Application draft saved', application: data };
  }

  // ==========================================
  // STAGE 2: ROLE / TRACK & COHORT SELECTION (No payment here)
  // ==========================================
  async getStage2Options() {
    const [{ data: tracks, error: tracksError }, { data: cohorts, error: cohortsError }] =
      await Promise.all([
        this.supabase
          .from('tracks')
          .select('id, code, label')
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        this.supabase
          .from('cohorts')
          .select('id, name, start_date, end_date, fee_amount')
          .in('name', ['Cohort 3 - September 2026', 'Cohort 4 - March, 2027'])
          .order('start_date', { ascending: true }),
      ]);

    if (tracksError) throw new BadRequestException(tracksError.message);
    if (cohortsError) throw new BadRequestException(cohortsError.message);

    return {
      tracks: tracks || [],
      cohorts: cohorts || [],
    };
  }

  async saveProgramSelection(applicationId: string, dto: ProgramSelectionStageDto) {
    let resolvedCohortId = dto.cohortId || null;

    if (!resolvedCohortId && dto.cohortName) {
      const { data: cohort } = await this.supabase
        .from('cohorts')
        .select('id')
        .eq('name', dto.cohortName)
        .single();
      resolvedCohortId = cohort?.id || null;
    }

    const { data, error } = await this.supabase
      .from('applications')
      .update({
        track: dto.track,
        cohort_name: dto.cohortName,
        cohort_id: resolvedCohortId,
        current_stage: 2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Program selection saved', application: data };
  }

  // ==========================================
  // STAGE 3: EXPERIENCE & PORTFOLIO (Multipart File Upload)
  // ==========================================
  async saveExperiencePortfolio(
    applicationId: string,
    dto: ExperiencePortfolioStageDto,
    resumeFile?: UploadedResumeFile,
  ) {
    const { data: existingApp, error: fetchError } = await this.supabase
      .from('applications')
      .select('id, resume_url')
      .eq('id', applicationId)
      .single();

    if (fetchError || !existingApp) {
      throw new NotFoundException('Application not found');
    }

    let resumeUrl = existingApp.resume_url;

    // Upload actual CV file to Supabase Storage if provided
    if (resumeFile) {
      const sanitizedFileName = resumeFile.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${applicationId}/${Date.now()}_${sanitizedFileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from('resumes')
        .upload(filePath, resumeFile.buffer, {
          contentType: resumeFile.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new BadRequestException(`Resume upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = this.supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      resumeUrl = publicUrlData.publicUrl;
    } else if (!resumeUrl) {
      throw new BadRequestException('Resume/CV file is required');
    }

    const { data, error } = await this.supabase
      .from('applications')
      .update({
        experience_level: dto.experienceLevel,
        portfolio_link: dto.portfolioLink || null,
        linkedin_link: dto.linkedinLink || null,
        resume_url: resumeUrl,
        why_join: dto.whyJoin,
        current_stage: 3,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Experience & Portfolio saved', application: data };
  }

  // ==========================================
  // STAGE 4: REVIEW SUMMARY & PAYMENT (Paystack & Nestuge)
  // ==========================================
  async getStage4ReviewSummary(applicationId: string) {
    const { data: app, error } = await this.supabase
      .from('applications')
      .select('*, cohorts(id, name, fee_amount)')
      .eq('id', applicationId)
      .single();

    if (error || !app) {
      throw new NotFoundException('Application not found');
    }

    const feeAmount = Number((app.cohorts as any)?.fee_amount || 45000);

    return {
      application: app,
      feeAmount,
      currency: 'NGN',
      paymentMethods: [
        {
          id: PaymentMethodEnum.PAYSTACK,
          name: 'Paystack',
          publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        },
        {
          id: PaymentMethodEnum.NESTUGE,
          name: 'Nestuge',
        },
      ],
    };
  }

  // Step 4A: Initialize Checkout Session (Paystack or Nestuge)
  async initializeStage4Payment(applicationId: string, dto: InitializePaymentDto) {
    const { data: app, error } = await this.supabase
      .from('applications')
      .select('*, cohorts(id, name, fee_amount)')
      .eq('id', applicationId)
      .single();

    if (error || !app) {
      throw new NotFoundException('Application not found');
    }

    if (app.payment_status === 'Successful') {
      throw new BadRequestException('Application payment has already been completed');
    }

    const feeAmount = Number((app.cohorts as any)?.fee_amount || 45000);
    const frontendUrl = process.env.FRONTEND_URL || 'https://pnafrica.com';
    const callbackUrl = dto.callbackUrl || `${frontendUrl}/apply/payment-callback?applicationId=${applicationId}`;
    const txRef = `PNA_${dto.paymentMethod.toUpperCase()}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Save selected payment method & reference
    await this.supabase
      .from('applications')
      .update({
        payment_method: dto.paymentMethod,
        payment_transaction_ref: txRef,
        current_stage: 4,
      })
      .eq('id', applicationId);

    // 1. PAYSTACK INITIALIZATION
    if (dto.paymentMethod === PaymentMethodEnum.PAYSTACK) {
      try {
        const paystackRes = await axios.post(
          'https://api.paystack.co/transaction/initialize',
          {
            email: app.email,
            amount: Math.round(feeAmount * 100), // Paystack expects amount in kobo
            reference: txRef,
            callback_url: callbackUrl,
            metadata: {
              applicationId: app.id,
              applicantName: `${app.first_name} ${app.last_name}`,
              track: app.track,
              cohort: app.cohort_name,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
          },
        );

        return {
          provider: 'Paystack',
          authorizationUrl: paystackRes.data.data.authorization_url,
          accessCode: paystackRes.data.data.access_code,
          reference: paystackRes.data.data.reference,
          publicKey: process.env.PAYSTACK_PUBLIC_KEY,
          amount: feeAmount,
        };
      } catch (err: any) {
        throw new BadRequestException(
          `Paystack initialization failed: ${err.response?.data?.message || err.message}`,
        );
      }
    }

    // 2. NESTUGE INITIALIZATION
    if (dto.paymentMethod === PaymentMethodEnum.NESTUGE) {
      const baseNestugeUrl = process.env.NESTUGE_CHECKOUT_URL || 'https://nestuge.com/pay/pnafrica';
      const separator = baseNestugeUrl.includes('?') ? '&' : '?';
      const checkoutUrl =
        `${baseNestugeUrl}${separator}` +
        `reference=${encodeURIComponent(txRef)}` +
        `&email=${encodeURIComponent(app.email)}` +
        `&name=${encodeURIComponent(`${app.first_name} ${app.last_name}`)}` +
        `&amount=${feeAmount}` +
        `&redirect_url=${encodeURIComponent(callbackUrl)}`;

      return {
        provider: 'Nestuge',
        authorizationUrl: checkoutUrl,
        reference: txRef,
        amount: feeAmount,
      };
    }

    throw new BadRequestException('Unsupported payment method');
  }

  // Step 4B: Verify Payment & Finalize Application Submission
  async verifyAndSubmitApplication(applicationId: string, dto: VerifyPaymentDto) {
    const { data: app, error: fetchError } = await this.supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !app) {
      throw new NotFoundException('Application not found');
    }

    // Return existing reference code if already finalized (idempotent)
    if (app.payment_status === 'Successful' && app.reference_code) {
      return {
        message: 'Application Submitted Successfully!',
        popupDetails: {
          statusMessage: 'Application Submitted!',
          cohortAppliedFor: app.cohort_name,
          track: app.track,
          referenceCode: app.reference_code,
        },
      };
    }

    // Verify Paystack payment directly against Paystack API
    if (dto.paymentMethod === PaymentMethodEnum.PAYSTACK) {
      try {
        const verifyRes = await axios.get(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(dto.transactionReference)}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
          },
        );

        if (verifyRes.data?.data?.status !== 'success') {
          throw new BadRequestException('Paystack payment has not been completed');
        }
      } catch (err: any) {
        throw new BadRequestException(
          `Paystack verification failed: ${err.response?.data?.message || err.message}`,
        );
      }
    }

    // Verify Nestuge payment reference
    if (dto.paymentMethod === PaymentMethodEnum.NESTUGE) {
      if (!dto.transactionReference) {
        throw new BadRequestException('Nestuge transaction reference is required');
      }
    }

    // Generate unique application reference code e.g. #PNA-2026-08341
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const referenceCode = `#PNA-${new Date().getFullYear()}-${randomNum}`;

    const { error } = await this.supabase
      .from('applications')
      .update({
        payment_method: dto.paymentMethod,
        payment_status: 'Successful',
        payment_transaction_ref: dto.transactionReference,
        reference_code: referenceCode,
        application_status: 'Submitted',
        current_stage: 4,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (error) throw new BadRequestException(error.message);

    // Send confirmation email to applicant + full details email to PN-Africa review team
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

  // ==========================================
  // ADMISSION REVIEW & ACCEPTANCE GATING
  // ==========================================
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