import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module.js';
import { ApplicantModule } from './modules/applicant/applicant.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ApplicantModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
