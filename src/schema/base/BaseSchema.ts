import { ValidationError, AsyncParseError } from '../core/error';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';

/**
 * SafeParseResult<T>
 * - 파싱 성공: { success: true, data: T }
 * - 파싱 실패: { success: false, error: ValidationError }
 */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

/**
 * BaseSchema<T>
 * - 모든 스키마의 추상 기반 클래스
 * - 실제 파싱 로직은 서브클래스에서 구현
 */
export abstract class BaseSchema<T> {
  readonly _type!: T; // 타입 추론용

  /**
   * 실제 파싱 로직 (서브클래스가 구현)
   * @param value 입력값
   * @param path 에러 추적용 경로
   */
  protected abstract _parse(value: unknown, path: Path): MaybePromise<T>;

  /**
   * 동기 SafeParse
   * - 에러 발생 시 실패 결과 반환
   */
  safeParse(value: unknown): SafeParseResult<T> {
    try {
      return { success: true, data: this.parse(value) };
    } catch (e) {
      return this._makeSafeResultError(e);
    }
  }

  /**
   * 동기 파싱
   * - thenable(비동기) 결과면 AsyncParseError 발생
   */
  parse(value: unknown): T {
    const result = this._parse(value, []);
    if (isPromise(result)) throw new AsyncParseError();
    return result as T;
  }

  /**
   * 비동기 SafeParse
   * - 에러 발생 시 실패 결과 반환
   */
  async safeParseAsync(value: unknown): Promise<SafeParseResult<T>> {
    try {
      return { success: true, data: await this.parseAsync(value) };
    } catch (e) {
      return this._makeSafeResultError(e);
    }
  }

  /**
   * 비동기 파싱
   * - Promise 또는 값 반환
   */
  async parseAsync(value: unknown): Promise<T> {
    return this._parse(value, []); // T 또는 Promise<T>
  }

  /**
   * SafeParse 에러 결과 생성
   * - ValidationError가 아니면 강제로 변환
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
   * undefined 허용 스키마 반환
   * - OptionalSchema로 감싸서 undefined도 허용
   */
  optional(): BaseSchema<T | undefined> {
    return new OptionalSchema(this);
  }

  /**
   * null 허용 스키마 반환
   * - NullableSchema로 감싸서 null도 허용
   */
  nullable(): BaseSchema<T | null> {
    return new NullableSchema(this);
  }

  /**
   * null | undefined 허용 스키마 반환
   * - NullishSchema로 감싸서 null 또는 undefined 허용
   */
  nullish(): BaseSchema<T | null | undefined> {
    return new NullishSchema(this);
  }

  /**
   * 내부 스키마 파싱 호출
   * - 재귀적 파싱에 사용
   */
  protected _callInnerParse<U>(schema: BaseSchema<U>, value: unknown, path: Path): MaybePromise<U> {
    return schema._parse(value, path);
  }
}

/**
 * OptionalSchema<T>
 * - undefined 값을 허용하는 스키마
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
 * - null 값을 허용하는 스키마
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
 * - null 또는 undefined 값을 허용하는 스키마
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
