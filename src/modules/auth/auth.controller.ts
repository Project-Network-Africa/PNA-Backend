import { Controller, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { SignUpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto.js';
import { AuthMessageResponseDto, LoginResponseDto } from './dto/auth-response.dto.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new Applicant or Mentor' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully & verification email sent.',
    type: AuthMessageResponseDto,
  })
  async signup(@Body() dto: SignUpDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user with email and password' })
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