import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';
import { ValidationError } from '../core/error';

type TransformFn<In, Out> = (v: In) => MaybePromise<Out>;

/**
 * TransformSchema<In, Out>
 * - Validates the input with the inner schema, then applies a transform function to the result.
 * - Any error thrown by the transform function (sync/async) is wrapped as a ValidationError.
 */

/** TransformSchema vs RefinementSchema
 * transform
 * - Validates the input with the inner schema, then transforms the value to a different shape.
 * - Example: Convert string to number, map DTO to domain object, etc.
 * - The return type can be different from the input type.
 *
 * refinement
 * - Validates the input with the inner schema, then checks additional conditions.
 * - The value shape remains the same; throws an error if the condition is not met.
 * - Example: Check if a number is positive, if a string matches a pattern, etc.
 */
export class TransformSchema<In, Out> extends BaseSchema<Out> {
  constructor(
    private readonly inner: BaseSchema<In>,
    private readonly fn: TransformFn<In, Out>
  ) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<Out> {
    const parsed = this._callInnerParse(this.inner, input, path);

    return isPromise(parsed)
      ? parsed.then((v) => this._applyTransformOrThrow(v, path))
      : this._applyTransformOrThrow(parsed, path);
  }

  /** Applies the transform function and wraps any error as ValidationError. */
  private _applyTransformOrThrow(value: In, path: Path): MaybePromise<Out> {
    try {
      const result = this.fn(value);

      if (isPromise(result)) {
        return result.catch((e) => {
          throw this._asTransformError(e, path);
        });
      }
      return result;
    } catch (e) {
      throw this._asTransformError(e, path);
    }
  }

  /** Converts any error from the transform function to a ValidationError. */
  private _asTransformError(e: unknown, path: Path): ValidationError {
    const message = (e as Error)?.message ?? String(e);

    return new ValidationError([{ path, code: 'custom', message }]);
  }
}
