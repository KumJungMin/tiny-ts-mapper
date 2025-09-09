import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise } from '../core/utils';

/**
 * NullableSchema<T>
 * - 입력값이 null이면 그대로 통과하고,
 * - 그 외에는 inner 스키마로 검증한다.
 */
export class NullableSchema<T> extends BaseSchema<T | null> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<T | null> {
    if (input === null) return null;
    else return this._callInnerParse(this.inner, input, path);
  }
}
