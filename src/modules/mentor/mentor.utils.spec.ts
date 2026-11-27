import { cohortWeeks, menteeStatus, monthlyProgressDelta, startOfIsoWeek } from './mentor.utils.js';

const month = new Date('2026-08-01T00:00:00Z');

describe('monthlyProgressDelta', () => {
  it('uses the last value recorded before the month as baseline', () => {
    const rows = [
      { old_percentage: 0, new_percentage: 50, recorded_at: '2026-07-10T00:00:00Z' },
      { old_percentage: 50, new_percentage: 56, recorded_at: '2026-07-30T00:00:00Z' },
      { old_percentage: 56, new_percentage: 68, recorded_at: '2026-08-05T00:00:00Z' },
    ];
    expect(monthlyProgressDelta(rows, 68, month)).toBe(12);
  });

  it('falls back to the old value of the first change this month', () => {
    const rows = [{ old_percentage: 45, new_percentage: 41, recorded_at: '2026-08-03T00:00:00Z' }];
    expect(monthlyProgressDelta(rows, 41, month)).toBe(-4);
  });

  it('is 0 with no history', () => {
    expect(monthlyProgressDelta([], 70, month)).toBe(0);
  });
});

describe('startOfIsoWeek', () => {
  it('returns Monday for a Sunday', () => {
    expect(startOfIsoWeek(new Date('2026-08-09T15:00:00Z')).toISOString()).toBe('2026-08-03T00:00:00.000Z');
  });
});

describe('cohortWeeks', () => {
  it('computes week 8 of 12', () => {
    expect(cohortWeeks('2026-06-01', '2026-08-24', new Date('2026-07-21T00:00:00Z'))).toEqual({ currentWeek: 8, totalWeeks: 12 });
  });
  it('clamps before start and after end', () => {
    expect(cohortWeeks('2026-06-01', '2026-08-24', new Date('2026-05-01'))?.currentWeek).toBe(1);
    expect(cohortWeeks('2026-06-01', '2026-08-24', new Date('2026-12-01'))?.currentWeek).toBe(12);
  });
});

describe('menteeStatus', () => {
  it('flags below 40% as needing attention', () => {
    expect(menteeStatus(39)).toBe('Needs Attention');
    expect(menteeStatus(40)).toBe('On Track');
  });
});
