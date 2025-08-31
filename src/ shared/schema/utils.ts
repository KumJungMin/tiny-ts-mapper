import type { Path } from './type';

export type MaybePromise<T> = T | Promise<T>;

/**
 * Checks if a value is a Promise.
 * @param value - The value to check.
 * @returns True if the value is a Promise, false otherwise.
 */
export function isPromise<T = unknown>(value: MaybePromise<T>): value is Promise<T> {
  return !!value && typeof (value as any).then === 'function';
}

/**
 * A sentinel value used to indicate an error in array parsing.
 */
export const ERROR_SENTINEL = Symbol('error_sentinel');

/**
 * Converts a path array to a string representation.
 * @param path - The path array to convert.
 * @returns The string representation of the path.
 */
export function pathToString(path: Path): string {
  if (!path || path.length === 0) return '<root>';

  let result = '';
  for (const segment of path) {
    if (typeof segment === 'number') {
      result += `[${segment}]`;
    } else {
      result += result ? `.${segment}` : `${segment}`;
    }
  }
  return result;
}

/**
 * Pushes a new segment onto the path.
 * @param path - The original path.
 * @param segment - The segment to add.
 * @returns A new path with the added segment.
 */
export function pushPath(path: Path, segment: string | number): Path {
  return [...path, segment];
}
