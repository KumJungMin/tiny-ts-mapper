import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, ERROR_SENTINEL, isPromise, pushPath } from '../core/utils';
import { ValidationError } from '../core/error';
import { OptionalSchema } from '../base/OptionalSchema';

export type Shape = Record<string, BaseSchema<any>>;
type OutputOf<S extends Shape> = { [K in keyof S]: S[K]['_type'] };
type ObjectConfig = { passthrough?: boolean; strict?: boolean };

/**
 * ObjectSchema<S>
 * - Validates each field defined in the shape.
 * - By default, only defined fields are allowed.
 *
 * - passthrough(): Allows additional fields not defined in the shape.
 * - strict(): Throws an error for any fields not defined in the shape.
 * - partial(): Makes all fields optional.
 */
export class ObjectSchema<S extends Shape> extends BaseSchema<OutputOf<S>> {
  constructor(
    private readonly shape: S,
    private readonly config: ObjectConfig = {}
  ) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<OutputOf<S>> {
    // 1) Check if input is a plain object
    const isObject = typeof input === 'object' && input !== null && !Array.isArray(input);
    if (!isObject) {
      throw new ValidationError([{ path, code: 'invalid_object', message: 'Expected object' }]);
    }

    const record = input as Record<string, unknown>;
    const aggregate = new ValidationError();

    // 1) Prepare shapeKeys (keys to validate) and remainingKeys (for passthrough)
    const shapeKeys = Object.keys(this.shape);
    const remainingKeys = new Set(Object.keys(record));

    // 2) strict: Collect keys not defined in shape - throw error if strict mode
    if (this.config.strict) {
      for (const key of remainingKeys) {
        const isDefined = key in this.shape;

        if (!isDefined) {
          aggregate.add({
            path: pushPath(path, key),
            code: 'unrecognized_keys',
            message: `Unrecognized key: '${key}'`,
          });
        }
      }
    }

    // 3) Parse each field (collect errors, mark failed fields with SENTINEL)
    type Pair = [string, MaybePromise<any | typeof ERROR_SENTINEL>];

    const parseField = (key: string): Pair => {
      remainingKeys.delete(key);
      const fieldPath = pushPath(path, key);
      const schema = this.shape[key] as BaseSchema<any>;
      try {
        const parsed = this._callInnerParse(schema, record[key], fieldPath);

        return isPromise(parsed)
          ? [key, parsed.catch((e) => (aggregate.merge(e), ERROR_SENTINEL))]
          : [key, parsed];
      } catch (e) {
        aggregate.merge(e);
        return [key, ERROR_SENTINEL];
      }
    };

    // pairs: list of [key, parse result] for shapeKeys, hasAsync: whether any are async
    const pairs: Pair[] = shapeKeys.map(parseField);
    const hasAsync = pairs.some(([, v]) => isPromise(v));

    // 4) Build output: throw if errors, otherwise remove SENTINEL and return object
    const buildOutput = (resolved: [string, any][]): OutputOf<S> => {
      if (aggregate.hasIssues) throw aggregate;

      const output: Record<string, unknown> = {};

      for (const [k, v] of resolved) {
        if (v !== ERROR_SENTINEL) output[k] = v;
      }

      // passthrough mode: add remaining fields not defined in shape
      if (this.config.passthrough) {
        for (const k of remainingKeys) output[k] = record[k];
      }

      return output as OutputOf<S>;
    };

    if (hasAsync) {
      // If any results are async, resolve all before building output
      return Promise.all(pairs.map(async ([k, v]) => [k, await v] as [string, any])).then(
        buildOutput
      );
    } else {
      return buildOutput(pairs as [string, any][]);
    }
  }

  // ── Option chainers ────────────────────────────────────────────────────────────────
  passthrough = () => new ObjectSchema(this.shape, { ...this.config, passthrough: true });

  strict = () => new ObjectSchema(this.shape, { ...this.config, strict: true });

  /**
   * Makes all fields optional.
   * - If the schema exposes an optional() method, use it.
   * - Otherwise, wrap with OptionalSchema.
   */
  partial = (): ObjectSchema<{ [K in keyof S]: BaseSchema<S[K]['_type']> }> => {
    const next: Record<string, BaseSchema<any>> = {};

    for (const key in this.shape) {
      const schema = this.shape[key] as BaseSchema<any>;
      const isOptional = typeof (schema as any).optional === 'function';

      if (isOptional) {
        next[key] = (schema as any).optional() as BaseSchema<any>;
      } else {
        next[key] = new OptionalSchema(schema);
      }
    }
    return new ObjectSchema(next as { [K in keyof S]: BaseSchema<S[K]['_type']> }, this.config);
  };
}
