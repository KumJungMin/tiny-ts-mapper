import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, ERROR_SENTINEL, isPromise, pushPath } from '../core/utils';
import { ValidationError } from '../core/error';

/**
 * ArraySchema<T>
 * - 배열 자체를 검증하고, 각 요소는 inner 스키마로 검증한다.
 */
export class ArraySchema<T> extends BaseSchema<T[]> {
  constructor(private readonly inner: BaseSchema<T>) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<T[]> {
    // 1) 배열 타입 확인
    if (!Array.isArray(input)) {
      throw new ValidationError([{ path, code: 'invalid_array', message: 'Expected array' }]);
    }

    // 2) 요소 검증: 에러는 aggregate에 모으고, 실패 요소는 ERROR_SENTINEL로 마킹
    const aggregate = new ValidationError();

    const handleItemError = (e: unknown): typeof ERROR_SENTINEL => {
      aggregate.merge(e);
      return ERROR_SENTINEL;
    };

    type ItemResult = MaybePromise<T | typeof ERROR_SENTINEL>;

    const parseItem = (item: unknown, idx: number): ItemResult => {
      const itemPath = pushPath(path, idx);
      try {
        const parsed = this._callInnerParse(this.inner, item, itemPath);
        return isPromise(parsed) ? parsed.catch(handleItemError) : parsed;
      } catch (e) {
        return handleItemError(e);
      }
    };

    const results: ItemResult[] = input.map(parseItem);
    const hasAsync = results.some(isPromise);

    /** 모든 요소 결과에서 유효한 값만 추출하고, 에러가 있으면 던진다. */
    const unwrapValidOrThrow = (vals: (T | typeof ERROR_SENTINEL)[]) => {
      if (aggregate.hasIssues) throw aggregate;
      return vals.filter((x): x is T => x !== ERROR_SENTINEL);
    };

    // 3) 동기/비동기 결과 마무리
    if (!hasAsync) {
      return unwrapValidOrThrow(results as (T | typeof ERROR_SENTINEL)[]);
    }
    return Promise.all(results).then(unwrapValidOrThrow);
  }
}
