import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { ValidationError } from '../core/error';

type StringConfig = Readonly<{ min?: number; max?: number; re?: RegExp }>;

/**
 * StringSchema
 * - 입력값이 string인지 검증하는 스키마.
 * - min(n), max(n) 체이너로 길이를 제한할 수 있다.
 * - regex(r) 체이너로 정규식 패턴을 지정할 수 있다.
 * - email() 체이너로 이메일 형식을 검증할 수 있다.
 */
export class StringSchema extends BaseSchema<string> {
  constructor(private readonly config: StringConfig = {}) {
    super();
  }

  protected override _parse(input: unknown, path: Path): string {
    if (typeof input !== 'string') {
      this._fail(path, 'invalid_type', 'Expected string');
    }

    const { min, max, re } = this.config;
    const len = input.length;

    if (min != null && len < min) {
      this._fail(path, 'too_small', `Min length ${min}`);
    }
    if (max != null && len > max) {
      this._fail(path, 'too_big', `Max length ${max}`);
    }
    if (re && !re.test(input)) {
      this._fail(path, 'invalid_string', 'Regex mismatch');
    }

    return input;
  }

  // 체이닝
  min = (n: number) => new StringSchema({ ...this.config, min: n });
  max = (n: number) => new StringSchema({ ...this.config, max: n });
  regex = (r: RegExp) => new StringSchema({ ...this.config, re: r });
  email = () => this.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

  // 헬퍼
  private _fail(
    path: Path,
    code: 'invalid_type' | 'too_small' | 'too_big' | 'invalid_string',
    message: string
  ): never {
    throw new ValidationError([{ path, code, message }]);
  }
}
