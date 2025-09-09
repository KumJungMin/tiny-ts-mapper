import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

/**
 * BooleanSchema
 * - Schema that validates if the input is a boolean.
 */

export class BooleanSchema extends BaseSchema<boolean> {
  /** Validates if the input is a boolean, throws ValidationError if not. */
  protected override _parse(input: unknown, path: Path): boolean {
    if (typeof input === 'boolean') return input;

    throw new ValidationError([{ path, code: 'invalid_type', message: 'Expected boolean' }]);
  }
}
