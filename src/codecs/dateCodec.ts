import { Result, ok, err } from '../ shared/schema/core/result';
import { ValidationError } from '../ shared/schema/core/error';

export const DateCodec = {
  encode(d: Date): Result<string, ValidationError> {
    try {
      return ok(d.toISOString());
    } catch (e) {
      return err(new ValidationError([{ path: [], code: 'custom', message: String(e) }]));
    }
  },
  decode(iso: string): Result<Date, ValidationError> {
    const t = Date.parse(iso);
    return Number.isNaN(t)
      ? err(new ValidationError([{ path: [], code: 'custom', message: 'Invalid ISO date' }]))
      : ok(new Date(t));
  },
};
