import { ValidationError, AsyncParseError } from './error';
import type { Path } from './type';
import { MaybePromise, isPromise } from './utils';

export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

export abstract class BaseSchema<T> {
  _type!: T;

  protected abstract _parse(value: unknown, path: Path): MaybePromise<T>;

  /**
   * Parses the input value and returns the validated data.
   */
  parse(value: unknown): T {
    const result = this._parse(value, []);

    if (isPromise(result)) throw new AsyncParseError();
    return result as T;
  }

  /**
   * Parses the input value asynchronously and returns the validated data.
   */
  async parseAsync(value: unknown): Promise<T> {
    return this._parse(value, []);
  }

  /**
   * Creates a safe parse result error from an unknown error.
   */
  private _makeSafeResultError(e: unknown): { success: false; error: ValidationError } {
    const isValidationError = (e: unknown): e is ValidationError => e instanceof ValidationError;

    let error: ValidationError;

    if (isValidationError(e)) {
      error = e;
    } else {
      const message = (e as Error)?.message ?? 'Unknown error';

      error = new ValidationError([{ path: [], code: 'custom', message }]);
    }

    return { success: false, error };
  }

  /**
   * Parses the input value and returns a safe parse result.
   */
  safeParse(value: unknown): SafeParseResult<T> {
    try {
      return { success: true, data: this.parse(value) };
    } catch (e) {
      return this._makeSafeResultError(e);
    }
  }

  /**
   * Parses the input value and returns a safe parse result. (asynchronously)
   */
  async safeParseAsync(value: unknown): Promise<SafeParseResult<T>> {
    try {
      return { success: true, data: await this.parseAsync(value) };
    } catch (e) {
      return this._makeSafeResultError(e);
    }
  }

  optional(): BaseSchema<T | undefined> {
    return new OptionalSchema(this);
  }

  nullable(): BaseSchema<T | null> {
    return new NullableSchema(this);
  }

  transform<U>(fn: (value: T) => MaybePromise<U>): BaseSchema<U> {
    return new TransformSchema(this, fn);
  }

  refine(pred: (value: T) => MaybePromise<boolean | void>, message?: string): BaseSchema<T> {
    return new RefinementSchema(this, pred, message);
  }

  default(def: T | (() => MaybePromise<T>)): BaseSchema<T> {
    return new DefaultSchema(this, def);
  }
}

/**
 * OptionalSchema
 * @description
 * Wraps another schema to allow undefined values.
 * Returns undefined if the input is undefined, otherwise validates with the inner schema.
 */
class OptionalSchema<T> extends BaseSchema<T | undefined> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T | undefined> {
    if (v === undefined) return undefined;

    return this.inner['_parse'](v, path);
  }
}

/**
 * NullableSchema
 * @description
 * Wraps another schema to allow null values.
 * Returns null if the input is null, otherwise validates with the inner schema.
 */
class NullableSchema<T> extends BaseSchema<T | null> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T | null> {
    if (v === null) return null;

    return this.inner['_parse'](v, path);
  }
}

class TransformSchema<In, Out> extends BaseSchema<Out> {
  constructor(
    private readonly inner: BaseSchema<In>,
    private readonly fn: (v: In) => MaybePromise<Out>
  ) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<Out> {
    const parsed = this.inner['_parse'](v, path);

    const apply = (value: In) => {
      try {
        return this.fn(value);
      } catch (e) {
        const message = (e as Error)?.message ?? String(e);

        throw new ValidationError([{ path, code: 'custom', message }]);
      }
    };

    return isPromise(parsed) ? parsed.then(apply) : apply(parsed);
  }
}

/**
 * RefinementSchema
 * @description
 * Adds custom validation logic to another schema using a predicate function.
 * Throws ValidationError if the predicate returns false.
 */
class RefinementSchema<T> extends BaseSchema<T> {
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

/**
 * DefaultSchema
 * @description
 * Wraps another schema to provide a default value when input is undefined.
 * If input is undefined, uses the default value (can be a value or a function).
 * Otherwise, validates with the inner schema.
 */
class DefaultSchema<T> extends BaseSchema<T> {
  constructor(
    private readonly inner: BaseSchema<T>,
    private readonly def: T | (() => MaybePromise<T>)
  ) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T> {
    if (v === undefined) {
      const isFunction = typeof this.def === 'function';
      const defaultValue = isFunction ? (this.def as () => MaybePromise<T>)() : this.def;

      if (isPromise(defaultValue)) {
        return defaultValue.then((dv) => this.inner['_parse'](dv, path));
      }

      return this.inner['_parse'](defaultValue, path);
    }
    return this.inner['_parse'](v, path);
  }
}

/**
 * UnionSchema
 * @description
 * Validates a value against multiple schemas (union type).
 * Returns the first successful parse result, or throws aggregated errors if all fail.
 * Supports both synchronous and asynchronous parsing.
 */
class UnionSchema<T extends readonly BaseSchema<any>[]> extends BaseSchema<T[number]['_type']> {
  constructor(private readonly options: T) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T[number]['_type']> {
    const aggregatedError = new ValidationError();

    for (const option of this.options) {
      try {
        const result = option['_parse'](v, path);
        if (isPromise(result)) {
          return this._parseAsync(v, path, aggregatedError);
        }
        return result;
      } catch (e) {
        aggregatedError.merge(e);
      }
    }
    throw aggregatedError;
  }

  private async _parseAsync(
    v: unknown,
    path: Path,
    initialErrors: ValidationError
  ): Promise<T[number]['_type']> {
    const aggregatedError = initialErrors;

    for (const option of this.options) {
      try {
        return await option['_parse'](v, path);
      } catch (e) {
        aggregatedError.merge(e);
      }
    }
    throw aggregatedError;
  }
}
