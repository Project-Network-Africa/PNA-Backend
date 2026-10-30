import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SignUpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private resend: Resend;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  // 1. SIGN UP FLOW
  async signup(dto: SignUpDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Register user in Supabase Auth
    const { data, error } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: {
          first_name: dto.firstName,
          last_name: dto.lastName,
          role: dto.role,
        },
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Generate verification URL (pointing to frontend login/verify handler)
    const verificationUrl = `https://pnafrica.org/verify?token=${data.user?.id}`;

    // Send verification email via Resend
    await this.resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@pnafrica.org',
      to: dto.email,
      subject: 'Verify Your PN Africa Account',
      html: `
        <h2>Welcome to PN Africa, ${dto.firstName}!</h2>
        <p>Thank you for signing up as an <strong>${dto.role}</strong>.</p>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Account</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    return {
      message: 'Account created successfully. Please check your email to verify your account.',
      userId: data.user?.id,
    };
  }

  // 2. LOGIN FLOW
  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      message: 'Logged in successfully',
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.user,
      rememberMe: dto.rememberMe || false,
    };
  }

  // 3. FORGOT PASSWORD FLOW
  async forgotPassword(dto: ForgotPasswordDto) {
    const resetTokenUrl = `https://pnafrica.org/reset-password`;

    // Trigger Supabase password reset email or use Resend custom email
    const { error } = await this.supabase.auth.resetPasswordForEmail(dto.email, {
      redirectTo: resetTokenUrl,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Optional custom Resend email dispatch
    await this.resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@pnafrica.org',
      to: dto.email,
      subject: 'Reset Your PN Africa Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <a href="${resetTokenUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    return {
      message: 'Password reset link has been sent to your email.',
    };
  }

  // 4. RESET PASSWORD FLOW
  async resetPassword(token: string, dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Update password using Supabase admin or active session token
    const { error } = await this.supabase.auth.updateUser({
      password: dto.newPassword,
    });

    if (error) {
      throw new BadRequestException('Failed to update password. Token may be expired.');
    }

    return {
      message: 'Password updated successfully. Please login with your new password.',
    };
  }
}