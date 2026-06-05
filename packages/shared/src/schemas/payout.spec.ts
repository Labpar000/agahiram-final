import { describe, expect, it } from 'vitest';
import { createPayoutSchema } from './payout';

describe('createPayoutSchema', () => {
  it('accepts valid payout input', () => {
    const result = createPayoutSchema.parse({
      amount: 100_000,
      iban: 'ir120170000000100000000989',
    });
    expect(result.iban).toBe('IR120170000000100000000989');
    expect(result.amount).toBe(100_000);
  });

  it('rejects amounts below minimum', () => {
    expect(() =>
      createPayoutSchema.parse({
        amount: 10_000,
        iban: 'IR120170000000100000000989',
      }),
    ).toThrow();
  });

  it('rejects invalid IBAN format', () => {
    expect(() =>
      createPayoutSchema.parse({
        amount: 100_000,
        iban: '1234',
      }),
    ).toThrow();
  });
});
