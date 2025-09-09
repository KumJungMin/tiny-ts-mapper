import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';
import { ValidationError } from '../core/error';

type Predicate<T> = (value: T) => MaybePromise<boolean | void>;

/**
 * RefinementSchema<T>
 * - inner 스키마로 파싱된 값에 대해 추가 조건을 검사한다.
 * - 조건이 truthy가 아니면 ValidationError를 던진다.
 */
export class RefinementSchema<T> extends BaseSchema<T> {
  constructor(
    private readonly inner: BaseSchema<T>,
    private readonly predicate: Predicate<T>,
    private readonly message?: string
  ) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<T> {
    const parsed = this._callInnerParse(this.inner, input, path);

    return isPromise(parsed)
      ? parsed.then((value) => this._checkPredicateOrThrow(value, path))
      : this._checkPredicateOrThrow(parsed, path);
  }

  /** predicate 결과가 truthy가 아니면 에러를 던지고, 통과하면 원래 값을 반환한다. */
  private _checkPredicateOrThrow(value: T, path: Path): MaybePromise<T> {
    const result = this.predicate(value);

    const onResolved = (ok: boolean | void): T => {
      if (ok)
        return value; // truthy만 통과 (void/false는 실패)
      else {
        const message = this.message ?? 'Refinement failed';
        throw new ValidationError([{ path, code: 'custom', message }]);
      }
    };

    return isPromise(result) ? result.then(onResolved) : onResolved(result);
  }
}
