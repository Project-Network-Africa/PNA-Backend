import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from './auth.dto.js'; 

export class AuthMessageResponseDto {
  @ApiProperty({ example: 'Account created successfully. Please check your email to verify your account.' })
  message: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851', required: false })
  userId?: string;
}

export class UserProfileDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.APPLICANT })
  role: UserRole;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'Logged in successfully' })
  message: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'refresh-token-xyz...' })
  refreshToken: string;

  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;

  @ApiProperty({ example: false })
  rememberMe: boolean;
}