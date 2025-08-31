import { BaseSchema } from '../BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

export class EnumSchema<T extends string> extends BaseSchema<T> {
  constructor(private readonly vals: readonly T[]) {
    super();
  }
  protected _parse(v: unknown, path: Path): T {
    if (typeof v !== 'string' || !this.vals.includes(v as T)) {
      throw new ValidationError([
        { path, code: 'invalid_enum', message: `Expected one of [${this.vals.join(', ')}]` },
      ]);
    }
    return v as T;
  }
}
