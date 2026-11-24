import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../email/email.service.js';
import {
  AdminDashboardQueryDto,
  CreateCohortDto,
  InviteMentorDto,
  PublishContentDto,
} from './dto/admin-dashboard.dto.js';
import {
  AdminApplicantsQueryDto,
  AssignApplicantMentorDto,
  ResolveApplicantRiskDto,
} from './dto/admin-applicants.dto.js';
import {
  AdminMentorsQueryDto,
  ContactMentorDto,
  AdminInviteMentorDto,
} from './dto/admin-mentors.dto.js';

@Injectable()
export class AdminService {
  private supabase: SupabaseClient;
  private lastDashboardRefreshedAt: Date = new Date();

  constructor(private readonly emailService: EmailService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  // ==========================================
  // TIME & FORMATTING HELPERS
  // ==========================================
  private formatRelativeAge(dateInput: string | Date): {
    ageLabel: string;
    minutesAgo: number;
    hoursAgo: number;
  } {
    const now = Date.now();
    const ts = new Date(dateInput).getTime();
    const diffMs = Math.max(0, now - ts);
    const minutesAgo = Math.floor(diffMs / 60000);
    const hoursAgo = Math.floor(minutesAgo / 60);

    if (minutesAgo < 60) {
      return {
        ageLabel: `${minutesAgo} min${minutesAgo === 1 ? '' : 's'} ago`,
        minutesAgo,
        hoursAgo,
      };
    }
    if (hoursAgo < 48) {
      return {
        ageLabel: `${hoursAgo} hr${hoursAgo === 1 ? '' : 's'} ago`,
        minutesAgo,
        hoursAgo,
      };
    }
    const daysAgo = Math.floor(hoursAgo / 24);
    return {
      ageLabel: `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`,
      minutesAgo,
      hoursAgo,
    };
  }

  private calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private resolveFilterWindow(query: AdminDashboardQueryDto) {
    const now = new Date();
    const selectedCohortId =
      query.cohortId && query.cohortId !== 'all' ? query.cohortId : null;

    const windowMs = query.hours
      ? query.hours * 60 * 60 * 1000
      : (query.days || 30) * 24 * 60 * 60 * 1000;

    const windowStart = new Date(now.getTime() - windowMs);
    const previousWindowStart = new Date(windowStart.getTime() - windowMs);

    return {
      now,
      selectedCohortId,
      windowStart,
      previousWindowStart,
      filterLabel: query.hours
        ? `Last ${query.hours} hours`
        : `Last ${query.days || 30} days`,
    };
  }

  // ==========================================
  // MAIN ADMIN DASHBOARD AGGREGATOR
  // ==========================================
  async getDashboardOverview(query: AdminDashboardQueryDto) {
    const now = new Date();
    const minsSinceLastUpdate = Math.floor(
      (now.getTime() - this.lastDashboardRefreshedAt.getTime()) / 60000,
    );
    this.lastDashboardRefreshedAt = now;

    const { selectedCohortId, windowStart, previousWindowStart, filterLabel } =
      this.resolveFilterWindow(query);

    const currency = (process.env.PAYMENT_CURRENCY || 'NGN').trim();
    const currentYearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const overdueReviewCutoffIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const pendingAppOverdueCutoff = now.getTime() - 72 * 60 * 60 * 1000;

    // Parallel data queries across Supabase tables
    const [
      cohortsRes,
      tracksRes,
      applicationsRes,
      applicantDetailsRes,
      mentorsRes,
      submissionsRes,
      paymentsRes,
      balancesRes,
      employersRes,
      jobsRes,
      projectsRes,
      auditLogsRes,
    ] = await Promise.all([
      this.supabase.from('cohorts').select('*').order('start_date', { ascending: false }),
      this.supabase.from('tracks').select('*').eq('is_active', true),
      this.supabase.from('applications').select('*').order('created_at', { ascending: false }),
      this.supabase
        .from('applicant_details')
        .select('*, profiles(id, first_name, last_name, email, is_active, updated_at)'),
      this.supabase
        .from('mentors')
        .select('*, profiles(id, first_name, last_name, email)'),
      this.supabase
        .from('mentee_submissions')
        .select('*')
        .order('submitted_at', { ascending: true }),
      this.supabase.from('payments').select('*').order('created_at', { ascending: false }),
      this.supabase.from('applicant_balances').select('*'),
      this.supabase.from('employers').select('*').order('created_at', { ascending: false }),
      this.supabase.from('employer_jobs').select('*'),
      this.supabase.from('projects').select('*'),
      this.supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25),
    ]);

    const allCohorts = cohortsRes.data || [];
    const activeTracks = tracksRes.data || [];
    const allApplications = applicationsRes.data || [];
    const allApplicantDetails = applicantDetailsRes.data || [];
    const allMentors = mentorsRes.data || [];
    const allSubmissions = submissionsRes.data || [];
    const allPayments = paymentsRes.data || [];
    const allBalances = balancesRes.data || [];
    const allEmployers = employersRes.data || [];
    const allJobs = jobsRes.data || [];
    const allProjects = projectsRes.data || [];
    const auditLogs = auditLogsRes.data || [];

    // Apply Cohort Filter
    const cohorts = selectedCohortId
      ? allCohorts.filter((c) => c.id === selectedCohortId)
      : allCohorts;
    const applications = selectedCohortId
      ? allApplications.filter((a) => a.cohort_id === selectedCohortId)
      : allApplications;
    const applicantDetails = selectedCohortId
      ? allApplicantDetails.filter((d) => d.cohort_id === selectedCohortId)
      : allApplicantDetails;
    const payments = selectedCohortId
      ? allPayments.filter((p) => p.cohort_id === selectedCohortId)
      : allPayments;
    const balances = selectedCohortId
      ? allBalances.filter((b) => b.cohort_id === selectedCohortId)
      : allBalances;
    const jobs = selectedCohortId
      ? allJobs.filter((j) => j.cohort_id === selectedCohortId)
      : allJobs;
    const projects = selectedCohortId
      ? allProjects.filter((p) => p.cohort_id === selectedCohortId)
      : allProjects;

    // ------------------------------------------
    // 1. PLATFORM OVERVIEW METRICS
    // ------------------------------------------
    const activeApplicantsCount = applicantDetails.filter(
      (d) => (d.profiles as any)?.is_active !== false,
    ).length;

    const thisMonthApplicants = applicantDetails.filter(
      (d) => new Date(d.created_at) >= currentMonthStart,
    ).length;
    const lastMonthApplicants = applicantDetails.filter((d) => {
      const dt = new Date(d.created_at);
      return dt >= prevMonthStart && dt < currentMonthStart;
    }).length;
    const activeApplicantsChangePercent = this.calculatePercentChange(
      thisMonthApplicants,
      lastMonthApplicants,
    );

    const pendingApplications = applications.filter((a) =>
      ['Submitted', 'Under Review'].includes(a.application_status),
    );
    const overduePendingApplications = pendingApplications.filter(
      (a) => new Date(a.created_at).getTime() < pendingAppOverdueCutoff,
    );

    const activeCohorts = cohorts.filter((c) => c.status === 'Active');
    const cohortCapacities = activeCohorts.map((c) => {
      const enrolled = applicantDetails.filter((d) => d.cohort_id === c.id).length;
      const cap = Number(c.max_capacity || 100);
      return cap > 0 ? Math.min(100, (enrolled / cap) * 100) : 0;
    });
    const averageCohortCapacityPercent =
      cohortCapacities.length > 0
        ? Number(
            (
              cohortCapacities.reduce((sum, val) => sum + val, 0) /
              cohortCapacities.length
            ).toFixed(1),
          )
        : 0;

    const unassignedApplicantsCount = applicantDetails.filter((d) => !d.mentor_id).length;

    // Combine application payments + portal tuition payments
    const successfulAppPayments = applications.filter(
      (a) => a.payment_status === 'Successful',
    );
    const successfulPortalPayments = payments.filter((p) => p.status === 'Successful');

    const getAppFee = (app: any) => {
      const cohort = allCohorts.find((c) => c.id === app.cohort_id);
      return Number(cohort?.fee_amount || 100000);
    };

    const currentPeriodCollected =
      successfulAppPayments
        .filter((a) => new Date(a.paid_at || a.updated_at) >= windowStart)
        .reduce((sum, a) => sum + getAppFee(a), 0) +
      successfulPortalPayments
        .filter((p) => new Date(p.created_at) >= windowStart)
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

    const previousPeriodCollected =
      successfulAppPayments
        .filter((a) => {
          const dt = new Date(a.paid_at || a.updated_at);
          return dt >= previousWindowStart && dt < windowStart;
        })
        .reduce((sum, a) => sum + getAppFee(a), 0) +
      successfulPortalPayments
        .filter((p) => {
          const dt = new Date(p.created_at);
          return dt >= previousWindowStart && dt < windowStart;
        })
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

    const totalPaymentCollected =
      successfulAppPayments.reduce((sum, a) => sum + getAppFee(a), 0) +
      successfulPortalPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

    const paymentCollectedChangePercent = this.calculatePercentChange(
      currentPeriodCollected,
      previousPeriodCollected,
    );

    // ------------------------------------------
    // 2. APPLICATION FUNNEL (Current Cycle / Last 30 Days)
    // ------------------------------------------
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const funnelApps = applications.filter(
      (a) => new Date(a.created_at) >= thirtyDaysAgo,
    );

    const startedCount = funnelApps.length;
    const submittedCount = funnelApps.filter((a) =>
      ['Submitted', 'Under Review', 'Accepted', 'Rejected'].includes(a.application_status),
    ).length;
    const paidCount = funnelApps.filter((a) => a.payment_status === 'Successful').length;
    const acceptedCount = funnelApps.filter(
      (a) => a.application_status === 'Accepted',
    ).length;
    const onboardedCount = applicantDetails.filter(
      (d) =>
        new Date(d.created_at) >= thirtyDaysAgo &&
        ['Onboarding', 'Active'].includes(d.stage),
    ).length;

    const pctOf = (part: number, whole: number) =>
      whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : 0;

    // ------------------------------------------
    // 3. URGENT ACTIONS (Age-based buttons: Review / View / Resolve)
    // ------------------------------------------
    const pendingMentorApps = allMentors
      .filter((m) => m.verification_status === 'Pending')
      .map((m) => {
        const age = this.formatRelativeAge(m.created_at);
        const profile = m.profiles as any;
        return {
          id: m.id,
          category: 'Mentor Application',
          title: `${profile?.first_name || 'Mentor'} ${profile?.last_name || ''} (${m.profession})`.trim(),
          age: age.ageLabel,
          hoursOld: age.hoursAgo,
          actionButton: age.hoursAgo >= 24 ? 'Review' : 'View',
          createdAt: m.created_at,
        };
      });

    const pendingEmployerVerifications = allEmployers
      .filter((e) => e.verification_status === 'Pending')
      .map((e) => {
        const age = this.formatRelativeAge(e.created_at);
        return {
          id: e.id,
          category: 'Employer Verification',
          title: e.company_name,
          age: age.ageLabel,
          hoursOld: age.hoursAgo,
          actionButton: age.hoursAgo >= 24 ? 'Review' : 'View',
          createdAt: e.created_at,
        };
      });

    const overdueProjectReviews = allSubmissions
      .filter(
        (s) =>
          s.status === 'Pending Review' && s.submitted_at < overdueReviewCutoffIso,
      )
      .map((s) => {
        const age = this.formatRelativeAge(s.submitted_at);
        return {
          id: s.id,
          category: 'Overdue Project Review',
          title: s.title,
          age: age.ageLabel,
          hoursOld: age.hoursAgo,
          actionButton: age.hoursAgo >= 72 ? 'Resolve' : 'Review',
          createdAt: s.submitted_at,
        };
      });

    const failedPaymentItems = [
      ...applications
        .filter((a) => a.payment_status === 'Failed')
        .map((a) => {
          const age = this.formatRelativeAge(a.updated_at || a.created_at);
          return {
            id: a.id,
            category: 'Failed Payment',
            title: `${a.first_name} ${a.last_name} (${a.payment_method})`,
            age: age.ageLabel,
            hoursOld: age.hoursAgo,
            actionButton: age.hoursAgo >= 12 ? 'Resolve' : 'View',
            createdAt: a.updated_at || a.created_at,
          };
        }),
      ...payments
        .filter((p) => p.status === 'Unsuccessful')
        .map((p) => {
          const age = this.formatRelativeAge(p.created_at);
          return {
            id: p.id,
            category: 'Failed Payment',
            title: `${p.payment_title} (${p.payment_method})`,
            age: age.ageLabel,
            hoursOld: age.hoursAgo,
            actionButton: age.hoursAgo >= 12 ? 'Resolve' : 'View',
            createdAt: p.created_at,
          };
        }),
    ];

    const urgentActions = {
      counts: {
        mentorApplications: pendingMentorApps.length,
        employerVerifications: pendingEmployerVerifications.length,
        overdueProjectReviews: overdueProjectReviews.length,
        failedPayments: failedPaymentItems.length,
      },
      items: [
        ...pendingMentorApps,
        ...pendingEmployerVerifications,
        ...overdueProjectReviews,
        ...failedPaymentItems,
      ].sort((a, b) => b.hoursOld - a.hoursOld),
    };

    // ------------------------------------------
    // 4. COHORT HEALTH (All Registered Tracks per Cohort)
    // ------------------------------------------
    const cohortHealth = cohorts.map((cohort) => {
      const cohortLearners = allApplicantDetails.filter(
        (d) => d.cohort_id === cohort.id,
      );
      const trackCapPerTrack = Math.max(
        1,
        Math.floor(Number(cohort.max_capacity || 100) / Math.max(1, activeTracks.length)),
      );

      const tracks = activeTracks.map((track) => {
        const trackLearners = cohortLearners.filter(
          (d) =>
            d.profession?.toLowerCase() === track.label.toLowerCase() ||
            d.profession?.toUpperCase() === track.code,
        );
        const enrolledCount = trackLearners.length;
        const spacesRemaining = Math.max(0, trackCapPerTrack - enrolledCount);
        const avgCompletion =
          enrolledCount > 0
            ? Number(
                (
                  trackLearners.reduce(
                    (sum, l) => sum + Number(l.completion_percentage || 0),
                    0,
                  ) / enrolledCount
                ).toFixed(1),
              )
            : 0;
        const atRiskCount = trackLearners.filter(
          (l) => Number(l.completion_percentage || 0) < 40,
        ).length;

        return {
          trackId: track.id,
          trackCode: track.code,
          trackLabel: track.label,
          enrolledCount,
          spacesRemaining,
          completionPercentage: avgCompletion,
          atRiskCount,
        };
      });

      return {
        cohortId: cohort.id,
        cohortName: cohort.name,
        status: cohort.status,
        totalEnrolled: cohortLearners.length,
        maxCapacity: cohort.max_capacity || 100,
        tracks,
      };
    });

    // ------------------------------------------
    // 5. MENTOR CAPACITY
    // ------------------------------------------
    const activeMentorsCount = allMentors.filter(
      (m) => m.is_active && m.verification_status === 'Approved',
    ).length;
    const assignedLearnersCount = applicantDetails.filter((d) => Boolean(d.mentor_id)).length;
    const ratioDenominator =
      activeMentorsCount > 0
        ? Number((assignedLearnersCount / activeMentorsCount).toFixed(1))
        : 0;

    const mentorCapacity = {
      activeMentors: activeMentorsCount,
      unassignedApplicants: unassignedApplicantsCount,
      mentorToMenteeRatio:
        activeMentorsCount > 0 ? `1:${ratioDenominator}` : '0:0',
      overdueFeedbackReviews: overdueProjectReviews.length,
    };

    // ------------------------------------------
    // 6. EMPLOYER ACTIVITY
    // ------------------------------------------
    const verifiedEmployersCount = allEmployers.filter(
      (e) => e.verification_status === 'Verified',
    ).length;
    const activeJobsCount = jobs.filter((j) => j.status === 'Active').length;
    const candidatesUnderReviewCount = jobs.reduce(
      (sum, j) => sum + Number(j.candidates_under_review || 0),
      0,
    );
    const successfulPlacementsCount = jobs.reduce(
      (sum, j) => sum + Number(j.successful_placements || 0),
      0,
    );

    const employerActivity = {
      verifiedEmployers: verifiedEmployersCount,
      activeProjectsAndJobs: activeJobsCount + projects.length,
      activeJobs: activeJobsCount,
      activeProjects: projects.length,
      candidatesUnderReview: candidatesUnderReviewCount,
      successfulPlacements: successfulPlacementsCount,
    };

    // ------------------------------------------
    // 7. PAYMENT SUMMARY (YTD, Outstanding, Failed, Refunds)
    // ------------------------------------------
    const ytdCollected =
      successfulAppPayments
        .filter((a) => (a.paid_at || a.updated_at) >= currentYearStart)
        .reduce((sum, a) => sum + getAppFee(a), 0) +
      successfulPortalPayments
        .filter((p) => p.created_at >= currentYearStart)
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

    const outstandingAmount = balances.reduce(
      (sum, b) => sum + Number(b.outstanding_balance || 0),
      0,
    );

    const failedPaymentsCount =
      applications.filter((a) => a.payment_status === 'Failed').length +
      payments.filter((p) => p.status === 'Unsuccessful').length;

    const totalRefunds = payments.reduce(
      (sum, p) => sum + Number(p.refund_amount || 0),
      0,
    );

    const paymentSummary = {
      currency,
      collectedYearToDate: ytdCollected,
      outstandingAmount,
      failedCount: failedPaymentsCount,
      refundsAmount: totalRefunds,
    };

    // ------------------------------------------
    // 8. OPERATIONAL ALERTS (high / medium / info)
    // ------------------------------------------
    const inactiveLearnersCount = applicantDetails.filter((d) => {
      const profile = d.profiles as any;
      const lastSeen = profile?.updated_at || d.created_at;
      return lastSeen < sevenDaysAgoIso;
    }).length;

    const appEndDateStr = process.env.APPLICATION_END_DATE || '2027-01-03';
    const appEndMs = new Date(`${appEndDateStr}T23:59:59.999Z`).getTime();
    const daysUntilApplicationDeadline = Math.max(
      0,
      Math.ceil((appEndMs - now.getTime()) / (24 * 60 * 60 * 1000)),
    );

    const operationalAlerts = [
      {
        id: 'alert-unassigned-mentors',
        severity: unassignedApplicantsCount >= 10 ? 'high' : unassignedApplicantsCount > 0 ? 'medium' : 'info',
        title: 'Applicants waiting for mentor assignment',
        count: unassignedApplicantsCount,
        message: `${unassignedApplicantsCount} applicant(s) are currently waiting to be paired with a mentor.`,
      },
      {
        id: 'alert-overdue-reviews',
        severity: overdueProjectReviews.length >= 5 ? 'high' : overdueProjectReviews.length > 0 ? 'medium' : 'info',
        title: 'Overdue mentor feedback reviews',
        count: overdueProjectReviews.length,
        message: `${overdueProjectReviews.length} submission(s) have been pending mentor feedback for over 48 hours.`,
      },
      {
        id: 'alert-inactive-learners',
        severity: inactiveLearnersCount >= 10 ? 'medium' : 'info',
        title: 'Inactive learners (7+ days)',
        count: inactiveLearnersCount,
        message: `${inactiveLearnersCount} learner(s) have shown no activity in the past 7 days.`,
      },
      {
        id: 'alert-application-deadline',
        severity: daysUntilApplicationDeadline <= 5 ? 'high' : daysUntilApplicationDeadline <= 14 ? 'medium' : 'info',
        title: 'Application deadline countdown',
        daysRemaining: daysUntilApplicationDeadline,
        deadlineDate: appEndDateStr,
        message: `Current application cycle closes in ${daysUntilApplicationDeadline} day(s) (${appEndDateStr}).`,
      },
    ];

    // ------------------------------------------
    // 9. RECENT ACTIVITY (Audit Logs with mins/hrs age)
    // ------------------------------------------
    const derivedActivities = [
      ...auditLogs.map((log) => ({
        id: log.id,
        type: log.action_type,
        actor: log.actor_name,
        description: log.description,
        timestamp: log.created_at,
        age: this.formatRelativeAge(log.created_at).ageLabel,
      })),
      ...applications
        .filter((a) => a.application_status === 'Submitted')
        .slice(0, 5)
        .map((a) => ({
          id: `app-${a.id}`,
          type: 'APPLICATION_SUBMITTED',
          actor: `${a.first_name} ${a.last_name}`,
          description: `Submitted application for ${a.track || 'program'} (${a.cohort_name || 'Cohort'})`,
          timestamp: a.updated_at || a.created_at,
          age: this.formatRelativeAge(a.updated_at || a.created_at).ageLabel,
        })),
      ...successfulAppPayments.slice(0, 5).map((a) => ({
        id: `pay-${a.id}`,
        type: 'PAYMENT_RECEIVED',
        actor: `${a.first_name} ${a.last_name}`,
        description: `Payment received via ${a.payment_method} (${currency} ${getAppFee(a).toLocaleString()})`,
        timestamp: a.paid_at || a.updated_at,
        age: this.formatRelativeAge(a.paid_at || a.updated_at).ageLabel,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 15);

    return {
      header: {
        filters: {
          selectedCohortId: selectedCohortId || 'all',
          availableCohorts: allCohorts.map((c) => ({ id: c.id, name: c.name })),
          timeWindow: filterLabel,
        },
        minsSinceLastUpdate,
        lastUpdatedAt: this.lastDashboardRefreshedAt.toISOString(),
      },
      platformOverview: {
        activeApplicants: {
          count: activeApplicantsCount,
          changePercent: activeApplicantsChangePercent,
          trend: activeApplicantsChangePercent >= 0 ? 'up' : 'down',
        },
        pendingApplications: {
          count: pendingApplications.length,
          overdueCount: overduePendingApplications.length,
        },
        activeCohorts: {
          count: activeCohorts.length,
          averageCapacityPercent: averageCohortCapacityPercent,
        },
        unassignedApplicants: {
          count: unassignedApplicantsCount,
        },
        paymentCollected: {
          currency,
          totalAmount: totalPaymentCollected,
          periodAmount: currentPeriodCollected,
          changePercent: paymentCollectedChangePercent,
          trend: paymentCollectedChangePercent >= 0 ? 'up' : 'down',
        },
      },
      applicationFunnel: {
        period: 'Last 30 days',
        stages: [
          { stage: 'Started', count: startedCount, conversionPercent: 100 },
          {
            stage: 'Submitted',
            count: submittedCount,
            conversionPercent: pctOf(submittedCount, startedCount),
          },
          {
            stage: 'Paid',
            count: paidCount,
            conversionPercent: pctOf(paidCount, submittedCount),
          },
          {
            stage: 'Accepted',
            count: acceptedCount,
            conversionPercent: pctOf(acceptedCount, paidCount),
          },
          {
            stage: 'Onboarded',
            count: onboardedCount,
            conversionPercent: pctOf(onboardedCount, acceptedCount),
          },
        ],
      },
      urgentActions,
      cohortHealth,
      mentorCapacity,
      employerActivity,
      paymentSummary,
      operationalAlerts,
      recentActivity: derivedActivities,
      quickActions: [
        { id: 'create_cohort', label: 'Create Cohort', endpoint: 'POST /admin/cohorts' },
        { id: 'review_application', label: 'Review Application', endpoint: 'POST /applications/admin/review' },
        { id: 'invite_mentor', label: 'Invite Mentor', endpoint: 'POST /admin/mentors/invite' },
        { id: 'publish_content', label: 'Publish Content', endpoint: 'POST /admin/content/publish' },
      ],
    };
  }

  // ==========================================
  // EXPORT REPORT (CSV)
  // ==========================================
  async exportDashboardReportCsv(query: AdminDashboardQueryDto): Promise<string> {
    const overview = await this.getDashboardOverview(query);
    const rows: string[][] = [
      ['Section', 'Metric', 'Value'],
      ['Overview', 'Active Applicants', String(overview.platformOverview.activeApplicants.count)],
      ['Overview', 'Active Applicants MoM %', `${overview.platformOverview.activeApplicants.changePercent}%`],
      ['Overview', 'Pending Applications', String(overview.platformOverview.pendingApplications.count)],
      ['Overview', 'Overdue Pending Applications', String(overview.platformOverview.pendingApplications.overdueCount)],
      ['Overview', 'Active Cohorts', String(overview.platformOverview.activeCohorts.count)],
      ['Overview', 'Average Cohort Capacity %', `${overview.platformOverview.activeCohorts.averageCapacityPercent}%`],
      ['Overview', 'Unassigned Applicants', String(overview.platformOverview.unassignedApplicants.count)],
      ['Overview', 'Total Payment Collected', `${overview.platformOverview.paymentCollected.currency} ${overview.platformOverview.paymentCollected.totalAmount}`],
      ...overview.applicationFunnel.stages.map((s) => [
        'Application Funnel (30d)',
        s.stage,
        `${s.count} (${s.conversionPercent}%)`,
      ]),
      ['Mentor Capacity', 'Active Mentors', String(overview.mentorCapacity.activeMentors)],
      ['Mentor Capacity', 'Mentor to Mentee Ratio', overview.mentorCapacity.mentorToMenteeRatio],
      ['Mentor Capacity', 'Overdue Feedback Reviews', String(overview.mentorCapacity.overdueFeedbackReviews)],
      ['Employer Activity', 'Verified Employers', String(overview.employerActivity.verifiedEmployers)],
      ['Employer Activity', 'Active Projects & Jobs', String(overview.employerActivity.activeProjectsAndJobs)],
      ['Employer Activity', 'Candidates Under Review', String(overview.employerActivity.candidatesUnderReview)],
      ['Employer Activity', 'Successful Placements', String(overview.employerActivity.successfulPlacements)],
      ['Payment Summary', 'Collected YTD', `${overview.paymentSummary.currency} ${overview.paymentSummary.collectedYearToDate}`],
      ['Payment Summary', 'Outstanding', `${overview.paymentSummary.currency} ${overview.paymentSummary.outstandingAmount}`],
      ['Payment Summary', 'Failed Count', String(overview.paymentSummary.failedCount)],
      ['Payment Summary', 'Refunds', `${overview.paymentSummary.currency} ${overview.paymentSummary.refundsAmount}`],
    ];

    return rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  // ==========================================
  // QUICK ACTIONS
  // ==========================================
  async createCohort(dto: CreateCohortDto, adminName = 'Admin') {
    const { data, error } = await this.supabase
      .from('cohorts')
      .insert({
        name: dto.name,
        start_date: dto.startDate,
        end_date: dto.endDate,
        project_deadline: dto.projectDeadline,
        fee_amount: dto.feeAmount ?? 150000,
        max_capacity: dto.maxCapacity ?? 100,
        status: 'Active',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.supabase.from('admin_audit_logs').insert({
      cohort_id: data.id,
      actor_name: adminName,
      action_type: 'COHORT_CREATED',
      description: `Created new cohort "${data.name}"`,
    });

    return { message: 'Cohort created successfully', cohort: data };
  }

  async inviteMentor(dto: InviteMentorDto, adminName = 'Admin') {
    const frontendUrl = process.env.FRONTEND_URL || 'https://pnafrica.com';
    const inviteLink = `${frontendUrl}/mentor/register?email=${encodeURIComponent(dto.email)}&firstName=${encodeURIComponent(dto.firstName)}&lastName=${encodeURIComponent(dto.lastName)}`;

    await this.emailService.sendEmail(
      dto.email,
      'You are Invited to Join PN Africa as a Mentor',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2>Mentor Invitation - PN Africa</h2>
          <p>Hello ${dto.firstName} ${dto.lastName},</p>
          <p>You have been invited to join <strong>Project Network Africa</strong> as a <strong>${dto.profession}</strong> mentor.</p>
          <p><a href="${inviteLink}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Accept Invitation &amp; Complete Profile</a></p>
        </div>
      `,
    );

    await this.supabase.from('admin_audit_logs').insert({
      actor_name: adminName,
      action_type: 'MENTOR_VERIFIED',
      description: `Invited ${dto.firstName} ${dto.lastName} (${dto.profession}) as a mentor`,
    });

    return { message: `Mentor invitation sent to ${dto.email}`, inviteLink };
  }

  async publishContent(dto: PublishContentDto, adminName = 'Admin') {
    const { data, error } = await this.supabase
      .from('cms_contents')
      .upsert(
        {
          slug: dto.slug,
          section: dto.section,
          title: dto.title,
          subtitle: dto.subtitle || null,
          body: dto.body || null,
          media_url: dto.mediaUrl || null,
          is_published: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' },
      )
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.supabase.from('admin_audit_logs').insert({
      actor_name: adminName,
      action_type: 'CONTENT_PUBLISHED',
      description: `Published content "${data.title}" (${data.section})`,
    });

    return { message: 'Content published successfully', content: data };
  }

  async resolveUrgentAction(
    category: 'mentor' | 'employer' | 'review' | 'payment',
    id: string,
    status: 'Approved' | 'Verified' | 'Rejected' | 'Resolved',
    adminName = 'Admin',
  ) {
    if (category === 'mentor') {
      const { error } = await this.supabase
        .from('mentors')
        .update({ verification_status: status === 'Approved' ? 'Approved' : 'Rejected' })
        .eq('id', id);
      if (error) throw new BadRequestException(error.message);

      await this.supabase.from('admin_audit_logs').insert({
        actor_name: adminName,
        action_type: 'MENTOR_VERIFIED',
        description: `Completed mentor verification (${status}) for mentor ID ${id}`,
      });
      return { message: `Mentor ${status.toLowerCase()}` };
    }

    if (category === 'employer') {
      const { error } = await this.supabase
        .from('employers')
        .update({ verification_status: status === 'Verified' ? 'Verified' : 'Rejected' })
        .eq('id', id);
      if (error) throw new BadRequestException(error.message);

      await this.supabase.from('admin_audit_logs').insert({
        actor_name: adminName,
        action_type: 'ACCOUNT_APPROVED',
        description: `Employer account ${status.toLowerCase()} (ID: ${id})`,
      });
      return { message: `Employer ${status.toLowerCase()}` };
    }

    if (category === 'payment') {
      const { error } = await this.supabase
        .from('applications')
        .update({ payment_status: 'Successful', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new NotFoundException(error.message);

      await this.supabase.from('admin_audit_logs').insert({
        actor_name: adminName,
        action_type: 'PAYMENT_RECEIVED',
        description: `Resolved failed payment for application ID ${id}`,
      });
      return { message: 'Failed payment marked as resolved' };
    }

    throw new BadRequestException('Invalid urgent action category');
  }

  // ==========================================
  // ADMIN APPLICANTS PAGE HELPERS
  // ==========================================
  private normalizeApplicantStage(
    appStatus?: string | null,
    detailsStage?: string | null,
  ): 'Onboarding' | 'Interviewing' | 'Applied' | 'Matched' | 'Review' {
    const dStage = (detailsStage || '').toLowerCase();
    if (dStage === 'onboarding' || dStage === 'active') return 'Onboarding';
    if (dStage === 'interview') return 'Interviewing';
    if (dStage === 'cohort match') return 'Matched';

    const aStatus = (appStatus || '').toLowerCase();
    if (aStatus === 'under review') return 'Review';
    if (aStatus === 'accepted') return 'Matched';
    return 'Applied';
  }

  private normalizePaymentDisplay(
    paymentStatus?: string | null,
  ): 'Paid' | 'Pending' | 'Failed' {
    const status = (paymentStatus || '').toLowerCase();
    if (status === 'successful' || status === 'paid') return 'Paid';
    if (status === 'failed' || status === 'unsuccessful') return 'Failed';
    return 'Pending';
  }

  private computeApplicantRisk(params: {
    paymentStatus: 'Paid' | 'Pending' | 'Failed';
    hasMentor: boolean;
    stage: 'Onboarding' | 'Interviewing' | 'Applied' | 'Matched' | 'Review';
    lastActiveIso: string;
    completionPercentage?: number;
  }): { level: 'Low' | 'Medium' | 'High'; reasons: string[] } {
    const reasons: string[] = [];
    const now = Date.now();
    const inactiveDays = Math.floor(
      (now - new Date(params.lastActiveIso).getTime()) / (24 * 60 * 60 * 1000),
    );

    if (params.paymentStatus === 'Failed') {
      reasons.push('Payment failed');
    }
    if (!params.hasMentor && ['Onboarding', 'Matched', 'Interviewing'].includes(params.stage)) {
      reasons.push('No mentor assigned');
    }
    if (inactiveDays >= 7) {
      reasons.push(`Inactive for ${inactiveDays} days`);
    }
    if (
      params.stage === 'Onboarding' &&
      typeof params.completionPercentage === 'number' &&
      params.completionPercentage < 25 &&
      inactiveDays >= 3
    ) {
      reasons.push('Stalled cohort onboarding');
    }

    if (reasons.length > 0) {
      return { level: 'High', reasons };
    }

    const mediumReasons: string[] = [];
    if (!params.hasMentor) {
      mediumReasons.push('Awaiting mentor assignment');
    }
    if (params.paymentStatus === 'Pending') {
      mediumReasons.push('Payment pending');
    }
    if (inactiveDays >= 3) {
      mediumReasons.push(`Inactive for ${inactiveDays} days`);
    }

    if (mediumReasons.length > 0) {
      return { level: 'Medium', reasons: mediumReasons };
    }

    return { level: 'Low', reasons: [] };
  }

  private formatDateApplied(dateInput: string | Date): string {
    return new Date(dateInput).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // ==========================================
  // ADMIN APPLICANTS PAGE ENDPOINT DATA
  // ==========================================
  async getApplicantsPageData(query: AdminApplicantsQueryDto) {
    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const overdueCutoffMs = now.getTime() - 72 * 60 * 60 * 1000;

    const [
      { data: applications, error: appsError },
      { data: detailsList, error: detailsError },
      { data: cohorts, error: cohortsError },
      { data: tracks, error: tracksError },
      { data: mentors, error: mentorsError },
      { data: profiles, error: profilesError },
    ] = await Promise.all([
      this.supabase.from('applications').select('*').order('created_at', { ascending: false }),
      this.supabase.from('applicant_details').select('*'),
      this.supabase.from('cohorts').select('id, name, start_date, end_date').order('start_date', { ascending: false }),
      this.supabase.from('tracks').select('id, code, label').eq('is_active', true),
      this.supabase.from('mentors').select('id, profile_id, profession'),
      this.supabase.from('profiles').select('id, first_name, last_name, email, updated_at, is_active'),
    ]);

    if (appsError) throw new BadRequestException(appsError.message);
    if (detailsError) throw new BadRequestException(detailsError.message);
    if (cohortsError) throw new BadRequestException(cohortsError.message);
    if (tracksError) throw new BadRequestException(tracksError.message);
    if (mentorsError) throw new BadRequestException(mentorsError.message);
    if (profilesError) throw new BadRequestException(profilesError.message);

    const detailsByProfileId = new Map<string, any>();
    for (const d of detailsList || []) {
      detailsByProfileId.set(d.profile_id, d);
    }

    const profilesById = new Map<string, any>();
    for (const p of profiles || []) {
      profilesById.set(p.id, p);
    }

    const cohortsById = new Map<string, any>();
    for (const c of cohorts || []) {
      cohortsById.set(c.id, c);
    }

    const tracksByCodeOrLabel = new Map<string, string>();
    for (const t of tracks || []) {
      tracksByCodeOrLabel.set(t.code.toUpperCase(), t.label);
      tracksByCodeOrLabel.set(t.label.toLowerCase(), t.label);
    }

    const mentorNameById = new Map<string, string>();
    for (const m of mentors || []) {
      const prof = profilesById.get(m.profile_id);
      const fullName = prof
        ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim()
        : `Mentor (${m.profession})`;
      mentorNameById.set(m.id, fullName || 'Assigned Mentor');
    }

    // Build normalized rows from applications + any enrolled applicant_details without a row
    const seenProfileIds = new Set<string>();
    const combinedRows = (applications || []).map((app: any) => {
      if (app.profile_id) seenProfileIds.add(app.profile_id);

      const details = app.profile_id ? detailsByProfileId.get(app.profile_id) : null;
      const profile = app.profile_id ? profilesById.get(app.profile_id) : null;
      const cohort = app.cohort_id ? cohortsById.get(app.cohort_id) : null;

      const rawTrack = app.track || details?.profession || 'Unassigned Track';
      const programLabel =
        tracksByCodeOrLabel.get(String(rawTrack).toUpperCase()) ||
        tracksByCodeOrLabel.get(String(rawTrack).toLowerCase()) ||
        rawTrack;

      const cohortName =
        cohort?.name || app.cohort_name || 'Unassigned Cohort';

      const stage = this.normalizeApplicantStage(
        app.application_status,
        details?.stage,
      );
      const payment = this.normalizePaymentDisplay(app.payment_status);

      const mentorId = details?.mentor_id || null;
      const mentorName = mentorId
        ? mentorNameById.get(mentorId) || 'Assigned Mentor'
        : null;

      const lastActiveIso =
        profile?.updated_at || app.updated_at || app.created_at;

      const risk = this.computeApplicantRisk({
        paymentStatus: payment,
        hasMentor: Boolean(mentorId),
        stage,
        lastActiveIso,
        completionPercentage:
          details?.completion_percentage !== undefined
            ? Number(details.completion_percentage)
            : undefined,
      });

      const actions: Array<'View' | 'Assign' | 'Resolve'> = ['View'];
      if (!mentorId) {
        actions.push('Assign');
      }
      if (risk.level === 'High') {
        actions.push('Resolve');
      }

      return {
        id: app.id,
        profileId: app.profile_id || null,
        applicantName: `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Unnamed Applicant',
        email: app.email,
        phoneNumber: app.phone_number,
        country: app.country,
        referenceCode: app.reference_code,
        program: programLabel,
        programCode: app.track || null,
        cohortId: app.cohort_id || null,
        cohort: cohortName,
        stage,
        rawApplicationStatus: app.application_status,
        payment,
        mentorId,
        mentor: mentorName || 'Unassigned',
        appliedDate: this.formatDateApplied(app.created_at),
        createdAt: app.created_at,
        risk: risk.level,
        riskReasons: risk.reasons,
        actions,
        portfolioLink: app.portfolio_link || details?.portfolio_link || null,
        linkedinLink: app.linkedin_link || details?.linkedin_link || null,
        resumeUrl: app.resume_url || details?.resume_url || null,
        whyJoin: app.why_join || null,
      };
    });

    for (const d of detailsList || []) {
      if (seenProfileIds.has(d.profile_id)) continue;
      const profile = profilesById.get(d.profile_id);
      const cohort = d.cohort_id ? cohortsById.get(d.cohort_id) : null;
      const stage = this.normalizeApplicantStage(null, d.stage);
      const payment: 'Paid' | 'Pending' | 'Failed' = 'Paid';
      const mentorId = d.mentor_id || null;
      const mentorName = mentorId
        ? mentorNameById.get(mentorId) || 'Assigned Mentor'
        : null;
      const lastActiveIso = profile?.updated_at || d.created_at;
      const risk = this.computeApplicantRisk({
        paymentStatus: payment,
        hasMentor: Boolean(mentorId),
        stage,
        lastActiveIso,
        completionPercentage: Number(d.completion_percentage || 0),
      });

      const actions: Array<'View' | 'Assign' | 'Resolve'> = ['View'];
      if (!mentorId) actions.push('Assign');
      if (risk.level === 'High') actions.push('Resolve');

      combinedRows.push({
        id: d.id,
        profileId: d.profile_id,
        applicantName: profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : 'Enrolled Applicant',
        email: profile?.email || '',
        phoneNumber: d.phone_number || null,
        country: d.location || null,
        referenceCode: null,
        program: d.profession,
        programCode: null,
        cohortId: d.cohort_id || null,
        cohort: cohort?.name || 'Unassigned Cohort',
        stage,
        rawApplicationStatus: d.stage,
        payment,
        mentorId,
        mentor: mentorName || 'Unassigned',
        appliedDate: this.formatDateApplied(d.created_at),
        createdAt: d.created_at,
        risk: risk.level,
        riskReasons: risk.reasons,
        actions,
        portfolioLink: d.portfolio_link || null,
        linkedinLink: d.linkedin_link || null,
        resumeUrl: d.resume_url || null,
        whyJoin: null,
      });
    }

    // Top Metrics (calculated across full applicant pool)
    const totalApplicants = combinedRows.length;
    const thisMonthCount = combinedRows.filter(
      (r) => new Date(r.createdAt) >= currentMonthStart,
    ).length;
    const lastMonthCount = combinedRows.filter((r) => {
      const dt = new Date(r.createdAt);
      return dt >= prevMonthStart && dt < currentMonthStart;
    }).length;
    const totalApplicantsChangePercent = this.calculatePercentChange(
      thisMonthCount,
      lastMonthCount,
    );

    const awaitingReviewRows = combinedRows.filter(
      (r) => r.stage === 'Review' || r.rawApplicationStatus === 'Submitted',
    );
    const awaitingReviewOverdueCount = awaitingReviewRows.filter(
      (r) => new Date(r.createdAt).getTime() < overdueCutoffMs,
    ).length;

    const unassignedCount = combinedRows.filter((r) => !r.mentorId).length;
    const highRiskCount = combinedRows.filter((r) => r.risk === 'High').length;

    // Apply Search & Filters
    const searchTerm = (query.search || '').trim().toLowerCase();
    const programFilter = (query.program || 'all').trim();
    const cohortFilter = (query.cohortId || 'all').trim();
    const stageFilter = (query.stage || 'all').trim();

    const filteredApplicants = combinedRows.filter((row) => {
      if (searchTerm) {
        const hay = [
          row.applicantName,
          row.email,
          row.phoneNumber || '',
          row.program,
          row.cohort,
          row.stage,
          row.mentor,
          row.referenceCode || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }

      if (programFilter && programFilter.toLowerCase() !== 'all') {
        const pLower = programFilter.toLowerCase();
        const matchesProgram =
          row.program.toLowerCase() === pLower ||
          (row.programCode && row.programCode.toLowerCase() === pLower) ||
          row.cohort.toLowerCase() === pLower;
        if (!matchesProgram) return false;
      }

      if (cohortFilter && cohortFilter.toLowerCase() !== 'all') {
        if (row.cohortId !== cohortFilter) return false;
      }

      if (stageFilter && stageFilter.toLowerCase() !== 'all') {
        if (row.stage.toLowerCase() !== stageFilter.toLowerCase()) return false;
      }

      return true;
    });

    return {
      metrics: {
        totalApplicants: {
          count: totalApplicants,
          changePercent: totalApplicantsChangePercent,
          trend: totalApplicantsChangePercent >= 0 ? 'up' : 'down',
        },
        awaitingReview: {
          count: awaitingReviewRows.length,
          overdueCount: awaitingReviewOverdueCount,
        },
        unassigned: {
          count: unassignedCount,
        },
        highRiskApplicants: {
          count: highRiskCount,
        },
      },
      filters: {
        search: query.search || '',
        program: programFilter,
        cohortId: cohortFilter,
        stage: stageFilter,
        availablePrograms: (tracks || []).map((t: any) => ({
          code: t.code,
          label: t.label,
        })),
        availableCohorts: (cohorts || []).map((c: any) => ({
          id: c.id,
          name: c.name,
        })),
        availableStages: [
          'Onboarding',
          'Interviewing',
          'Applied',
          'Matched',
          'Review',
        ],
      },
      totalFiltered: filteredApplicants.length,
      applicants: filteredApplicants,
    };
  }

  async getApplicantDetailById(id: string) {
    const { data: app } = await this.supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (app) {
      const details = app.profile_id
        ? (
            await this.supabase
              .from('applicant_details')
              .select('*')
              .eq('profile_id', app.profile_id)
              .maybeSingle()
          ).data
        : null;

      return { application: app, details };
    }

    const { data: details } = await this.supabase
      .from('applicant_details')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!details) {
      throw new NotFoundException(`Applicant with ID "${id}" not found`);
    }

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', details.profile_id)
      .maybeSingle();

    return { profile, details };
  }

  async assignMentorToApplicant(
    applicantId: string,
    dto: AssignApplicantMentorDto,
    adminName = 'Admin',
  ) {
    const { data: mentor, error: mentorError } = await this.supabase
      .from('mentors')
      .select('id, profile_id, profession')
      .eq('id', dto.mentorId)
      .maybeSingle();

    if (mentorError || !mentor) {
      throw new NotFoundException('Mentor not found');
    }

    let profileId: string | null = null;
    let cohortId: string | null = null;
    let profession = 'Applicant';

    const { data: app } = await this.supabase
      .from('applications')
      .select('*')
      .eq('id', applicantId)
      .maybeSingle();

    if (app) {
      profileId = app.profile_id;
      cohortId = app.cohort_id;
      profession = app.track || 'Applicant';
    } else {
      const { data: details } = await this.supabase
        .from('applicant_details')
        .select('*')
        .eq('id', applicantId)
        .maybeSingle();
      if (!details) {
        throw new NotFoundException('Applicant not found');
      }
      profileId = details.profile_id;
      cohortId = details.cohort_id;
      profession = details.profession || 'Applicant';
    }

    if (!profileId) {
      throw new BadRequestException(
        'Applicant does not have a linked user profile yet; complete registration/acceptance first.',
      );
    }

    const { data: existingDetails } = await this.supabase
      .from('applicant_details')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (existingDetails) {
      const { error } = await this.supabase
        .from('applicant_details')
        .update({ mentor_id: mentor.id })
        .eq('profile_id', profileId);
      if (error) throw new BadRequestException(error.message);
    } else {
      const { error } = await this.supabase
        .from('applicant_details')
        .insert({
          profile_id: profileId,
          profession,
          cohort_id: cohortId,
          mentor_id: mentor.id,
          stage: 'Onboarding',
        });
      if (error) throw new BadRequestException(error.message);
    }

    await this.supabase.from('notifications').insert({
      profile_id: profileId,
      title: 'Mentor Assigned',
      message: 'A mentor has been assigned to guide your cohort progress.',
      type: 'mentor',
    });

    await this.supabase.from('admin_audit_logs').insert({
      cohort_id: cohortId,
      actor_name: adminName,
      action_type: 'ACCOUNT_APPROVED',
      description: `Assigned mentor (${mentor.id}) to applicant profile ${profileId}`,
    });

    return {
      message: 'Mentor assigned successfully',
      applicantId,
      profileId,
      mentorId: mentor.id,
    };
  }

  async resolveApplicantRisk(
    applicantId: string,
    dto: ResolveApplicantRiskDto,
    adminName = 'Admin',
  ) {
    const { data: app } = await this.supabase
      .from('applications')
      .select('*')
      .eq('id', applicantId)
      .maybeSingle();

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const nowIso = new Date().toISOString();

    if (dto.resolutionType === 'MARK_PAYMENT_PAID') {
      const { error } = await this.supabase
        .from('applications')
        .update({
          payment_status: 'Successful',
          paid_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', app.id);
      if (error) throw new BadRequestException(error.message);
    } else if (dto.resolutionType === 'ADVANCE_STAGE') {
      const { error } = await this.supabase
        .from('applications')
        .update({
          application_status: 'Accepted',
          updated_at: nowIso,
        })
        .eq('id', app.id);
      if (error) throw new BadRequestException(error.message);

      if (app.profile_id) {
        await this.supabase
          .from('applicant_details')
          .update({ stage: 'Onboarding', onboarding_at: nowIso })
          .eq('profile_id', app.profile_id);
      }
    } else if (dto.resolutionType === 'REJECT_APPLICATION') {
      const { error } = await this.supabase
        .from('applications')
        .update({
          application_status: 'Rejected',
          updated_at: nowIso,
        })
        .eq('id', app.id);
      if (error) throw new BadRequestException(error.message);
    } else {
      const { error } = await this.supabase
        .from('applications')
        .update({ updated_at: nowIso })
        .eq('id', app.id);
      if (error) throw new BadRequestException(error.message);
    }

    await this.supabase.from('admin_audit_logs').insert({
      cohort_id: app.cohort_id,
      actor_name: adminName,
      action_type: 'ACCOUNT_APPROVED',
      description: `Resolved high risk (${dto.resolutionType}) for ${app.first_name} ${app.last_name}${
        dto.notes ? `: ${dto.notes}` : ''
      }`,
    });

    return {
      message: 'Applicant risk action resolved',
      applicantId: app.id,
      resolutionType: dto.resolutionType,
    };
  }

  async exportApplicantsCsv(query: AdminApplicantsQueryDto): Promise<string> {
    const data = await this.getApplicantsPageData(query);
    const header = [
      'Applicant',
      'Email',
      'Programme',
      'Cohort',
      'Stage',
      'Payment',
      'Mentor',
      'Applied',
      'Risk',
      'Risk Reasons',
    ];

    const rows = data.applicants.map((a) => [
      a.applicantName,
      a.email,
      a.program,
      a.cohort,
      a.stage,
      a.payment,
      a.mentor,
      a.appliedDate,
      a.risk,
      a.riskReasons.join('; '),
    ]);

    return [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  // ==========================================
  // ADMIN MENTORS PAGE HELPERS
  // ==========================================
  private computeMentorAvailability(params: {
    isActive: boolean;
    verificationStatus: string;
    menteesCount: number;
    capacity: number;
  }): 'Available' | 'Limited' | 'Full' | 'Inactive' {
    if (!params.isActive || params.verificationStatus !== 'Approved') {
      return 'Inactive';
    }
    const safeCap = Math.max(1, params.capacity);
    if (params.menteesCount >= safeCap) return 'Full';
    if (params.menteesCount / safeCap >= 0.75) return 'Limited';
    return 'Available';
  }

  private formatLastActive(dateInput?: string | Date | null): string {
    if (!dateInput) return 'N/A';
    const diffMs = Math.max(0, Date.now() - new Date(dateInput).getTime());
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  // ==========================================
  // ADMIN MENTORS PAGE ENDPOINT DATA
  // ==========================================
  async getMentorsPageData(query: AdminMentorsQueryDto) {
    const now = Date.now();
    const overdueCutoffMs = now - 48 * 60 * 60 * 1000;

    const [
      { data: mentors, error: mentorsError },
      { data: profiles, error: profilesError },
      { data: applicantDetails, error: detailsError },
      { data: submissions, error: submissionsError },
      { data: activities, error: activitiesError },
    ] = await Promise.all([
      this.supabase.from('mentors').select('*').order('created_at', { ascending: false }),
      this.supabase.from('profiles').select('id, first_name, last_name, email, updated_at, is_active'),
      this.supabase.from('applicant_details').select('id, profile_id, mentor_id, profession, stage'),
      this.supabase
        .from('mentee_submissions')
        .select('id, mentor_id, mentee_id, title, status, submitted_at, reviewed_at')
        .order('submitted_at', { ascending: true }),
      this.supabase
        .from('mentor_activities')
        .select('id, mentor_id, created_at')
        .order('created_at', { ascending: false }),
    ]);

    if (mentorsError) throw new BadRequestException(mentorsError.message);
    if (profilesError) throw new BadRequestException(profilesError.message);
    if (detailsError) throw new BadRequestException(detailsError.message);
    if (submissionsError) throw new BadRequestException(submissionsError.message);
    if (activitiesError) throw new BadRequestException(activitiesError.message);

    const profilesById = new Map<string, any>();
    for (const p of profiles || []) {
      profilesById.set(p.id, p);
    }

    const menteesByMentorId = new Map<string, number>();
    let unassignedApplicantsCount = 0;
    for (const d of applicantDetails || []) {
      if (d.mentor_id) {
        menteesByMentorId.set(d.mentor_id, (menteesByMentorId.get(d.mentor_id) || 0) + 1);
      } else {
        unassignedApplicantsCount += 1;
      }
    }

    const overdueSubsByMentorId = new Map<string, number>();
    let totalOverdueReviews = 0;
    let oldestOverdueDays = 0;

    for (const s of submissions || []) {
      if (s.status === 'Pending Review') {
        const subTime = new Date(s.submitted_at).getTime();
        if (subTime < overdueCutoffMs) {
          totalOverdueReviews += 1;
          overdueSubsByMentorId.set(
            s.mentor_id,
            (overdueSubsByMentorId.get(s.mentor_id) || 0) + 1,
          );
          const daysOld = Math.max(
            1,
            Math.floor((now - subTime) / (24 * 60 * 60 * 1000)),
          );
          if (daysOld > oldestOverdueDays) {
            oldestOverdueDays = daysOld;
          }
        }
      }
    }

    const latestActivityByMentorId = new Map<string, string>();
    for (const act of activities || []) {
      if (!latestActivityByMentorId.has(act.mentor_id)) {
        latestActivityByMentorId.set(act.mentor_id, act.created_at);
      }
    }

    const mentorRows = (mentors || []).map((m: any) => {
      const profile = profilesById.get(m.profile_id);
      const mentorName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : 'Unnamed Mentor';
      const email = profile?.email || '';
      const isActive =
        m.is_active !== false && (profile ? profile.is_active !== false : true);
      const verificationStatus = m.verification_status || 'Approved';
      const verificationDisplay: 'Verified' | 'Pending' =
        verificationStatus === 'Approved' ? 'Verified' : 'Pending';

      const menteesCount = menteesByMentorId.get(m.id) || 0;
      const capacity = Number(m.max_capacity || 10);
      const availability = this.computeMentorAvailability({
        isActive,
        verificationStatus,
        menteesCount,
        capacity,
      });

      const overdueCount = overdueSubsByMentorId.get(m.id) || 0;
      const rating = Number(m.rating ?? 4.8);
      const ratingsCount = Number(m.ratings_count ?? 0);

      const lastActiveTimestamp =
        latestActivityByMentorId.get(m.id) ||
        m.last_active_at ||
        profile?.updated_at ||
        m.created_at;

      return {
        id: m.id,
        profileId: m.profile_id,
        mentorName: mentorName || 'Unnamed Mentor',
        email,
        expertise: m.profession,
        bio: m.bio || '',
        availability,
        mentees: menteesCount,
        capacity,
        verification: verificationDisplay,
        rating: Number(rating.toFixed(1)),
        ratingsCount,
        overdue: overdueCount,
        lastActive: this.formatLastActive(lastActiveTimestamp),
        lastActiveAt: lastActiveTimestamp,
        actions: ['View', 'Review', 'Contact'] as Array<'View' | 'Review' | 'Contact'>,
      };
    });

    // Top Metrics
    const activeMentorsList = mentorRows.filter(
      (r) => r.availability !== 'Inactive' && r.verification === 'Verified',
    );
    const availableMentorsCount = mentorRows.filter(
      (r) => r.availability === 'Available',
    ).length;

    const ratedMentors = mentorRows.filter((r) => r.rating > 0);
    const averageRating =
      ratedMentors.length > 0
        ? Number(
            (
              ratedMentors.reduce((sum, r) => sum + r.rating, 0) / ratedMentors.length
            ).toFixed(1),
          )
        : 0;

    // Apply Search & Filters
    const searchTerm = (query.search || '').trim().toLowerCase();
    const expertiseFilter = (query.expertise || 'all').trim().toLowerCase();
    const availabilityFilter = (query.availability || 'all').trim().toLowerCase();
    const verificationFilter = (query.verification || 'all').trim().toLowerCase();

    const filteredMentors = mentorRows.filter((row) => {
      if (searchTerm) {
        const hay = `${row.mentorName} ${row.email} ${row.expertise} ${row.bio}`.toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }

      if (expertiseFilter && expertiseFilter !== 'all') {
        if (row.expertise.toLowerCase() !== expertiseFilter) return false;
      }

      if (availabilityFilter && availabilityFilter !== 'all') {
        if (row.availability.toLowerCase() !== availabilityFilter) return false;
      }

      if (verificationFilter && verificationFilter !== 'all') {
        if (row.verification.toLowerCase() !== verificationFilter) return false;
      }

      return true;
    });

    const uniqueExpertise = Array.from(
      new Set(mentorRows.map((m) => m.expertise).filter(Boolean)),
    );

    return {
      metrics: {
        activeMentors: {
          count: activeMentorsList.length,
          availableCount: availableMentorsCount,
        },
        unassignedApplicants: {
          count: unassignedApplicantsCount,
        },
        overdueReviews: {
          count: totalOverdueReviews,
          oldestDays: oldestOverdueDays,
        },
        averageRatings: {
          rating: averageRating,
          acrossMentorsCount: ratedMentors.length,
        },
      },
      filters: {
        search: query.search || '',
        expertise: query.expertise || 'all',
        availability: query.availability || 'all',
        verification: query.verification || 'all',
        availableExpertise: uniqueExpertise,
        availableAvailability: ['Available', 'Limited', 'Full', 'Inactive'],
        availableVerification: ['Verified', 'Pending'],
      },
      actions: {
        exportCsvEndpoint: '/admin/mentors/export',
        inviteMentorEndpoint: '/admin/mentors/invite',
      },
      totalFiltered: filteredMentors.length,
      mentors: filteredMentors,
    };
  }

  async getMentorDetailById(mentorId: string) {
    const { data: mentor, error } = await this.supabase
      .from('mentors')
      .select('*')
      .eq('id', mentorId)
      .maybeSingle();

    if (error || !mentor) {
      throw new NotFoundException('Mentor not found');
    }

    const [{ data: profile }, { data: mentees }, { data: submissions }] = await Promise.all([
      this.supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, is_active, updated_at')
        .eq('id', mentor.profile_id)
        .maybeSingle(),
      this.supabase
        .from('applicant_details')
        .select('id, profile_id, profession, stage, completion_percentage')
        .eq('mentor_id', mentor.id),
      this.supabase
        .from('mentee_submissions')
        .select('*')
        .eq('mentor_id', mentor.id)
        .order('submitted_at', { ascending: false }),
    ]);

    return {
      mentor,
      profile,
      mentees: mentees || [],
      submissions: submissions || [],
    };
  }

  async reviewMentorSubmission(
    mentorId: string,
    submissionId: string,
    status: 'Reviewed' | 'Validated',
    reviewFeedback?: string,
    adminName = 'Admin',
  ) {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('mentee_submissions')
      .update({
        status,
        review_feedback: reviewFeedback || `Reviewed by ${adminName}`,
        reviewed_at: nowIso,
      })
      .eq('id', submissionId)
      .eq('mentor_id', mentorId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Submission not found for this mentor');
    }

    await this.supabase.from('admin_audit_logs').insert({
      actor_name: adminName,
      action_type: 'MENTOR_VERIFIED',
      description: `Marked submission "${data.title}" (${submissionId}) as ${status}`,
    });

    return { message: 'Mentor review updated', submission: data };
  }

  async contactMentor(
    mentorId: string,
    dto: ContactMentorDto,
    adminName = 'Admin',
  ) {
    const { data: mentor, error } = await this.supabase
      .from('mentors')
      .select('id, profile_id')
      .eq('id', mentorId)
      .maybeSingle();

    if (error || !mentor) {
      throw new NotFoundException('Mentor not found');
    }

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', mentor.profile_id)
      .maybeSingle();

    await this.supabase.from('notifications').insert({
      profile_id: mentor.profile_id,
      title: dto.subject,
      message: dto.message,
      type: 'mentor',
    });

    if (profile?.email) {
      await this.emailService.sendEmail(
        profile.email,
        `PN Africa Admin: ${dto.subject}`,
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h3>${dto.subject}</h3>
            <p>Hello ${profile.first_name || 'Mentor'},</p>
            <p>${dto.message}</p>
          </div>
        `,
      );
    }

    await this.supabase.from('admin_audit_logs').insert({
      actor_name: adminName,
      action_type: 'MENTOR_VERIFIED',
      description: `Sent message ("${dto.subject}") to mentor ${profile?.email || mentor.id}`,
    });

    return {
      message: 'Message sent to mentor',
      mentorId: mentor.id,
      recipientEmail: profile?.email || null,
    };
  }

  async exportMentorsCsv(query: AdminMentorsQueryDto): Promise<string> {
    const data = await this.getMentorsPageData(query);
    const header = [
      'Mentor',
      'Email',
      'Expertise',
      'Availability',
      'Mentees',
      'Capacity',
      'Verification',
      'Rating',
      'Overdue',
      'Last Active',
    ];

    const rows = data.mentors.map((m) => [
      m.mentorName,
      m.email,
      m.expertise,
      m.availability,
      String(m.mentees),
      String(m.capacity),
      m.verification,
      String(m.rating),
      String(m.overdue),
      m.lastActive,
    ]);

    return [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }
}