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
        from: `PN Africa <${process.env.EMAIL_FROM || 'noreply@pnafrica.com'}>`,
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

  async sendVerificationEmail(email: string, firstName: string, verificationLink: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #111827;">Welcome to PN Africa, ${firstName}!</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          Thank you for registering on the PN Africa Talent Platform. Click the button below to verify your email address and activate your account:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verificationLink}" 
             style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
            Verify Account
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${verificationLink}" style="color: #2563eb;">${verificationLink}</a>
        </p>
      </div>
    `;
    return this.sendEmail(email, 'Verify Your Account - PN Africa', html);
  }

  async sendPaymentConfirmationEmail(email: string, firstName: string, amount: number, paymentMethod: string, reference: string, date: string, status: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #10b981;">Payment Successful!</h2>
        <p style="color: #4b5563; font-size: 16px;">Hello ${firstName},</p>
        <p style="color: #4b5563; font-size: 16px;">We have successfully received your payment of ₦${amount.toLocaleString()}.</p>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 6px 0;"><strong>Transaction ID:</strong> ${reference}</p>
          <p style="margin: 6px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 6px 0;"><strong>Amount Paid:</strong> ₦${amount.toLocaleString()}</p>
          <p style="margin: 6px 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p style="margin: 6px 0;"><strong>Status:</strong> ${status}</p>
        </div>
        <p style="color: #6b7280; font-size: 13px;">Thank you for being part of PN Africa.</p>
      </div>
    `;
    return this.sendEmail(email, 'Payment Receipt & Confirmation - PN Africa', html);
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