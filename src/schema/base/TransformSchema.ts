import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';
import { ValidationError } from '../core/error';

type TransformFn<In, Out> = (v: In) => MaybePromise<Out>;

/**
 * TransformSchema<In, Out>
 * - inner로 검증한 뒤, 결과값에 변환 함수를 적용한다.
 * - 변환 함수 에러(동기/비동기)는 모두 ValidationError로 변환된다.
 */

/** TransformSchema vs RefinementSchema
 * transform
 * - 입력값을 내부 스키마로 검증한 뒤, 변환 함수로 값을 다른 형태로 변환합니다.
 * - 예시: 문자열을 숫자로 변환, DTO를 도메인 객체로 변환 등
 * - 반환값이 원래 타입과 달라도 됨.
 *
 * refinement
 * - 내부 스키마로 검증한 값을 추가 조건으로 검사합니다.
 * - 값의 형태는 그대로 유지하며, 조건을 만족하지 않으면 에러를 발생시킵니다.
 * - 예시: 숫자가 양수인지, 문자열이 특정 패턴에 맞는지 등
 */
export class TransformSchema<In, Out> extends BaseSchema<Out> {
  constructor(
    private readonly inner: BaseSchema<In>,
    private readonly fn: TransformFn<In, Out>
  ) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<Out> {
    const parsed = this._callInnerParse(this.inner, input, path);

    return isPromise(parsed)
      ? parsed.then((v) => this._applyTransformOrThrow(v, path))
      : this._applyTransformOrThrow(parsed, path);
  }

  /** 변환 함수를 적용하고, 실패 시 ValidationError로 감싼다. */
  private _applyTransformOrThrow(value: In, path: Path): MaybePromise<Out> {
    try {
      const result = this.fn(value);

      if (isPromise(result)) {
        return result.catch((e) => {
          throw this._asTransformError(e, path);
        });
      }
      return result;
    } catch (e) {
      throw this._asTransformError(e, path);
    }
  }

  /** 변환 함수에서 발생한 에러를 ValidationError로 변환 */
  private _asTransformError(e: unknown, path: Path): ValidationError {
    const message = (e as Error)?.message ?? String(e);

    return new ValidationError([{ path, code: 'custom', message }]);
  }
}
