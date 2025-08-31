import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';
import { ValidationError } from '../core/error';

/**
 * TransformSchema
 * @description
 * Transforms the parsed value using a provided function after validation.
 * Throws ValidationError if the transform function throws.
 */
export class TransformSchema<In, Out> extends BaseSchema<Out> {
  constructor(
    private readonly inner: BaseSchema<In>,
    private readonly fn: (v: In) => MaybePromise<Out>
  ) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<Out> {
    const parsed = this.inner['_parse'](v, path);
    const apply = (val: In) => {
      try {
        return this.fn(val);
      } catch (e) {
        throw new ValidationError([
          { path, code: 'custom', message: (e as Error)?.message ?? String(e) },
        ]);
      }
    };
    return isPromise(parsed) ? parsed.then(apply) : apply(parsed);
  }
}
