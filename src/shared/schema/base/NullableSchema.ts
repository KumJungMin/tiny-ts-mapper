import { BaseSchema } from '../BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise } from '../core/utils';

/**
 * NullableSchema
 * @description
 * Wraps another schema to allow null values.
 * Returns null if the input is null, otherwise validates with the inner schema.
 */
export class NullableSchema<T> extends BaseSchema<T | null> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T | null> {
    if (v === null) return null;
    return this.inner['_parse'](v, path);
  }
}
