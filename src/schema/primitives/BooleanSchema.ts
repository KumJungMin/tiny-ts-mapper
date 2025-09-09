import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

/**
 * BooleanSchema
 * - 입력값이 boolean인지 검증하는 스키마.
 */

export class BooleanSchema extends BaseSchema<boolean> {
  /** 입력값이 boolean인지 검증하고, 아니면 ValidationError를 던진다. */
  protected override _parse(input: unknown, path: Path): boolean {
    if (typeof input === 'boolean') return input;

    throw new ValidationError([{ path, code: 'invalid_type', message: 'Expected boolean' }]);
  }
}
