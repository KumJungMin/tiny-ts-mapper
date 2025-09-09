import { BaseSchema } from '../base/BaseSchema';
import type { Path } from '../core/type';
import { MaybePromise, ERROR_SENTINEL, isPromise, pushPath } from '../core/utils';
import { ValidationError } from '../core/error';
import { OptionalSchema } from '../base/OptionalSchema';

export type Shape = Record<string, BaseSchema<any>>;
type OutputOf<S extends Shape> = { [K in keyof S]: S[K]['_type'] };
type ObjectConfig = { passthrough?: boolean; strict?: boolean };

/**
 * ObjectSchema<S>
 * - shape에 정의된 각 필드를 검증한다.
 * - 기본적으로 정의된 필드만 허용
 *
 * - passthrough() 체이너로 나머지 필드도 허용할 수 있다.
 * - strict() 체이너로 정의되지 않은 필드를 에러로 만들 수도 있다.
 * - partial() 체이너로 모든 필드를 optional로 전환할 수 있다.
 * */
export class ObjectSchema<S extends Shape> extends BaseSchema<OutputOf<S>> {
  constructor(
    private readonly shape: S,
    private readonly config: ObjectConfig = {}
  ) {
    super();
  }

  protected _parse(input: unknown, path: Path): MaybePromise<OutputOf<S>> {
    // 1) 객체 형태 확인
    const isObject = typeof input === 'object' && input !== null && !Array.isArray(input);
    if (!isObject) {
      throw new ValidationError([{ path, code: 'invalid_object', message: 'Expected object' }]);
    }

    const record = input as Record<string, unknown>;
    const aggregate = new ValidationError();

    // 1) shapeKeys(검증할 키 목록)과 remainingKeys(나중에 passthrough용) 준비
    const shapeKeys = Object.keys(this.shape);
    const remainingKeys = new Set(Object.keys(record));

    // 2) strict: 정의되지 않은 키 수집 - strict 모드라면 정의되지 않은 키는 에러
    if (this.config.strict) {
      for (const key of remainingKeys) {
        const isDefined = key in this.shape;

        if (!isDefined) {
          aggregate.add({
            path: pushPath(path, key),
            code: 'unrecognized_keys',
            message: `Unrecognized key: '${key}'`,
          });
        }
      }
    }

    // 3) 각 필드 파싱 (에러는 모으고, 실패 필드는 SENTINEL 마킹)
    type Pair = [string, MaybePromise<any | typeof ERROR_SENTINEL>];

    const parseField = (key: string): Pair => {
      remainingKeys.delete(key);
      const fieldPath = pushPath(path, key);
      const schema = this.shape[key] as BaseSchema<any>;
      try {
        const parsed = this._callInnerParse(schema, record[key], fieldPath);

        return isPromise(parsed)
          ? [key, parsed.catch((e) => (aggregate.merge(e), ERROR_SENTINEL))]
          : [key, parsed];
      } catch (e) {
        aggregate.merge(e);
        return [key, ERROR_SENTINEL];
      }
    };

    // pairs(shapeKeys에 대한 [키, 파싱결과] 쌍 목록), hasAsync(비동기 여부)
    const pairs: Pair[] = shapeKeys.map(parseField);
    const hasAsync = pairs.some(([, v]) => isPromise(v));

    // 4) 결과 조립: 에러 있으면 throw, 아니면 SENTINEL 제거 후 객체 반환
    const buildOutput = (resolved: [string, any][]): OutputOf<S> => {
      if (aggregate.hasIssues) throw aggregate;

      const output: Record<string, unknown> = {};

      for (const [k, v] of resolved) {
        if (v !== ERROR_SENTINEL) output[k] = v;
      }

      // passthrough 모드: 허용되지 않은 나머지 필드도 채우기
      if (this.config.passthrough) {
        for (const k of remainingKeys) output[k] = record[k];
      }

      return output as OutputOf<S>;
    };

    if (hasAsync) {
      // Promise가 섞여 있으면 모두 resolve 후 조립
      return Promise.all(pairs.map(async ([k, v]) => [k, await v] as [string, any])).then(
        buildOutput
      );
    } else {
      return buildOutput(pairs as [string, any][]);
    }
  }

  // ── 옵션 체이너들 ────────────────────────────────────────────────────────────────
  passthrough = () => new ObjectSchema(this.shape, { ...this.config, passthrough: true });

  strict = () => new ObjectSchema(this.shape, { ...this.config, strict: true });

  /**
   * 모든 필드를 optional로 전환
   * - 스키마가 optional() 체이너를 노출하면 그것을 사용
   * - 아니면 OptionalSchema 래퍼로 감싼다
   */
  partial = (): ObjectSchema<{ [K in keyof S]: BaseSchema<S[K]['_type']> }> => {
    const next: Record<string, BaseSchema<any>> = {};

    for (const key in this.shape) {
      const schema = this.shape[key] as BaseSchema<any>;
      const isOptional = typeof (schema as any).optional === 'function';

      if (isOptional) {
        next[key] = (schema as any).optional() as BaseSchema<any>;
      } else {
        next[key] = new OptionalSchema(schema);
      }
    }
    return new ObjectSchema(next as { [K in keyof S]: BaseSchema<S[K]['_type']> }, this.config);
  };
}
