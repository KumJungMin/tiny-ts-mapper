import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

type NumberConfig = Readonly<{ int?: boolean; min?: number; max?: number }>;

/**
 * NumberSchema
 * - 입력값이 number인지 검증하는 스키마.
 * - int() 체이너로 정수만 허용할 수 있다.
 * - min(n), max(n) 체이너로 범위를 제한할 수 있다.
 * - 단, NaN은 허용하지 않지만 Infinity, -Infinity는 허용한다.
 * */
export class NumberSchema extends BaseSchema<number> {
  constructor(private readonly config: NumberConfig = {}) {
    super();
  }

  protected override _parse(input: unknown, path: Path): number {
    // NaN도 걸러내기
    if (typeof input !== 'number' || Number.isNaN(input)) {
      this._fail(path, 'invalid_type', 'Expected number');
    }

    const { int, min, max } = this.config;

    if (int && !Number.isInteger(input)) {
      this._fail(path, 'invalid_type', 'Expected integer');
    }
    if (min != null && input < min) {
      this._fail(path, 'too_small', `Min value ${min}`);
    }
    if (max != null && input > max) {
      this._fail(path, 'too_big', `Max value ${max}`);
    }

    return input;
  }

  // ── 체이닝 ───────────────────────────────────────────────────────────────
  int = () => new NumberSchema({ ...this.config, int: true });
  min = (n: number) => new NumberSchema({ ...this.config, min: n });
  max = (n: number) => new NumberSchema({ ...this.config, max: n });

  // ── 헬퍼 ────────────────────────────────────────────────────────────────
  private _fail(
    path: Path,
    code: 'invalid_type' | 'too_small' | 'too_big',
    message: string
  ): never {
    throw new ValidationError([{ path, code, message }]);
  }
}
