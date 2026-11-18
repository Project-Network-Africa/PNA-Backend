import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { SignUpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, ResendVerificationDto } from './dto/auth.dto.js';
import { AuthMessageResponseDto, LoginResponseDto } from './dto/auth-response.dto.js';
import type { Response } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new Applicant or Mentor' })
  @ApiResponse({
    status: 201,
    description: 'Registration successful! Please check your email and click the Verify Account button.',
    type: AuthMessageResponseDto,
  })
  async signup(@Body() dto: SignUpDto) {
    return this.authService.signup(dto);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Auto-verify user email when clicking the email button and redirect to login' })
  @ApiQuery({ name: 'token', required: true })
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    await this.authService.verifyAccountByLink(token);

    // Redirect user straight to your frontend login page with a verified flag
    const frontendLoginUrl = `${process.env.FRONTEND_URL || 'https://pnafrica.com'}/login?verified=true`;
    return res.redirect(frontendLoginUrl);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification button link if the previous email expired or was not received' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in after verifying email' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully with JWT token returned.',
    type: LoginResponseDto,
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link via email' })
  @ApiResponse({
    status: 200,
    description: 'Reset link sent to email.',
    type: AuthMessageResponseDto,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update password using reset token' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully.',
    type: AuthMessageResponseDto,
  })
  async resetPassword(@Query('token') token: string, @Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(token, dto);
  }
}