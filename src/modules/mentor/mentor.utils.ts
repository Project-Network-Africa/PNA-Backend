export const ON_TRACK_THRESHOLD = 40;

export function menteeStatus(completion: number): 'On Track' | 'Needs Attention' {
  return completion >= ON_TRACK_THRESHOLD ? 'On Track' : 'Needs Attention';
}

export function fullName(p: { first_name?: string | null; last_name?: string | null } | null | undefined): string {
  return `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
}

export function timeAgo(dateString: string | null | undefined, now = Date.now()): string {
  if (!dateString) return 'No activity yet';
  const diffMins = Math.max(1, Math.floor((now - new Date(dateString).getTime()) / 60000));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/** Monday 00:00 UTC of the week containing `d`. */
export function startOfIsoWeek(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7; // Mon = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

type ProgressRow = { old_percentage: number | string; new_percentage: number | string; recorded_at: string };

/**
 * Change in completion % since the start of the month.
 * Baseline = last recorded value before the month, else the value before this month's first change.
 * `rows` must be sorted by recorded_at ascending.
 */
export function monthlyProgressDelta(rows: ProgressRow[], current: number, monthStart: Date): number {
  const ms = monthStart.getTime();
  let baseline = current;
  const before = rows.filter((r) => new Date(r.recorded_at).getTime() < ms);
  if (before.length) baseline = Number(before[before.length - 1].new_percentage);
  else if (rows.length) baseline = Number(rows[0].old_percentage);
  return Math.round(current - baseline);
}

/** Current week (1-based, clamped) and total weeks of a cohort. Null when dates are missing. */
export function cohortWeeks(start: string | null | undefined, end: string | null | undefined, now = new Date()) {
  if (!start || !end) return null;
  const WEEK = 7 * 24 * 3600 * 1000;
  const s = new Date(start).getTime();
  const totalWeeks = Math.max(1, Math.ceil((new Date(end).getTime() - s) / WEEK));
  const currentWeek = Math.min(totalWeeks, Math.max(1, Math.floor((now.getTime() - s) / WEEK) + 1));
  return { currentWeek, totalWeeks };
}
