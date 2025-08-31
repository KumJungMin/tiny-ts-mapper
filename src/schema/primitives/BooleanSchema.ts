import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

export class BooleanSchema extends BaseSchema<boolean> {
  protected _parse(v: unknown, path: Path): boolean {
    if (typeof v !== 'boolean') {
      throw new ValidationError([{ path, code: 'invalid_type', message: `Expected boolean` }]);
    }
    return v;
  }
}
