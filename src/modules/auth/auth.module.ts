import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { EmailModule } from '../email/email.module.js';
import { JwtStrategy } from './jwt.strategy.js';

@Module({
  imports: [
    EmailModule, // Provides EmailService
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
      signOptions: { expiresIn: (process.env.JWT_EXPIRATION || '7d') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}