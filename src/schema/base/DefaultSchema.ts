import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';

/**
 * DefaultSchema
 * @description
 * Wraps another schema to provide a default value when input is undefined.
 * If input is undefined, uses the default value (can be a value or a function).
 * Otherwise, validates with the inner schema.
 */
export class DefaultSchema<T> extends BaseSchema<T> {
  constructor(
    private readonly inner: BaseSchema<T>,
    private readonly def: T | (() => MaybePromise<T>)
  ) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T> {
    if (v === undefined) {
      const defaultValue = typeof this.def === 'function' ? (this.def as Function)() : this.def;
      return isPromise(defaultValue)
        ? defaultValue.then((dv) => this.inner['_parse'](dv, path))
        : this.inner['_parse'](defaultValue, path);
    }
    return this.inner['_parse'](v, path);
  }
}
