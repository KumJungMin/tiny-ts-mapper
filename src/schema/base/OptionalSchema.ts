import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise } from '../core/utils';

/**
 * OptionalSchema<T>
 * - Passes through if the input is undefined,
 * - Otherwise, validates with the inner schema.
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
