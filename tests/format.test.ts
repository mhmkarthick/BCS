/**
 * Date, time and string formatting tests.
 *
 * These helpers are the app's only source of "human readable" dates, so the
 * exact output matters for visual fidelity.
 */

import {
  digits,
  fmtDate,
  fmtStamp,
  fmtTime,
  greeting,
  initials,
  lastDigits,
  nowStamp,
  relativeDay,
  shiftISO,
  toISODate,
  toNumber,
  uid,
} from '../src/utils/format';

describe('toISODate / todayISO / shiftISO', () => {
  it('formats a date as yyyy-MM-dd', () => {
    expect(toISODate(new Date(2026, 2, 5))).toBe('2026-03-05');
  });

  it('shifts by whole days', () => {
    const base = new Date(2026, 2, 5);
    expect(shiftISO(0, base)).toBe('2026-03-05');
    expect(shiftISO(1, base)).toBe('2026-03-06');
    expect(shiftISO(-1, base)).toBe('2026-03-04');
    expect(shiftISO(30, base)).toBe('2026-04-04');
  });
});

describe('fmtDate', () => {
  it('uses the requested pattern', () => {
    expect(fmtDate('2026-03-05', 'd MMM yyyy')).toBe('5 Mar 2026');
    expect(fmtDate('2026-03-05', 'EEE, d MMM')).toBe('Thu, 5 Mar');
    expect(fmtDate('2026-03-05', 'dd/MM/yyyy')).toBe('05/03/2026');
  });

  it('defaults to the long form', () => {
    expect(fmtDate('2026-03-05')).toBe('5 Mar 2026');
  });
});

describe('fmtTime', () => {
  it('renders a 12-hour clock', () => {
    expect(fmtTime('09:30')).toBe('9:30 am');
    expect(fmtTime('13:05')).toBe('1:05 pm');
    expect(fmtTime('00:00')).toBe('12:00 am');
    expect(fmtTime('12:00')).toBe('12:00 pm');
    expect(fmtTime('23:59')).toBe('11:59 pm');
  });

  it('is empty for a missing time', () => {
    expect(fmtTime()).toBe('');
    expect(fmtTime('')).toBe('');
  });
});

describe('fmtStamp', () => {
  it('renders a timestamp as "4 Nov, 6:30 pm"', () => {
    // The exact clock time depends on the device timezone, so only the shape
    // of the output is pinned here.
    const stamp = fmtStamp('2026-11-04T18:30:00.000Z');
    expect(stamp).toMatch(/^\d{1,2} [A-Z][a-z]{2}, \d{1,2}:\d{2} (AM|PM)$/);
  });
});

describe('relativeDay', () => {
  it('labels today, tomorrow and yesterday', () => {
    expect(relativeDay(toISODate(new Date()))).toBe('Today');
    expect(relativeDay(shiftISO(1))).toBe('Tomorrow');
    expect(relativeDay(shiftISO(-1))).toBe('Yesterday');
  });

  it('uses the full weekday name inside the coming week', () => {
    // 3 days away is always a weekday name, exactly like the reference.
    expect(relativeDay(shiftISO(3))).toMatch(
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/,
    );
  });

  it('falls back to a short date further out', () => {
    expect(relativeDay(shiftISO(40))).toMatch(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} [A-Z][a-z]{2}$/,
    );
  });
});

describe('greeting', () => {
  it('greets according to the hour', () => {
    expect(greeting(new Date(2026, 0, 1, 9))).toBe('Good morning!');
    expect(greeting(new Date(2026, 0, 1, 13))).toBe('Good afternoon!');
    expect(greeting(new Date(2026, 0, 1, 19))).toBe('Good evening!');
  });
});

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Kavya Menon')).toBe('KM');
    expect(initials('Ritu')).toBe('R');
    expect(initials('Ritu Agarwal Sharma')).toBe('RA');
  });

  it('is empty for an empty name', () => {
    expect(initials('')).toBe('');
  });
});

describe('phone helpers', () => {
  it('strips every non-digit', () => {
    expect(digits('+91 98220-41567')).toBe('919822041567');
  });

  it('keeps the last ten digits for comparison', () => {
    expect(lastDigits('+91 98220-41567')).toBe('9822041567');
    expect(lastDigits('9822041567')).toBe('9822041567');
    expect(lastDigits('9822041567', 4)).toBe('1567');
  });
});

describe('toNumber', () => {
  it('parses a decimal string', () => {
    expect(toNumber('12.5')).toBe(12.5);
  });

  it('is zero for nonsense', () => {
    expect(toNumber('')).toBe(0);
    expect(toNumber('abc')).toBe(0);
    expect(toNumber('NaN')).toBe(0);
  });
});

describe('uid', () => {
  it('produces a prefixed, unique identifier', () => {
    const a = uid('o');
    const b = uid('o');
    expect(a.startsWith('o_')).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe('nowStamp', () => {
  it('returns an ISO timestamp', () => {
    expect(nowStamp()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
