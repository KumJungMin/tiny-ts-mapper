import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';
import { ValidationError } from '../core/error';

type Predicate<T> = (value: T) => MaybePromise<boolean | void>;

/**
 * RefinementSchema<T>
 * - Checks additional conditions on the value parsed by the inner schema.
 * - Throws ValidationError if the condition is not truthy.
 */
export class RefinementSchema<T> extends BaseSchema<T> {
  constructor(
    private readonly inner: BaseSchema<T>,
    private readonly predicate: Predicate<T>,
    private readonly message?: string
  ) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<T> {
    const parsed = this._callInnerParse(this.inner, input, path);

    return isPromise(parsed)
      ? parsed.then((value) => this._checkPredicateOrThrow(value, path))
      : this._checkPredicateOrThrow(parsed, path);
  }

  /** Throws an error if the predicate result is not truthy, otherwise returns the original value. */
  private _checkPredicateOrThrow(value: T, path: Path): MaybePromise<T> {
    const result = this.predicate(value);

    const onResolved = (ok: boolean | void): T => {
      if (ok)
        return value; // Only truthy passes (void/false fails)
      else {
        const message = this.message ?? 'Refinement failed';
        throw new ValidationError([{ path, code: 'custom', message }]);
      }
    };

    return isPromise(result) ? result.then(onResolved) : onResolved(result);
  }
}
