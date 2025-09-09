import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

type NumberConfig = Readonly<{ int?: boolean; min?: number; max?: number }>;

/**
 * NumberSchema
 * - Schema that validates if the input is a number.
 * - int() chain: allows only integers.
 * - min(n), max(n) chains: restrict the range.
 * - NaN is not allowed, but Infinity and -Infinity are allowed.
 */
export class NumberSchema extends BaseSchema<number> {
  constructor(private readonly config: NumberConfig = {}) {
    super();
  }

  protected override _parse(input: unknown, path: Path): number {
    // Reject NaN as well
    if (typeof input !== 'number' || Number.isNaN(input)) {
      this._fail(path, 'invalid_type', 'Expected number');
    }

    const { int, min, max } = this.config;

    if (int && !Number.isInteger(input)) {
      this._fail(path, 'invalid_type', 'Expected integer');
    }
    if (min != null && input < min) {
      this._fail(path, 'too_small', `Min value ${min}`);
    }
    if (max != null && input > max) {
      this._fail(path, 'too_big', `Max value ${max}`);
    }

    return input;
  }

  // ── Chaining methods ───────────────────────────────────────────────────────────────
  int = () => new NumberSchema({ ...this.config, int: true });
  min = (n: number) => new NumberSchema({ ...this.config, min: n });
  max = (n: number) => new NumberSchema({ ...this.config, max: n });

  // ── Helper ────────────────────────────────────────────────────────────────
  private _fail(
    path: Path,
    code: 'invalid_type' | 'too_small' | 'too_big',
    message: string
  ): never {
    throw new ValidationError([{ path, code, message }]);
  }
}
