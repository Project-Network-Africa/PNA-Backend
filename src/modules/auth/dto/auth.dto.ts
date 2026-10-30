import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, IsBoolean, Equals } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  APPLICANT = 'Applicant',
  MENTOR = 'Mentor',
}

export class SignUpDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required' })
  confirmPassword: string;

  @ApiProperty({ enum: UserRole, example: UserRole.APPLICANT })
  @IsEnum(UserRole, { message: 'Role must be either Applicant or Mentor' })
  role: UserRole;

  @ApiProperty({ example: true, description: 'Must agree to Privacy Policy and Terms of Service' })
  @IsBoolean()
  @Equals(true, { message: 'You must agree to the Privacy Policy and Terms of Service' })
  termsAgreement: boolean;
}

export class LoginDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  rememberMe?: boolean;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'newSecurePassword123!' })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ example: 'newSecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}