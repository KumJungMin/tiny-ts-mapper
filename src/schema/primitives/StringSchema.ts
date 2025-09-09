import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

type StringConfig = Readonly<{ min?: number; max?: number; re?: RegExp }>;

/**
 * StringSchema
 * - Schema that validates if the input is a string.
 * - min(n), max(n) chain: restricts the length.
 * - regex(r) chain: applies a regular expression pattern.
 * - email() chain: validates email format.
 */
export class StringSchema extends BaseSchema<string> {
  constructor(private readonly config: StringConfig = {}) {
    super();
  }

  protected override _parse(input: unknown, path: Path): string {
    if (typeof input !== 'string') {
      this._fail(path, 'invalid_type', 'Expected string');
    }

    const { min, max, re } = this.config;
    const len = input.length;

    if (min != null && len < min) {
      this._fail(path, 'too_small', `Min length ${min}`);
    }
    if (max != null && len > max) {
      this._fail(path, 'too_big', `Max length ${max}`);
    }
    if (re && !re.test(input)) {
      this._fail(path, 'invalid_string', 'Regex mismatch');
    }

    return input;
  }

  // Chaining methods
  min = (n: number) => new StringSchema({ ...this.config, min: n });
  max = (n: number) => new StringSchema({ ...this.config, max: n });
  regex = (r: RegExp) => new StringSchema({ ...this.config, re: r });
  email = () => this.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

  // Helper
  private _fail(
    path: Path,
    code: 'invalid_type' | 'too_small' | 'too_big' | 'invalid_string',
    message: string
  ): never {
    throw new ValidationError([{ path, code, message }]);
  }
}
