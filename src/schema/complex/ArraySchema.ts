import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, ERROR_SENTINEL, isPromise, pushPath } from '../core/utils';
import { ValidationError } from '../core/error';

export class ArraySchema<T> extends BaseSchema<T[]> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }

  protected _parse(v: unknown, path: Path): MaybePromise<T[]> {
    if (!Array.isArray(v)) {
      throw new ValidationError([{ path, code: 'invalid_array', message: 'Expected array' }]);
    }

    const agg = new ValidationError();
    const results: MaybePromise<T | typeof ERROR_SENTINEL>[] = v.map((item, i) => {
      try {
        const res = this.inner['_parse'](item, pushPath(path, i));
        if (isPromise(res)) {
          return res.catch((e) => {
            agg.merge(e);
            return ERROR_SENTINEL;
          });
        }
        return res;
      } catch (e) {
        agg.merge(e);
        return ERROR_SENTINEL;
      }
    });

    const hasPromise = results.some(isPromise);

    const processResults = (final: (T | typeof ERROR_SENTINEL)[]) => {
      if (agg.hasIssues) throw agg;
      return final.filter((r): r is T => r !== ERROR_SENTINEL);
    };

    if (hasPromise) {
      return Promise.all(results).then(processResults);
    }
    return processResults(results as (T | typeof ERROR_SENTINEL)[]);
  }
}
