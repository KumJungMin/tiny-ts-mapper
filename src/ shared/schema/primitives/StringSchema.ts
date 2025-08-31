import { BaseSchema } from '../BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

type StringConfig = { min?: number; max?: number; re?: RegExp };

export class StringSchema extends BaseSchema<string> {
  constructor(private readonly config: StringConfig = {}) {
    super();
  }

  protected _parse(v: unknown, path: Path): string {
    if (typeof v !== 'string') {
      throw new ValidationError([{ path, code: 'invalid_type', message: `Expected string` }]);
    }
    const isTooShort = this.config.min != null && v.length < this.config.min;
    if (isTooShort) {
      throw new ValidationError([
        { path, code: 'too_small', message: `Min length ${this.config.min}` },
      ]);
    }
    const isTooLong = this.config.max != null && v.length > this.config.max;
    if (isTooLong) {
      throw new ValidationError([
        { path, code: 'too_big', message: `Max length ${this.config.max}` },
      ]);
    }
    const isUnmatched = this.config.re && !this.config.re.test(v);
    if (isUnmatched) {
      throw new ValidationError([{ path, code: 'invalid_string', message: `Regex mismatch` }]);
    }
    return v;
  }

  min = (n: number) => new StringSchema({ ...this.config, min: n });
  max = (n: number) => new StringSchema({ ...this.config, max: n });
  regex = (r: RegExp) => new StringSchema({ ...this.config, re: r });
  email = () => this.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
}
