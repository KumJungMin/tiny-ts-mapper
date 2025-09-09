import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

/**
 * EnumSchema
 * - Schema that validates if the input is one of the allowed enum values.
 **/

export class EnumSchema<T extends string> extends BaseSchema<T> {
  private readonly allowedSet: ReadonlySet<T>;
  private readonly expectedMessage: string;

  constructor(vals: readonly T[]) {
    super();
    this.allowedSet = new Set(vals);

    const pretty = vals.map((v) => JSON.stringify(v)).join(' | ');
    this.expectedMessage = `Expected one of ${pretty}`;
  }

  protected override _parse(input: unknown, path: Path): T {
    if (typeof input === 'string' && this.allowedSet.has(input as T)) {
      return input as T;
    }
    throw new ValidationError([{ path, code: 'invalid_enum', message: this.expectedMessage }]);
  }
}
