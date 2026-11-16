import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service.js';
import { SignUpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';


@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || '',
    );

    // Admin client uses Service Role Key to create users silently and auto-confirm emails
    this.supabaseAdmin = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',
    );
  }

  // 1. SIGN UP FLOW
  async signup(dto: SignUpDto) {
    // 1. Create user silently without Supabase sending its own email
    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: false,
      user_metadata: {
        first_name: dto.firstName,
        last_name: dto.lastName,
        role: dto.role || 'Applicant',
      },
    });

    if (error || !data.user) {
      throw new BadRequestException(error?.message || 'Registration failed');
    }

    const user = data.user;

    // 2. Generate a signed JWT verification token containing the user's Supabase ID
    const verifyToken = this.jwtService.sign(
      { sub: user.id, email: user.email, purpose: 'email-verification' },
      { expiresIn: '24h' },
    );

    // 3. Construct the Render backend verification URL
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3300';
    const verificationLink = `${backendUrl}/auth/verify-email?token=${verifyToken}`;

    // 4. Send branded email via Resend from noreply@pnafrica.org
    await this.emailService.sendVerificationEmail(
      dto.email,
      dto.firstName,
      verificationLink,
    );

    return {
      message: 'Registration successful! Please check your email and click the Verify Account button.',
      userId: user.id,
      email: user.email,
    };
  }

  async verifyAccountByLink(token: string) {
    try {
      // 1. Verify the signed link token
      const payload = this.jwtService.verify(token);
      if (payload.purpose !== 'email-verification' || !payload.sub) {
        throw new BadRequestException('Invalid verification link');
      }

      // 2. Automatically confirm the user's email in Supabase Auth
      const { error } = await this.supabaseAdmin.auth.admin.updateUserById(payload.sub, {
        email_confirm: true,
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return {
        verified: true,
        message: 'Email verified successfully! You can now log in.',
      };
    } catch (err) {
      throw new BadRequestException('Verification link has expired or is invalid.');
    }
  }

  // 2. LOGIN FLOW
  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      // Supabase automatically blocks login if email_confirm is still false
      throw new UnauthorizedException(error?.message || 'Invalid email or password, or account not verified');
    }

    const user = data.user;
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.user_metadata?.role,
    });

    return {
      message: 'Login successful',
      accessToken: token,
      user,
    };
  }


  // 3. FORGOT PASSWORD FLOW
  async forgotPassword(dto: ForgotPasswordDto) {
    const verificationToken = 'RESET-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await this.emailService.sendPasswordResetEmail(dto.email, verificationToken);

    return {
      message: 'Password reset instructions sent to your email.',
    };
  }

  async resetPassword(token: string, dto: ResetPasswordDto) {
    // Note: If using Supabase auth with a recovery token or active session:
    const { data, error } = await this.supabase.auth.updateUser({
      password: dto.newPassword, // Adjust to dto.password if your DTO uses 'password'
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Password has been successfully reset.',
    };
  }
}