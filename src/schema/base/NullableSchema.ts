import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise } from '../core/utils';

/**
 * NullableSchema<T>
 * - Passes through if the input is null,
 * - Otherwise, validates with the inner schema.
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
