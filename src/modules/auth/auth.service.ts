import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service.js';
import { SignUpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';


@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || '',
    );
  }

  // 1. SIGN UP FLOW
  async signup(dto: SignUpDto) {
    const { data, error } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: {
          first_name: dto.firstName,
          last_name: dto.lastName,
          role: dto.role || 'Applicant',
        },
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const user = data.user;
    const verificationToken = 'PNA-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    if (user && user.email) {
      await this.emailService.sendVerificationEmail(user.email, verificationToken);
    }

    return {
      message: 'Sign-up successful. Please check your email for verification.',
      user,
    };
  }

  // 2. LOGIN FLOW
  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = data.user;
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.user_metadata?.role });

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