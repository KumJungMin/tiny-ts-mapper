import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';

type DefaultSource<T> = T | (() => MaybePromise<T>);

/**
 * DefaultSchema<T>
 * - Applies the default value when the input is undefined, then validates that value with the inner schema.
 * - If the input is defined, validates it directly with the inner schema.
 */
export class DefaultSchema<T> extends BaseSchema<T> {
  constructor(
    private readonly inner: BaseSchema<T>,
    private readonly defaultSource: DefaultSource<T>
  ) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<T> {
    // If the value is defined, validate directly without applying the default
    if (input !== undefined) {
      return this._callInnerParse(this.inner, input, path);
    }

    // If undefined: resolve the default value then validate
    const resolved = this.resolveDefault();
    return isPromise(resolved)
      ? resolved.then((v) => this._callInnerParse(this.inner, v, path))
      : this._callInnerParse(this.inner, resolved, path);
  }

  /** Returns the actual default value whether defaultSource is a value or a function */
  private resolveDefault(): MaybePromise<T> {
    return typeof this.defaultSource === 'function'
      ? (this.defaultSource as () => MaybePromise<T>)()
      : this.defaultSource;
  }
}
