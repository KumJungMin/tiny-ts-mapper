import { BaseSchema } from './BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, isPromise } from '../core/utils';
import { ValidationError } from '../core/error';

type InferUnion<T extends readonly BaseSchema<any>[]> = T[number]['_type'];

/**
 * UnionSchema<T>
 * - candidates 중 하나라도 통과하면 성공.
 * - 모두 실패하면 에러를 합쳐서 던짐.
 * - 동기/비동기 파싱 모두 지원.
 */
export class UnionSchema<T extends readonly BaseSchema<any>[]> extends BaseSchema<InferUnion<T>> {
  constructor(private readonly candidates: T) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<InferUnion<T>> {
    const aggregate = new ValidationError();
    const pending: Promise<InferUnion<T>>[] = [];

    for (const schema of this.candidates) {
      try {
        const result = this._callInnerParse(schema, input, path);

        // 비동기 후보는 나중에 한꺼번에 처리
        // 동기 성공 → 즉시 반환
        if (isPromise(result)) pending.push(result);
        else return result;
      } catch (e) {
        // 동기 실패 → 에러 합치기
        aggregate.merge(e);
      }
    }

    // 동기만 있었고 모두 실패
    if (pending.length === 0) throw aggregate;

    // 비동기 후보가 하나 이상: 첫 성공을 선택, 전부 실패면 합쳐 던짐
    return Promise.allSettled(pending).then((settled) => {
      for (const item of settled) {
        if (item.status === 'fulfilled') return item.value as InferUnion<T>;

        aggregate.merge(item.reason);
      }
      throw aggregate;
    });
  }
}
