import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

type NumberConfig = { int?: boolean; min?: number; max?: number };

export class NumberSchema extends BaseSchema<number> {
  constructor(private readonly config: NumberConfig = {}) {
    super();
  }
  protected _parse(v: unknown, path: Path): number {
    const isNotNumber = typeof v !== 'number' || Number.isNaN(v);
    if (isNotNumber) {
      throw new ValidationError([{ path, code: 'invalid_type', message: `Expected number` }]);
    }
    const isInvalidInteger = this.config.int && !Number.isInteger(v);
    if (isInvalidInteger) {
      throw new ValidationError([{ path, code: 'invalid_type', message: `Expected integer` }]);
    }
    const isTooSmall = this.config.min != null && v < this.config.min;
    if (isTooSmall) {
      throw new ValidationError([
        { path, code: 'too_small', message: `Min value ${this.config.min}` },
      ]);
    }
    const isTooBig = this.config.max != null && v > this.config.max;
    if (isTooBig) {
      throw new ValidationError([
        { path, code: 'too_big', message: `Max value ${this.config.max}` },
      ]);
    }
    return v;
  }

  int = () => new NumberSchema({ ...this.config, int: true });
  min = (n: number) => new NumberSchema({ ...this.config, min: n });
  max = (n: number) => new NumberSchema({ ...this.config, max: n });
  nullable = () => new (require('../base/NullableSchema').NullableSchema)(this);
}
