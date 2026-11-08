import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const data = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@pnafrica.org',
        to,
        subject,
        html,
      });
      return { success: true, data };
    } catch (error: any) {
      console.error('Email delivery error:', error);
      return { success: false, error: error.message };
    }
  }

  async applicantSessionSchedule(email: string, applicantName: string, mentorName: string, sessionTitle: string, formattedDate: string, meetLink: string) {
    const html = `
      <h2>Mentorship Session Confirmed</h2>
      <p>Hello ${applicantName},</p>
      <p>Your mentorship session with <strong>${mentorName}</strong> has been scheduled.</p>
      <p><strong>Session Title:</strong> ${sessionTitle}</p>
      <p><strong>Date & Time:</strong> ${formattedDate}</p>
      <p><strong>Google Meet Link:</strong> <a href="${meetLink}">${meetLink}</a></p>
    `;
    return this.sendEmail(email, `Session Confirmed - ${sessionTitle}`, html);
  }

  async mentorSessionSchedule(email: string, mentorName: string, applicantName: string, sessionTitle: string, formattedDate: string, meetLink: string) {
    const html = `
      <h2>New Mentorship Session Booked</h2>
      <p>Hello ${mentorName},</p>
      <p><strong>${applicantName}</strong> has booked a session with you.</p>
      <p><strong>Session Title:</strong> ${sessionTitle}</p>
      <p><strong>Date & Time:</strong> ${formattedDate}</p>
      <p><strong>Google Meet Link:</strong> <a href="${meetLink}">${meetLink}</a></p>
    `;
    return this.sendEmail(email, `New Session Scheduled - ${sessionTitle}`, html);
  }

  async sendVerificationEmail(email: string, token: string) {
    const html = `
      <h2>Verify Your Email</h2>
      <p>Welcome to PN Africa! Please verify your email using the token below:</p>
      <h3>${token}</h3>
    `;
    return this.sendEmail(email, 'Verify Your Email - PN Africa', html);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Use the token below to reset your password:</p>
      <h3>${token}</h3>
    `;
    return this.sendEmail(email, 'Password Reset - PN Africa', html);
  }

  async sendDataDeletionNotification(email: string, firstName: string) {
    const html = `
      <p>Hello ${firstName},</p>
      <p>We have received your request to delete your PN Africa account and associated data. Our admin team will process this within 48 hours.</p>
    `;
    return this.sendEmail(email, 'Data Deletion Request Received - PN Africa', html);
  }
}