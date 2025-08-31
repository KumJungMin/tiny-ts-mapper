import { ValidationError, AsyncParseError } from '../core/error';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';

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
}
