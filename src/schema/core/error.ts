import type { Issue } from './type';

/**
 * ValidationError
 * - 스키마 파싱 중 발생한 검증 이슈들을 모아두는 에러.
 * - 여러 이슈를 누적(merge)할 수 있다.
 */
export class ValidationError extends Error {
  /** 누적된 검증 이슈 목록 */
  public readonly issues: Issue[];

  constructor(issues: Issue[] = [], message = 'Validation error') {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;

    const capture = (Error as any).captureStackTrace;
    if (typeof capture === 'function') {
      capture(this, ValidationError);
    }
  }

  /** 타입 가드: unknown → ValidationError */
  static is(e: unknown): e is ValidationError {
    return e instanceof ValidationError;
  }

  /** 이슈 하나 추가 */
  add(issue: Issue): this {
    this.issues.push(issue);
    return this;
  }

  /** 이슈 여러 개 추가 */
  addAll(issues: Issue[]): this {
    if (issues.length) this.issues.push(...issues);
    return this;
  }

  /**
   * 다른 에러를 병합.
   * - ValidationError면 이슈들을 그대로 합치고
   * - 그 외 에러면 message를 custom 이슈로 변환하여 추가
   */
  merge(err: unknown): this {
    if (ValidationError.is(err)) {
      if (err.issues.length) this.issues.push(...err.issues);
      return this;
    }
    const message = (err as Error)?.message ?? String(err);
    this.issues.push({ path: [], code: 'custom', message });
    return this;
  }

  /** 하나 이상의 이슈가 있는가 */
  get hasIssues(): boolean {
    return this.issues.length > 0;
  }

  /** 직렬화-friendly 표현 */
  toJSON() {
    return { name: this.name, message: this.message, issues: this.issues };
  }
}

/**
 * AsyncParseError
 * - 동기 API(parse)를 사용했는데 비동기 검증이 섞여있는 경우 발생.
 */
export class AsyncParseError extends Error {
  constructor() {
    super('Encountered async validations; use parseAsync()');
    this.name = 'AsyncParseError';
  }
}
