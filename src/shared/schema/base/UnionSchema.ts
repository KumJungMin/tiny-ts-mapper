import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';
import { ValidationError } from '../core/error';

/**
 * UnionSchema
 * @description
 * Validates a value against multiple schemas (union type).
 * Returns the first successful parse result, or throws aggregated errors if all fail.
 * Supports both synchronous and asynchronous parsing.
 */
export class UnionSchema<T extends readonly BaseSchema<any>[]> extends BaseSchema<
  T[number]['_type']
> {
  constructor(private readonly options: T) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T[number]['_type']> {
    const agg = new ValidationError();
    for (const opt of this.options) {
      try {
        const res = opt['_parse'](v, path);
        if (isPromise(res)) return this._parseAsync(v, path, agg);
        return res;
      } catch (e) {
        agg.merge(e);
      }
    }
    throw agg;
  }
  private async _parseAsync(
    v: unknown,
    path: Path,
    initialErrors: ValidationError
  ): Promise<T[number]['_type']> {
    const agg = initialErrors;
    for (const opt of this.options) {
      try {
        return await opt['_parse'](v, path);
      } catch (e) {
        agg.merge(e);
      }
    }
    throw agg;
  }
}
