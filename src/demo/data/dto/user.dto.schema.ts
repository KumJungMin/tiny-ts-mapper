import { s } from '@/schema';

/**
 * UserDTOSchema (DATA 경계 전용 런타임 검증)
 */

export const UserDTOSchema = s
  .object({
    /**
     * ID: 정수 PK (≥ 1). 신규 생성 전/임시 상태에서는 null이 올 수 있어 허용.
     * 타입: number | null
     */
    ID: s.number().int().min(1).nullable(),

    /**
     * USER_NAME: 표시 이름. 최소 1자. 상위 시스템에서 값이 없을 때 null로 올 수 있음.
     * 타입: string | null
     */
    USER_NAME: s.string().min(1).nullable(),

    /**
     * EMAIL: 이메일 형식일 때만 허용.
     * - .nullable(): null 허용(명시적 미기입)
     * - .optional(): 키 자체가 아예 없는 경우도 허용
     * 타입: string | null | undefined
     */
    EMAIL: s.string().email().nullable().optional(),

    /**
     * ROLE: 허용된 문자열 리터럴만 통과. (도메인에서는 UserRole enum으로 매핑)
     * 타입: 'admin' | 'user' | 'guest'
     */
    ROLE: s.enum(['admin', 'user', 'guest'] as const),

    /**
     * CREATED_AT: ISO 문자열 기대. (여기서는 형식만 최소 길이 체크)
     * - 실제 Date 변환/정합성은 매퍼에서 수행(파싱 실패 시 ValidationError로 래핑 권장)
     * 타입: string | null
     */
    CREATED_AT: s.string().min(1).nullable(),
  })
  /**
   * .strict():
   *  - 스키마에 정의되지 않은 모든 키를 거부.
   *  - 필요 시 정책을 바꿀 때는 .passthrough()/.strip()/.catchall() 같은 전략 사용을 고려.
   */
  .strict();
