import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import {
  AdminEmailLoginDto,
  LoginDto,
  RegisterAcceptedUserDto,
  SubmitMentorApplicationDto,
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from './dto/auth.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==========================================
  // ADMIN EMAIL-ONLY SIGN-IN & VERIFICATION
  // ==========================================
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Admin sign-in (email only). Sends a single-use verification link if email is in ADMIN_EMAILS.',
  })
  async adminLogin(@Body() dto: AdminEmailLoginDto) {
    return this.authService.requestAdminEmailLogin(dto);
  }

  @Get('admin/verify')
  @ApiQuery({ name: 'token', required: true })
  @ApiOperation({
    summary:
      'Verifies the admin email button click and redirects immediately to https://www.pnafrica.com/admin/dashboard',
  })
  async verifyAdminLogin(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const result = await this.authService.verifyAdminMagicToken(token);
    return res.redirect(HttpStatus.FOUND, result.redirectUrl);
  }

  // ==========================================
  // MENTOR APPLICATION SUBMISSION
  // ==========================================
  @Post('mentor/apply')
  @ApiOperation({
    summary:
      'Submit a Mentor application (sends confirmation to mentor + details to pna-report@googlegroups.com and projectnetworkafrica@gmail.com)',
  })
  async applyAsMentor(@Body() dto: SubmitMentorApplicationDto) {
    return this.authService.submitMentorApplication(dto);
  }

  // ==========================================
  // STREAMLINED REGISTRATION & LOGIN (APPLICANTS & MENTORS)
  // ==========================================
  @Post('register')
  @ApiOperation({
    summary:
      'Register portal account for an accepted Applicant or Mentor (email, password, confirmPassword only)',
  })
  async register(@Body() dto: RegisterAcceptedUserDto) {
    return this.authService.registerAcceptedApplicantOrMentor(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login for verified Applicants and Mentors using email and password',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.loginUser(dto);
  }

  // ==========================================
  // PASSWORD RESET (APPLICANTS & MENTORS)
  // ==========================================
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Request a password reset for an Applicant or Mentor (sends verification button email)',
  })
  async forgotPassword(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reset password using token from email + email, password, and confirmPassword; sends confirmation email with https://www.pnafrica.com/login',
  })
  async resetPassword(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }
}