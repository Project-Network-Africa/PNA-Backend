import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service.js';
import {
  AdminEmailLoginDto,
  LoginDto,
  RegisterAcceptedUserDto,
  SubmitMentorApplicationDto,
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from './dto/auth.dto.js';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(private readonly emailService: EmailService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  private getAllowedAdminEmails(): string[] {
    return (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  // ==========================================
  // 1. ADMIN EMAIL-ONLY LOGIN & VERIFICATION
  // ==========================================
  async requestAdminEmailLogin(dto: AdminEmailLoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const allowedAdmins = this.getAllowedAdminEmails();

    if (!allowedAdmins.includes(normalizedEmail)) {
      throw new ForbiddenException(
        'Access denied. This email is not authorized for the Admin Portal.',
      );
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: insertErr } = await this.supabase
      .from('admin_login_tokens')
      .insert({
        email: normalizedEmail,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (insertErr) {
      throw new BadRequestException(insertErr.message);
    }

    const backendUrl = process.env.BACKEND_URL || 'https://api.pnafrica.com';
    const verificationUrl = `${backendUrl}/auth/admin/verify?token=${encodeURIComponent(rawToken)}`;

    await this.emailService.sendAdminMagicLoginEmail(
      normalizedEmail,
      verificationUrl,
    );

    return {
      message:
        'A verification email has been sent to your registered admin email. Click the verification button inside the email to access the Admin Portal.',
      email: normalizedEmail,
    };
  }

  async verifyAdminMagicToken(rawToken: string) {
    if (!rawToken) {
      throw new UnauthorizedException('Missing admin verification token.');
    }

    const tokenHash = this.hashToken(rawToken.trim());
    const nowIso = new Date().toISOString();

    const { data: tokenRow, error } = await this.supabase
      .from('admin_login_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error || !tokenRow) {
      throw new UnauthorizedException('Invalid admin verification link.');
    }

    if (tokenRow.used_at) {
      throw new UnauthorizedException('This verification link has already been used.');
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      throw new UnauthorizedException('This verification link has expired. Please request a new sign-in email.');
    }

    const allowedAdmins = this.getAllowedAdminEmails();
    if (!allowedAdmins.includes(tokenRow.email.toLowerCase())) {
      throw new ForbiddenException('Email is no longer authorized in ADMIN_EMAILS.');
    }

    // Mark token single-use
    await this.supabase
      .from('admin_login_tokens')
      .update({ used_at: nowIso })
      .eq('id', tokenRow.id);

    // Ensure Admin user exists in Supabase Auth + profiles
    let { data: profile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('email', tokenRow.email)
      .maybeSingle();

    if (!profile) {
      const { data: createdAuth, error: createErr } =
        await this.supabase.auth.admin.createUser({
          email: tokenRow.email,
          email_confirm: true,
          user_metadata: {
            first_name: 'PN Africa',
            last_name: 'Admin',
            role: 'Admin',
          },
        });

      if (createErr || !createdAuth.user) {
        throw new BadRequestException(
          createErr?.message || 'Could not provision admin profile.',
        );
      }

      const { data: syncedProfile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', createdAuth.user.id)
        .maybeSingle();
      profile = syncedProfile;
    } else if (profile.role !== 'Admin') {
      await this.supabase
        .from('profiles')
        .update({ role: 'Admin', updated_at: nowIso })
        .eq('id', profile.id);
    }

    // Generate Supabase session link / OTP for immediate frontend session exchange
    const { data: linkData, error: linkErr } =
      await this.supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: tokenRow.email,
      });

    if (linkErr) {
      throw new BadRequestException(linkErr.message);
    }

    const hashedAuthToken = linkData.properties?.hashed_token || '';
    const dashboardUrl = `https://www.pnafrica.com/admin/dashboard?token_hash=${encodeURIComponent(
      hashedAuthToken,
    )}&type=magiclink&email=${encodeURIComponent(tokenRow.email)}`;

    await this.supabase.from('admin_audit_logs').insert({
      actor_name: tokenRow.email,
      action_type: 'ACCOUNT_APPROVED',
      description: `Admin ${tokenRow.email} verified via magic email link and accessed the Admin Portal`,
    });

    return {
      verified: true,
      redirectUrl: dashboardUrl,
      admin: {
        id: profile?.id,
        email: tokenRow.email,
        role: 'Admin',
      },
    };
  }

  // ==========================================
  // 2. MENTOR APPLICATION SUBMISSION
  // ==========================================
  async submitMentorApplication(dto: SubmitMentorApplicationDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const referenceCode = `#PNA-MNT-${new Date().getFullYear()}-${Math.floor(
      10000 + Math.random() * 90000,
    )}`;

    const { data: saved, error } = await this.supabase
      .from('mentor_applications')
      .upsert(
        {
          first_name: dto.firstName.trim(),
          last_name: dto.lastName.trim(),
          email: normalizedEmail,
          phone_number: dto.phoneNumber.trim(),
          country: dto.country.trim(),
          state: dto.state?.trim() || null,
          profession: dto.profession.trim(),
          years_of_experience: dto.yearsOfExperience,
          weekly_availability_hours: dto.weeklyAvailabilityHours,
          linkedin_link: dto.linkedinLink || null,
          portfolio_link: dto.portfolioLink || null,
          resume_url: dto.resumeUrl || null,
          bio: dto.bio || null,
          reference_code: referenceCode,
          application_status: 'Under Review',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' },
      )
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.emailService.sendMentorApplicationSubmissionEmails({
      mentorEmail: normalizedEmail,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phoneNumber: dto.phoneNumber.trim(),
      country: dto.country.trim(),
      profession: dto.profession.trim(),
      yearsOfExperience: dto.yearsOfExperience,
      weeklyAvailabilityHours: dto.weeklyAvailabilityHours,
      portfolioLink: dto.portfolioLink,
      linkedinLink: dto.linkedinLink,
      resumeUrl: dto.resumeUrl,
      bio: dto.bio,
      referenceCode,
    });

    await this.supabase.from('admin_audit_logs').insert({
      actor_name: `${dto.firstName} ${dto.lastName}`.trim(),
      action_type: 'APPLICATION_SUBMITTED',
      description: `Mentor application submitted by ${normalizedEmail} (${referenceCode})`,
    });

    return {
      message:
        'Mentor application submitted and is under review. Check your email for confirmation.',
      referenceCode,
      application: saved,
    };
  }

  // ==========================================
  // 3. STREAMLINED REGISTRATION FOR ACCEPTED APPLICANTS & MENTORS
  //    (Email + Password + Confirm Password ONLY)
  // ==========================================
  async registerAcceptedApplicantOrMentor(dto: RegisterAcceptedUserDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirm password do not match.');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    // Prevent admins from using public registration
    if (this.getAllowedAdminEmails().includes(normalizedEmail)) {
      throw new ForbiddenException(
        'Admin accounts cannot register here. Please use the Admin email sign-in page.',
      );
    }

    // Look up accepted Applicant application or accepted Mentor application
    const [{ data: applicantApp }, { data: mentorApp }] = await Promise.all([
      this.supabase
        .from('applications')
        .select('*')
        .ilike('email', normalizedEmail)
        .eq('application_status', 'Accepted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      this.supabase
        .from('mentor_applications')
        .select('*')
        .ilike('email', normalizedEmail)
        .eq('application_status', 'Accepted')
        .maybeSingle(),
    ]);

    if (!applicantApp && !mentorApp) {
      throw new ForbiddenException(
        'No accepted application found for this email. Please apply first or wait for your acceptance email.',
      );
    }

    const role: 'Applicant' | 'Mentor' = mentorApp ? 'Mentor' : 'Applicant';
    const firstName = (mentorApp?.first_name || applicantApp?.first_name || '').trim();
    const lastName = (mentorApp?.last_name || applicantApp?.last_name || '').trim();

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.pnafrica.com';
    const emailRedirectTo = `${frontendUrl}/login?verified=true`;

    // Sign up via Supabase Auth so Supabase sends the account verification email
    const { data: signUpData, error: signUpErr } = await this.supabase.auth.signUp({
      email: normalizedEmail,
      password: dto.password,
      options: {
        emailRedirectTo,
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
        },
      },
    });

    if (signUpErr || !signUpData.user) {
      throw new BadRequestException(
        signUpErr?.message || 'Unable to register account.',
      );
    }

    const userId = signUpData.user.id;
    const nowIso = new Date().toISOString();

    // Ensure profile row has exact role and names
    await this.supabase.from('profiles').upsert(
      {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email: normalizedEmail,
        role,
        updated_at: nowIso,
      },
      { onConflict: 'id' },
    );

    if (role === 'Mentor' && mentorApp) {
      await this.supabase
        .from('mentor_applications')
        .update({ profile_id: userId, updated_at: nowIso })
        .eq('id', mentorApp.id);

      await this.supabase.from('mentors').upsert(
        {
          profile_id: userId,
          profession: mentorApp.profession,
          bio: mentorApp.bio || null,
          country: mentorApp.country || null,
          state: mentorApp.state || null,
          years_of_experience: mentorApp.years_of_experience || 1,
          weekly_availability_hours: mentorApp.weekly_availability_hours || 6,
          linkedin_url: mentorApp.linkedin_link || null,
          portfolio_url: mentorApp.portfolio_link || null,
          cv_url: mentorApp.resume_url || null,
          verification_status: 'Approved',
          is_active: true,
        },
        { onConflict: 'profile_id' },
      );
    } else if (applicantApp) {
      await this.supabase
        .from('applications')
        .update({ profile_id: userId, updated_at: nowIso })
        .eq('id', applicantApp.id);

      await this.supabase.from('applicant_details').upsert(
        {
          profile_id: userId,
          profession: applicantApp.track || 'Applicant',
          cohort_id: applicantApp.cohort_id || null,
          stage: 'Onboarding',
          onboarding_at: nowIso,
          phone_number: applicantApp.phone_number || null,
          location: applicantApp.country || null,
          portfolio_link: applicantApp.portfolio_link || null,
          resume_url: applicantApp.resume_url || null,
          linkedin_link: applicantApp.linkedin_link || null,
        },
        { onConflict: 'profile_id' },
      );
    }

    return {
      message:
        'Registration successful! A verification email has been sent to your email address. Please verify your account, then log in.',
      role,
      email: normalizedEmail,
      loginUrl: `${frontendUrl}/login`,
    };
  }

  // ==========================================
  // 4. APPLICANT & MENTOR EMAIL + PASSWORD LOGIN
  // ==========================================
  async loginUser(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    if (this.getAllowedAdminEmails().includes(normalizedEmail)) {
      throw new ForbiddenException(
        'Admin accounts must sign in via the Admin email verification flow.',
      );
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: dto.password,
    });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedException(
        error?.message || 'Invalid email or password, or email not yet verified.',
      );
    }

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, is_active, status')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile && (profile.is_active === false || profile.status === 'Suspended')) {
      throw new ForbiddenException('Your account is currently suspended or inactive.');
    }

    await this.supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);

    return {
      message: 'Login successful',
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        role: profile?.role || 'Applicant',
      },
    };
  }

  // ==========================================
  // 5. APPLICANT & MENTOR PASSWORD RESET FLOW
  // ==========================================
  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    if (this.getAllowedAdminEmails().includes(normalizedEmail)) {
      throw new ForbiddenException(
        'Admin accounts use email verification sign-in and do not use password reset.',
      );
    }

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    // Always return a generic message to avoid email enumeration if not found,
    // while sending the verification email only to registered Applicants/Mentors
    if (!profile || (profile.role !== 'Applicant' && profile.role !== 'Mentor')) {
      return {
        message:
          'If an Applicant or Mentor account exists for this email, a password reset verification email has been sent.',
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: insertErr } = await this.supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profile.id,
        email: normalizedEmail,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (insertErr) {
      throw new BadRequestException(insertErr.message);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.pnafrica.com';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(
      rawToken,
    )}&email=${encodeURIComponent(normalizedEmail)}`;

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

    await this.emailService.sendPasswordResetVerificationEmail(
      normalizedEmail,
      fullName,
      resetUrl,
    );

    return {
      message:
        'A verification email has been sent to your registered email address. Click the button inside the email to proceed to the password reset page.',
      email: normalizedEmail,
    };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirm password do not match.');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const tokenHash = this.hashToken(dto.token.trim());
    const nowIso = new Date().toISOString();

    const { data: tokenRow, error } = await this.supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error || !tokenRow) {
      throw new UnauthorizedException('Invalid password reset verification link.');
    }

    if (tokenRow.email.toLowerCase() !== normalizedEmail) {
      throw new BadRequestException(
        'The email entered does not match the password reset request.',
      );
    }

    if (tokenRow.used_at) {
      throw new UnauthorizedException(
        'This password reset link has already been used.',
      );
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      throw new UnauthorizedException(
        'This password reset link has expired. Please request a new password reset.',
      );
    }

    // Update user's password in Supabase Auth
    const { error: updateAuthErr } =
      await this.supabase.auth.admin.updateUserById(tokenRow.user_id, {
        password: dto.password,
      });

    if (updateAuthErr) {
      throw new BadRequestException(
        updateAuthErr.message || 'Failed to update password.',
      );
    }

    // Mark token as used so it cannot be reused
    await this.supabase
      .from('password_reset_tokens')
      .update({ used_at: nowIso })
      .eq('id', tokenRow.id);

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', tokenRow.user_id)
      .maybeSingle();

    const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
    const loginUrl = 'https://www.pnafrica.com/login';

    await this.emailService.sendPasswordResetSuccessEmail(
      normalizedEmail,
      fullName,
      loginUrl,
    );

    return {
      message:
        'Your password has been reset successfully. A confirmation email with the login link has been sent to your email.',
      loginUrl,
    };
  }
}