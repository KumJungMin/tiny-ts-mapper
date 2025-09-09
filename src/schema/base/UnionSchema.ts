import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';
import { ValidationError } from '../core/error';

type InferUnion<T extends readonly BaseSchema<any>[]> = T[number]['_type'];

/**
 * UnionSchema<T>
 * - Succeeds if at least one candidate schema passes.
 * - If all candidates fail, aggregates and throws all errors.
 * - Supports both synchronous and asynchronous parsing.
 */
export class UnionSchema<T extends readonly BaseSchema<any>[]> extends BaseSchema<InferUnion<T>> {
  constructor(private readonly candidates: T) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<InferUnion<T>> {
    const aggregate = new ValidationError();
    const pending: Promise<InferUnion<T>>[] = [];

    for (const schema of this.candidates) {
      try {
        const result = this._callInnerParse(schema, input, path);

        // If result is async, collect for later.
        // If sync and successful, return immediately.
        if (isPromise(result)) pending.push(result);
        else return result;
      } catch (e) {
        // If sync and failed, aggregate the error.
        aggregate.merge(e);
      }
    }

    // If all candidates are sync and failed, throw aggregated error.
    if (pending.length === 0) throw aggregate;

    // If there are async candidates: return the first fulfilled, or throw aggregated errors if all fail.
    return Promise.allSettled(pending).then((settled) => {
      for (const item of settled) {
        if (item.status === 'fulfilled') return item.value as InferUnion<T>;

        aggregate.merge(item.reason);
      }
      throw aggregate;
    });
  }
}
