import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

export interface ApplicationReviewEmailPayload {
  applicantEmail: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  country: string;
  track: string;
  cohortName: string;
  experienceLevel: string;
  portfolioLink?: string | null;
  linkedinLink?: string | null;
  resumeUrl?: string | null;
  whyJoin?: string | null;
  referenceCode: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  transactionReference: string;
}

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

  async sendReferralInviteEmail(recipientEmail: string, referrerName: string, referralLink: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #111827;">You've Been Invited to Join PN Africa!</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          <strong>${referrerName}</strong> invited you to accelerate your tech career with real-world team projects and dedicated mentorship on PN Africa.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${referralLink}" 
             style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
            Accept Invitation & Apply
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">
          Or use this referral link:<br/>
          <a href="${referralLink}" style="color: #2563eb;">${referralLink}</a>
        </p>
      </div>
    `;
    return this.sendEmail(recipientEmail, `${referrerName} invited you to PN Africa`, html);
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

  async sendApplicationSubmissionEmails(payload: ApplicationReviewEmailPayload) {
    const applicantName = `${payload.firstName} ${payload.lastName}`.trim();

    // 1. Confirmation Email to Applicant
    const applicantHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #2563eb;">Application Submitted Successfully!</h2>
        <p style="color: #4b5563; font-size: 16px;">Hello ${applicantName},</p>
        <p style="color: #4b5563; font-size: 16px;">
          We have received your application for <strong>${payload.track}</strong> in <strong>${payload.cohortName}</strong>.
        </p>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Your Application Reference Code:</p>
          <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: #111827;">${payload.referenceCode}</p>
        </div>
        <p style="color: #4b5563; font-size: 14px;">
          <strong>Payment:</strong> ${payload.currency} ${payload.amount.toLocaleString()} via ${payload.paymentMethod} (Ref: ${payload.transactionReference})
        </p>
        <p style="color: #6b7280; font-size: 13px;">Keep this reference code to track your application status while our admissions team reviews your submission.</p>
      </div>
    `;
    await this.sendEmail(
      payload.applicantEmail,
      `Application Confirmation (${payload.referenceCode}) - PN Africa`,
      applicantHtml,
    );

    // 2. Full Application + CV Email to PN-Africa Review Emails
    const reviewEmails = ['pna-report@googlegroups.com', 'projectnetworkafrica@gmail.com'];
    const cvSection = payload.resumeUrl
      ? `<p><strong>Uploaded CV / Resume:</strong> <a href="${payload.resumeUrl}" target="_blank" rel="noopener noreferrer">${payload.resumeUrl}</a></p>`
      : `<p><strong>Uploaded CV / Resume:</strong> Not provided</p>`;

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #111827;">New Applicant Submission for Review</h2>
        <p><strong>Reference Code:</strong> ${payload.referenceCode}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <h3>Personal Information</h3>
        <p><strong>Full Name:</strong> ${applicantName}</p>
        <p><strong>Email:</strong> ${payload.applicantEmail}</p>
        <p><strong>Phone Number:</strong> ${payload.phoneNumber}</p>
        <p><strong>Country:</strong> ${payload.country}</p>
        <h3>Program Selection</h3>
        <p><strong>Track:</strong> ${payload.track}</p>
        <p><strong>Cohort:</strong> ${payload.cohortName}</p>
        <h3>Experience &amp; Portfolio</h3>
        <p><strong>Experience Level:</strong> ${payload.experienceLevel}</p>
        <p><strong>Portfolio Link:</strong> ${payload.portfolioLink || 'N/A'}</p>
        <p><strong>LinkedIn Profile:</strong> ${payload.linkedinLink || 'N/A'}</p>
        ${cvSection}
        <p><strong>Why do you want to join this program?</strong></p>
        <blockquote style="background: #f9fafb; padding: 12px 16px; border-left: 4px solid #2563eb; margin: 8px 0;">
          ${payload.whyJoin || 'N/A'}
        </blockquote>
        <h3>Payment Details</h3>
        <p><strong>Method:</strong> ${payload.paymentMethod}</p>
        <p><strong>Amount Paid:</strong> ${payload.currency} ${payload.amount.toLocaleString()}</p>
        <p><strong>Transaction Reference:</strong> ${payload.transactionReference}</p>
      </div>
    `;

    for (const reviewerEmail of reviewEmails) {
      await this.sendEmail(
        reviewerEmail,
        `New Application for Review: ${applicantName} (${payload.referenceCode})`,
        adminHtml,
      );
    }
  }

  async sendAdmissionAcceptanceEmail(applicantEmail: string, applicantName: string, registrationLink: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #10b981;">Congratulations, ${applicantName}!</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          Your application to PN Africa has been reviewed and <strong>Accepted</strong>! You are now eligible to set up your portal and begin your onboarding.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${registrationLink}" 
             style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
            Create Your Portal
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">Welcome aboard!</p>
      </div>
    `;
    return this.sendEmail(applicantEmail, 'Congratulations! Your PN Africa Application Was Accepted', html);
  } 
}