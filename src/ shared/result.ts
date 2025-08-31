/**
 * Common types for handling success/failure as values instead of exceptions.
 */

export type Ok<T> = { ok: true; value: T };
export type Err<E = Error> = { ok: false; error: E };
export type Result<T, E = Error> = Ok<T> | Err<E>;
export const ok = <T>(v: T): Ok<T> => ({ ok: true, value: v });
export const err = <E>(e: E): Err<E> => ({ ok: false, error: e });

export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: Error };

export const fromSafe = <T>(r: SafeParseResult<T>): Result<T> =>
  r.success ? ok(r.data) : err(r.error);
