import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise } from '../core/utils';

/**
 * OptionalSchema
 * @description
 * Wraps another schema to allow undefined values.
 * Returns undefined if the input is undefined, otherwise validates with the inner schema.
 */
export class OptionalSchema<T> extends BaseSchema<T | undefined> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T | undefined> {
    if (v === undefined) return undefined;
    return this.inner['_parse'](v, path);
  }
}
