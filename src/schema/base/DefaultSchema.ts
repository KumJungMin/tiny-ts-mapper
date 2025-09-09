import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';

type DefaultSource<T> = T | (() => MaybePromise<T>);

/**
 * DefaultSchema<T>
 * - 입력값이 undefined일 때 기본값을 적용하고, 그 값을 inner 스키마로 검증한다.
 * - 입력값이 정의되어 있으면 그대로 inner 스키마로 검증한다.
 */
export class DefaultSchema<T> extends BaseSchema<T> {
  constructor(
    private readonly inner: BaseSchema<T>,
    private readonly defaultSource: DefaultSource<T>
  ) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<T> {
    // 값이 정의되어 있으면 기본값 없이 바로 검증
    if (input !== undefined) {
      return this._callInnerParse(this.inner, input, path);
    }

    // undefined 인 경우: 기본값을 해석한 뒤 검증
    const resolved = this.resolveDefault();
    return isPromise(resolved)
      ? resolved.then((v) => this._callInnerParse(this.inner, v, path))
      : this._callInnerParse(this.inner, resolved, path);
  }

  /** defaultSource가 값/함수 어느 쪽이든 실제 기본값을 반환 */
  private resolveDefault(): MaybePromise<T> {
    return typeof this.defaultSource === 'function'
      ? (this.defaultSource as () => MaybePromise<T>)()
      : this.defaultSource;
  }
}
