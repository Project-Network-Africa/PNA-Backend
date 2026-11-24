import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
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
  // PRICING & APPLICATION WINDOW HELPERS
  // ==========================================
  private parsePriceEnv(raw: string | undefined, fallback: number): number {
    if (!raw) return fallback;
    const cleaned = Number(String(raw).replace(/,/g, '').trim());
    return Number.isFinite(cleaned) && cleaned > 0 ? cleaned : fallback;
  }

  private getApplicationWindowAndPricing(now = new Date()) {
    const currency = (process.env.PAYMENT_CURRENCY || 'NGN').trim();
    const earlyBirdPrice = this.parsePriceEnv(process.env.EARLY_BIRD_PRICE, 100000);
    const normalPrice = this.parsePriceEnv(process.env.NORMAL_PRICE, 150000);

    const startStr = process.env.APPLICATION_START_DATE || '2026-11-19';
    const endStr = process.env.APPLICATION_END_DATE || '2027-01-03';
    const earlyBirdDeadlineStr = process.env.EARLY_BIRD_DEADLINE || '2026-12-03';

    const startDate = new Date(`${startStr}T00:00:00.000Z`);
    const endDate = new Date(`${endStr}T23:59:59.999Z`);
    const earlyBirdDeadline = new Date(`${earlyBirdDeadlineStr}T23:59:59.999Z`);

    const hasStarted = now >= startDate;
    const hasEnded = now > endDate;
    const isOpen = hasStarted && !hasEnded;
    const isEarlyBird = now <= earlyBirdDeadline;
    const currentPrice = isEarlyBird ? earlyBirdPrice : normalPrice;

    return {
      isOpen,
      hasStarted,
      hasEnded,
      isEarlyBird,
      currency,
      currentPrice,
      earlyBirdPrice,
      normalPrice,
      applicationStartDate: startStr,
      applicationEndDate: endStr,
      earlyBirdDeadline: earlyBirdDeadlineStr,
    };
  }

  private assertApplicationIsOpen() {
    const windowInfo = this.getApplicationWindowAndPricing();
    if (!windowInfo.hasStarted) {
      throw new ForbiddenException(
        `Applications open on ${windowInfo.applicationStartDate}. Please check back when the application window opens.`,
      );
    }
    if (windowInfo.hasEnded) {
      throw new ForbiddenException(
        `Applications closed on ${windowInfo.applicationEndDate}. Payments and new applications are no longer accepted.`,
      );
    }
    return windowInfo;
  }

  getApplicationConfigStatus() {
    return this.getApplicationWindowAndPricing();
  }

  // ==========================================
  // STAGE 1: PERSONAL INFORMATION
  // ==========================================
  async savePersonalInfo(dto: PersonalInfoStageDto, applicationId?: string) {
    this.assertApplicationIsOpen();

    if (applicationId) {
      const { data, error } = await this.supabase
        .from('applications')
        .update({
          ...(dto.firstName !== undefined ? { first_name: dto.firstName } : {}),
          ...(dto.lastName !== undefined ? { last_name: dto.lastName } : {}),
          ...(dto.email !== undefined ? { email: dto.email } : {}),
          ...(dto.phoneNumber !== undefined ? { phone_number: dto.phoneNumber } : {}),
          ...(dto.country !== undefined ? { country: dto.country } : {}),
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
      .insert({
        first_name: dto.firstName,
        last_name: dto.lastName,
        email: dto.email.trim().toLowerCase(),
        phone_number: dto.phoneNumber || '',
        country: dto.country || '',
        current_stage: 1,
        application_status: 'Draft',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Application draft created', application: data };
  }

  // ==========================================
  // STAGE 2: ROLE / TRACK & COHORT SELECTION
  // ==========================================
  async getStage2Options() {
    const windowInfo = this.getApplicationWindowAndPricing();

    const [{ data: tracks, error: tracksError }, { data: cohorts, error: cohortsError }] =
      await Promise.all([
        this.supabase
          .from('tracks')
          .select('id, code, label')
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        this.supabase
          .from('cohorts')
          .select('id, name, start_date, end_date')
          .order('start_date', { ascending: true }),
      ]);

    if (tracksError) throw new BadRequestException(tracksError.message);
    if (cohortsError) throw new BadRequestException(cohortsError.message);

    const pricedCohorts = (cohorts || []).map((c: any) => ({
      ...c,
      fee_amount: windowInfo.currentPrice,
      currency: windowInfo.currency,
      is_early_bird: windowInfo.isEarlyBird,
      early_bird_deadline: windowInfo.earlyBirdDeadline,
    }));

    return {
      isOpen: windowInfo.isOpen,
      pricing: {
        currency: windowInfo.currency,
        amount: windowInfo.currentPrice,
        isEarlyBird: windowInfo.isEarlyBird,
        earlyBirdPrice: windowInfo.earlyBirdPrice,
        normalPrice: windowInfo.normalPrice,
        earlyBirdDeadline: windowInfo.earlyBirdDeadline,
      },
      tracks: tracks || [],
      cohorts: pricedCohorts,
    };
  }

  async saveProgramSelection(applicationId: string, dto: ProgramSelectionStageDto) {
    this.assertApplicationIsOpen();

    const { data: currentApp, error: appErr } = await this.supabase
      .from('applications')
      .select('id, email')
      .eq('id', applicationId)
      .single();

    if (appErr || !currentApp) {
      throw new NotFoundException('Application not found');
    }

    let resolvedCohortId = dto.cohortId || null;
    if (!resolvedCohortId && dto.cohortName) {
      const { data: cohort } = await this.supabase
        .from('cohorts')
        .select('id')
        .eq('name', dto.cohortName)
        .single();
      resolvedCohortId = cohort?.id || null;
    }

    // Early validation: check if this email already applied for this specific cohort
    if (currentApp.email && resolvedCohortId) {
      const { data: existingForCohort } = await this.supabase
        .from('applications')
        .select('id, application_status, payment_status')
        .ilike('email', currentApp.email.trim())
        .eq('cohort_id', resolvedCohortId)
        .neq('id', applicationId)
        .maybeSingle();

      if (existingForCohort) {
        throw new ConflictException(
          `An application for ${currentApp.email} already exists for ${dto.cohortName || 'this cohort'}. You can apply to a different cohort using this email.`,
        );
      }
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

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'This email has already been used to apply for this cohort.',
        );
      }
      throw new BadRequestException(error.message);
    }

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
    this.assertApplicationIsOpen();

    const { data: existingApp, error: fetchError } = await this.supabase
      .from('applications')
      .select('id, resume_url')
      .eq('id', applicationId)
      .single();

    if (fetchError || !existingApp) {
      throw new NotFoundException('Application not found');
    }

    let resumeUrl = existingApp.resume_url;

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
  // STAGE 4: REVIEW SUMMARY & PAYMENT
  // ==========================================
  async getStage4ReviewSummary(applicationId: string) {
    const windowInfo = this.getApplicationWindowAndPricing();

    const { data: app, error } = await this.supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error || !app) {
      throw new NotFoundException('Application not found');
    }

    return {
      isOpen: windowInfo.isOpen,
      application: app,
      feeAmount: windowInfo.currentPrice,
      currency: windowInfo.currency,
      isEarlyBird: windowInfo.isEarlyBird,
      earlyBirdDeadline: windowInfo.earlyBirdDeadline,
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

  async initializeStage4Payment(applicationId: string, dto: InitializePaymentDto) {
    const windowInfo = this.assertApplicationIsOpen();

    const { data: app, error } = await this.supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error || !app) {
      throw new NotFoundException('Application not found');
    }

    if (app.payment_status === 'Successful') {
      throw new BadRequestException('Application payment has already been completed');
    }

    // Re-check per-cohort uniqueness before payment initialization
    if (app.email && app.cohort_id) {
      const { data: duplicatePaid } = await this.supabase
        .from('applications')
        .select('id')
        .ilike('email', app.email.trim())
        .eq('cohort_id', app.cohort_id)
        .eq('payment_status', 'Successful')
        .neq('id', applicationId)
        .maybeSingle();

      if (duplicatePaid) {
        throw new ConflictException(
          'This email already has a completed application for this cohort.',
        );
      }
    }

    const feeAmount = windowInfo.currentPrice;
    const frontendUrl = process.env.FRONTEND_URL || 'https://pnafrica.com';
    const callbackUrl =
      dto.callbackUrl || `${frontendUrl}/apply/payment-callback?applicationId=${applicationId}`;
    const txRef = `PNA_${dto.paymentMethod.toUpperCase()}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    await this.supabase
      .from('applications')
      .update({
        payment_method: dto.paymentMethod,
        payment_transaction_ref: txRef,
        current_stage: 4,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (dto.paymentMethod === PaymentMethodEnum.PAYSTACK) {
      try {
        const paystackRes = await axios.post(
          'https://api.paystack.co/transaction/initialize',
          {
            email: app.email,
            amount: Math.round(feeAmount * 100),
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
          currency: windowInfo.currency,
        };
      } catch (err: any) {
        throw new BadRequestException(
          `Paystack initialization failed: ${err.response?.data?.message || err.message}`,
        );
      }
    }

    if (dto.paymentMethod === PaymentMethodEnum.NESTUGE) {
      const baseNestugeUrl = process.env.NESTUGE_CHECKOUT_URL || 'https://nestuge.com/pay/pnafrica';
      const separator = baseNestugeUrl.includes('?') ? '&' : '?';
      const checkoutUrl =
        `${baseNestugeUrl}${separator}` +
        `reference=${encodeURIComponent(txRef)}` +
        `&email=${encodeURIComponent(app.email)}` +
        `&name=${encodeURIComponent(`${app.first_name} ${app.last_name}`)}` +
        `&amount=${feeAmount}` +
        `&currency=${encodeURIComponent(windowInfo.currency)}` +
        `&redirect_url=${encodeURIComponent(callbackUrl)}`;

      return {
        provider: 'Nestuge',
        authorizationUrl: checkoutUrl,
        reference: txRef,
        amount: feeAmount,
        currency: windowInfo.currency,
      };
    }

    throw new BadRequestException('Unsupported payment method');
  }

  async verifyAndSubmitApplication(applicationId: string, dto: VerifyPaymentDto) {
    const windowInfo = this.assertApplicationIsOpen();

    const { data: app, error: fetchError } = await this.supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !app) {
      throw new NotFoundException('Application not found');
    }

    if (app.payment_status === 'Successful' && app.reference_code) {
      const paidAmount = windowInfo.currentPrice;
      const paidAt = app.paid_at || app.updated_at || new Date().toISOString();
      return {
        message: 'Application Submitted Successfully!',
        popupDetails: {
          statusMessage: 'Application Submitted!',
          cohortAppliedFor: app.cohort_name,
          track: app.track,
          referenceCode: app.reference_code,
        },
        payment: {
          amount: paidAmount,
          currency: windowInfo.currency,
          paymentMethod: app.payment_method || dto.paymentMethod,
          status: 'Successful',
          transactionReference: app.payment_transaction_ref || dto.transactionReference,
          paidAt,
        },
      };
    }

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

    if (dto.paymentMethod === PaymentMethodEnum.NESTUGE) {
      if (!dto.transactionReference) {
        throw new BadRequestException('Nestuge transaction reference is required');
      }
    }

    const amountPaid = windowInfo.currentPrice;
    const paidAt = new Date().toISOString();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const referenceCode = `#PNA-${new Date().getFullYear()}-${randomNum}`;

    const { error } = await this.supabase
      .from('applications')
      .update({
        payment_method: dto.paymentMethod,
        payment_status: 'Successful',
        payment_transaction_ref: dto.transactionReference,
        paid_at: paidAt,
        reference_code: referenceCode,
        application_status: 'Submitted',
        current_stage: 4,
        updated_at: paidAt,
      })
      .eq('id', applicationId);

    if (error) throw new BadRequestException(error.message);

    await this.emailService.sendApplicationSubmissionEmails({
      applicantEmail: app.email,
      firstName: app.first_name,
      lastName: app.last_name,
      phoneNumber: app.phone_number,
      country: app.country,
      track: app.track || 'General Track',
      cohortName: app.cohort_name || 'Active Cohort',
      experienceLevel: app.experience_level || 'N/A',
      portfolioLink: app.portfolio_link,
      linkedinLink: app.linkedin_link,
      resumeUrl: app.resume_url,
      whyJoin: app.why_join,
      referenceCode,
      paymentMethod: dto.paymentMethod,
      amount: amountPaid,
      currency: windowInfo.currency,
      transactionReference: dto.transactionReference,
    });

    return {
      message: 'Application Submitted Successfully!',
      popupDetails: {
        statusMessage: 'Application Submitted!',
        cohortAppliedFor: app.cohort_name,
        track: app.track,
        referenceCode,
      },
      payment: {
        amount: amountPaid,
        currency: windowInfo.currency,
        paymentMethod: dto.paymentMethod,
        status: 'Successful',
        transactionReference: dto.transactionReference,
        paidAt,
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