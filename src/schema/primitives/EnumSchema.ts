import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

/**
 * EnumSchema
 * - 입력값이 enum 값 중 하나인지 검증하는 스키마.
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
