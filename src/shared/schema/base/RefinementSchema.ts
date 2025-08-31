import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';
import { ValidationError } from '../core/error';

/**
 * RefinementSchema
 * @description
 * Adds custom validation logic to another schema using a predicate function.
 * Throws ValidationError if the predicate returns false.
 */
export class RefinementSchema<T> extends BaseSchema<T> {
  constructor(
    private readonly inner: BaseSchema<T>,
    private readonly predicate: (v: T) => MaybePromise<boolean | void>,
    private readonly message?: string
  ) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T> {
    const parsed = this.inner['_parse'](v, path);
    const validateRefinement = (value: T): MaybePromise<T> => {
      const res = this.predicate(value);
      const handleResult = (ok: boolean | void) => {
        if (!ok) {
          const message = this.message ?? 'Refinement failed';
          throw new ValidationError([{ path, code: 'custom', message }]);
        }
        return value;
      };
      return isPromise(res) ? res.then(handleResult) : handleResult(res);
    };
    return isPromise(parsed) ? parsed.then(validateRefinement) : validateRefinement(parsed);
  }
}
