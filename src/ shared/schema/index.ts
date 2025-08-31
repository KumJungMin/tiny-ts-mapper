import { StringSchema } from './primitives';
import { NumberSchema } from './primitives';
import { BooleanSchema } from './primitives';
import { EnumSchema } from './primitives';
import { BaseSchema } from './base/BaseSchema';
import { ArraySchema } from './complex/ArraySchema';
import { ObjectSchema } from './complex/ObjectSchema';
import { UnionSchema } from './base/UnionSchema';

import type { Shape } from './complex/ObjectSchema';

export const s = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  enum: <T extends string>(vals: readonly T[]) => new EnumSchema(vals),
  array: <T>(inner: BaseSchema<T>) => new ArraySchema(inner),
  object: <S extends Shape>(shape: S) => new ObjectSchema(shape),
  union: <T extends readonly BaseSchema<any>[]>(opts: T) => new UnionSchema(opts),
};

export type Infer<T extends BaseSchema<any>> = T['_type'];
