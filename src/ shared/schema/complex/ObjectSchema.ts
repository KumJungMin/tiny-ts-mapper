import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, ERROR_SENTINEL, isPromise, pushPath } from '../core/utils';
import { ValidationError } from '../core/error';
import { OptionalSchema } from '../base/OptionalSchema';

export type Shape = Record<string, BaseSchema<any>>;

type ObjectConfig = { passthrough?: boolean; strict?: boolean };

export class ObjectSchema<S extends Shape> extends BaseSchema<{ [K in keyof S]: S[K]['_type'] }> {
  constructor(
    private readonly shape: S,
    private readonly config: ObjectConfig = {}
  ) {
    super();
  }

  protected _parse(v: unknown, path: Path): MaybePromise<{ [K in keyof S]: S[K]['_type'] }> {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      throw new ValidationError([{ path, code: 'invalid_object', message: 'Expected object' }]);
    }

    const input = v as Record<string, unknown>;
    const agg = new ValidationError();
    const shapeKeys = Object.keys(this.shape);
    const inputKeys = new Set(Object.keys(input));

    if (this.config.strict) {
      for (const key of inputKeys) {
        if (!shapeKeys.includes(key)) {
          agg.add({
            path: pushPath(path, key),
            code: 'unrecognized_keys',
            message: `Unrecognized key: '${key}'`,
          });
        }
      }
    }

    const entries: [string, MaybePromise<any | typeof ERROR_SENTINEL>][] = shapeKeys.map((key) => {
      inputKeys.delete(key);
      try {
        const schema = this.shape[key] as BaseSchema<any>;
        const res = schema['_parse'](input[key], pushPath(path, key));
        if (isPromise(res)) {
          return [key, res.catch((e) => (agg.merge(e), ERROR_SENTINEL))];
        }
        return [key, res];
      } catch (e) {
        agg.merge(e);
        return [key, ERROR_SENTINEL];
      }
    });

    const hasPromise = entries.some(([, val]) => isPromise(val));

    const buildObject = (resolvedEntries: [string, any][]): { [K in keyof S]: S[K]['_type'] } => {
      if (agg.hasIssues) throw agg;
      const out: any = {};
      for (const [key, value] of resolvedEntries) {
        if (value !== ERROR_SENTINEL) out[key] = value;
      }
      if (this.config.passthrough) {
        for (const key of inputKeys) out[key] = input[key];
      }
      return out as { [K in keyof S]: S[K]['_type'] };
    };

    if (hasPromise) {
      return Promise.all(entries.map(async ([k, v]) => [k, await v] as [string, any])).then(
        buildObject
      ) as Promise<{ [K in keyof S]: S[K]['_type'] }>;
    }
    return buildObject(entries as [string, any][]);
  }

  passthrough = () => new ObjectSchema(this.shape, { ...this.config, passthrough: true });

  strict = () => new ObjectSchema(this.shape, { ...this.config, strict: true });

  partial = (): ObjectSchema<{ [K in keyof S]: BaseSchema<S[K]['_type']> }> => {
    const newShape: Record<string, BaseSchema<any>> = {};
    for (const k in this.shape) {
      const schema = this.shape[k] as BaseSchema<any>;
      // some schemas may expose an `optional()` helper, otherwise wrap with OptionalSchema.
      // cast the result to BaseSchema<any> so the resulting shape satisfies the Shape constraint.
      newShape[k] =
        typeof (schema as any).optional === 'function'
          ? ((schema as any).optional() as unknown as BaseSchema<any>)
          : (new OptionalSchema(schema) as unknown as BaseSchema<any>);
    }
    return new ObjectSchema(
      newShape as unknown as { [K in keyof S]: BaseSchema<S[K]['_type']> },
      this.config
    );
  };
}
