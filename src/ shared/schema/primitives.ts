import { BaseSchema } from './BaseSchema';
import type { Path } from './type';

import { ValidationError } from './error';

/**
 * StringSchema
 * @description
 * Validates string values with optional constraints:
 * - min: minimum length
 * - max: maximum length
 * - re: regular expression pattern
 * Throws ValidationError if the value does not meet the requirements.
 */
type StringConfig = { min?: number; max?: number; re?: RegExp };

class StringSchema extends BaseSchema<string> {
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
        {
          path,
          code: 'too_small',
          message: `Min length ${this.config.min}`,
        },
      ]);
    }

    const isTooLong = this.config.max != null && v.length > this.config.max;
    if (isTooLong) {
      throw new ValidationError([
        {
          path,
          code: 'too_big',
          message: `Max length ${this.config.max}`,
        },
      ]);
    }

    const isUnmatched = this.config.re && !this.config.re.test(v);
    if (isUnmatched) {
      throw new ValidationError([
        {
          path,
          code: 'invalid_string',
          message: `Regex mismatch`,
        },
      ]);
    }
    return v;
  }

  min = (n: number) => new StringSchema({ ...this.config, min: n });

  max = (n: number) => new StringSchema({ ...this.config, max: n });

  regex = (r: RegExp) => new StringSchema({ ...this.config, re: r });

  email = () => this.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
}

/**
 * NumberSchema
 * @description
 * Validates number values with optional constraints:
 * - int: must be an integer
 * - min: minimum value
 * - max: maximum value
 * Throws ValidationError if the value does not meet the requirements.
 */
type NumberConfig = { int?: boolean; min?: number; max?: number };

class NumberSchema extends BaseSchema<number> {
  constructor(private readonly config: NumberConfig = {}) {
    super();
  }
  protected _parse(v: unknown, path: Path): number {
    const isNotNumber = typeof v !== 'number' || Number.isNaN(v);
    if (isNotNumber) {
      throw new ValidationError([
        {
          path,
          code: 'invalid_type',
          message: `Expected number`,
        },
      ]);
    }

    const isInvalidInteger = this.config.int && !Number.isInteger(v);
    if (isInvalidInteger) {
      throw new ValidationError([
        {
          path,
          code: 'invalid_type',
          message: `Expected integer`,
        },
      ]);
    }

    const isTooSmall = this.config.min != null && v < this.config.min;
    if (isTooSmall) {
      throw new ValidationError([
        {
          path,
          code: 'too_small',
          message: `Min value ${this.config.min}`,
        },
      ]);
    }

    const isTooBig = this.config.max != null && v > this.config.max;
    if (isTooBig) {
      throw new ValidationError([
        {
          path,
          code: 'too_big',
          message: `Max value ${this.config.max}`,
        },
      ]);
    }
    return v;
  }

  int = () => new NumberSchema({ ...this.config, int: true });

  min = (n: number) => new NumberSchema({ ...this.config, min: n });

  max = (n: number) => new NumberSchema({ ...this.config, max: n });
}

/**
 * BooleanSchema
 * @description
 * Validates boolean values.
 * Throws ValidationError if the value is not a boolean.
 */
class BooleanSchema extends BaseSchema<boolean> {
  protected _parse(v: unknown, path: Path): boolean {
    if (typeof v !== 'boolean') {
      throw new ValidationError([
        {
          path,
          code: 'invalid_type',
          message: `Expected boolean`,
        },
      ]);
    }
    return v;
  }
}

/**
 * EnumSchema
 * @description
 * Validates string values against a fixed set of allowed values (enum).
 * Throws ValidationError if the value is not a string or not in the allowed set.
 */
class EnumSchema<T extends string> extends BaseSchema<T> {
  constructor(private readonly vals: readonly T[]) {
    super();
  }
  protected _parse(v: unknown, path: Path): T {
    if (typeof v !== 'string' || !this.vals.includes(v as T)) {
      throw new ValidationError([
        {
          path,
          code: 'invalid_enum',
          message: `Expected one of [${this.vals.join(', ')}]`,
        },
      ]);
    }
    return v as T;
  }
}
