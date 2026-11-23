import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../email/email.service.js';
import {
  AdminDashboardQueryDto,
  CreateCohortDto,
  InviteMentorDto,
  PublishContentDto,
} from './dto/admin-dashboard.dto.js';

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
}