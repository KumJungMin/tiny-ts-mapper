import { ValidationError, AsyncParseError } from '../core/error';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';

/**
 * SafeParseResult<T>
 * - Parsing success: { success: true, data: T }
 * - Parsing failure: { success: false, error: ValidationError }
 */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

/**
 * BaseSchema<T>
 * - Abstract base class for all schemas.
 * - Actual parsing logic is implemented in subclasses.
 */
export abstract class BaseSchema<T> {
  readonly _type!: T; // For type inference

  /**
   * Actual parsing logic (implemented by subclasses)
   * @param value Input value
   * @param path Error tracking path
   */
  protected abstract _parse(value: unknown, path: Path): MaybePromise<T>;

  /**
   * Synchronous safeParse
   * - Returns failure result if an error occurs
   */
  safeParse(value: unknown): SafeParseResult<T> {
    try {
      return { success: true, data: this.parse(value) };
    } catch (e) {
      return this._makeSafeResultError(e);
    }
  }

  /**
   * Synchronous parse
   * - Throws AsyncParseError if result is a Promise
   */
  parse(value: unknown): T {
    const result = this._parse(value, []);
    if (isPromise(result)) throw new AsyncParseError();
    return result as T;
  }

  /**
   * Asynchronous safeParse
   * - Returns failure result if an error occurs
   */
  async safeParseAsync(value: unknown): Promise<SafeParseResult<T>> {
    try {
      return { success: true, data: await this.parseAsync(value) };
    } catch (e) {
      return this._makeSafeResultError(e);
    }
  }

  /**
   * Asynchronous parse
   * - Returns Promise or value
   */
  async parseAsync(value: unknown): Promise<T> {
    return this._parse(value, []); // T or Promise<T>
  }

  /**
   * Creates a SafeParse error result
   * - Converts to ValidationError if not already
   */
  private _makeSafeResultError(e: unknown): { success: false; error: ValidationError } {
    const isValidationError = (x: unknown): x is ValidationError => x instanceof ValidationError;

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
   * Returns a schema that allows undefined
   * - Wraps with OptionalSchema
   */
  optional(): BaseSchema<T | undefined> {
    return new OptionalSchema(this);
  }

  /**
   * Returns a schema that allows null
   * - Wraps with NullableSchema
   */
  nullable(): BaseSchema<T | null> {
    return new NullableSchema(this);
  }

  /**
   * Returns a schema that allows null or undefined
   * - Wraps with NullishSchema
   */
  nullish(): BaseSchema<T | null | undefined> {
    return new NullishSchema(this);
  }

  /**
   * Calls inner schema's parse
   * - Used for recursive parsing
   */
  protected _callInnerParse<U>(schema: BaseSchema<U>, value: unknown, path: Path): MaybePromise<U> {
    return schema._parse(value, path);
  }
}

/**
 * OptionalSchema<T>
 * - Schema that allows undefined values
 */
class OptionalSchema<T> extends BaseSchema<T | undefined> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T | undefined> {
    if (v === undefined) return undefined;

    return this._callInnerParse(this.inner, v, path);
  }
}

/**
 * NullableSchema<T>
 * - Schema that allows null values
 */
class NullableSchema<T> extends BaseSchema<T | null> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T | null> {
    if (v === null) return null;

    return this._callInnerParse(this.inner, v, path);
  }
}

/**
 * NullishSchema<T>
 * - Schema that allows null or undefined values
 */
class NullishSchema<T> extends BaseSchema<T | null | undefined> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }
  protected _parse(v: unknown, path: Path): MaybePromise<T | null | undefined> {
    if (v == null) return v as null | undefined;

    return this._callInnerParse(this.inner, v, path);
  }
}
