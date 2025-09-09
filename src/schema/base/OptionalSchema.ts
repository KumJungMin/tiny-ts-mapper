import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise } from '../core/utils';

/**
 * OptionalSchema<T>
 * - 입력이 undefined면 그대로 통과하고,
 * - 그 외에는 inner 스키마로 검증한다.
 */
export class OptionalSchema<T> extends BaseSchema<T | undefined> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<T | undefined> {
    if (input === undefined) return undefined;
    else return this._callInnerParse(this.inner, input, path);
  }
}
