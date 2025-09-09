import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, ERROR_SENTINEL, isPromise, pushPath } from '../core/utils';
import { ValidationError } from '../core/error';

/**
 * ArraySchema<T>
 * - Validates the array itself, and each element is validated with the inner schema.
 */
export class ArraySchema<T> extends BaseSchema<T[]> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<T[]> {
    // 1) Check if the input is an array
    if (!Array.isArray(input)) {
      throw new ValidationError([{ path, code: 'invalid_array', message: 'Expected array' }]);
    }

    // 2) Validate each element: collect errors in aggregate, mark failed elements with ERROR_SENTINEL
    const aggregate = new ValidationError();

    const handleItemError = (e: unknown): typeof ERROR_SENTINEL => {
      aggregate.merge(e);
      return ERROR_SENTINEL;
    };

    type ItemResult = MaybePromise<T | typeof ERROR_SENTINEL>;

    const parseItem = (item: unknown, idx: number): ItemResult => {
      const itemPath = pushPath(path, idx);
      try {
        const parsed = this._callInnerParse(this.inner, item, itemPath);
        return isPromise(parsed) ? parsed.catch(handleItemError) : parsed;
      } catch (e) {
        return handleItemError(e);
      }
    };

    const results: ItemResult[] = input.map(parseItem);
    const hasAsync = results.some(isPromise);

    /** Extract only valid values from all element results, throw if there are errors. */
    const unwrapValidOrThrow = (vals: (T | typeof ERROR_SENTINEL)[]) => {
      if (aggregate.hasIssues) throw aggregate;
      return vals.filter((x): x is T => x !== ERROR_SENTINEL);
    };

    // 3) Finalize synchronous/asynchronous results
    if (!hasAsync) {
      return unwrapValidOrThrow(results as (T | typeof ERROR_SENTINEL)[]);
    }
    return Promise.all(results).then(unwrapValidOrThrow);
  }
}
