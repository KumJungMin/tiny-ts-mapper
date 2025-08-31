# tiny-ts-mapper — Schema 모듈 가이드

- `schema`는 런타임 검증과 TypeScript 타입 추론을 동시에 제공하는 경량 스키마 빌더입니다.
- 경계(Boundary)에서 입력을 검증하고, 도메인에는 깨끗한 타입만 전달할 수 있습니다.

<br/>

## 핵심 아이디어

- 선언한 스키마로 런타임에 값 검증을 수행합니다.
- 같은 스키마 선언으로 TypeScript 타입(`Infer`)을 얻습니다.
- 에러는 상태(`ValidationError.issues`(path / code / message)) 와 함께 제공되기에, 어디가 왜 틀렸는지 파악할 수 있습니다.
- 동기/비동기 검증을 모두 지원합니다.

<br/>

## 사용 예시 (Quick Start)

```ts
import { s, Infer } from '@/schema';

// 1) 스키마 정의
const UserSchema = s
  .object({
    id: s.number().int().min(1),
    name: s.string().min(1),
    email: s.string().email().nullable().optional(), // 없어도 되고(null/undefined 허용)
  })
  .strict(); // 정의 안 된 키는 거부

// 2) 타입 자동 추론
type User = Infer<typeof UserSchema>;
// -> { id: number; name: string; email?: string | null | undefined }

// 3) 런타임 검증
const result = UserSchema.safeParse(someInput);
if (result.success) {
  const user: User = result.data;
} else {
  console.log(result.error.issues); // 어디가 왜 틀렸는지
}
```

<br/>

## 스키마 설명

### 스키마의 구조

- 모든 스키마는 `BaseSchema<T>`를 상속합니다.
- 핵심 구현은 `protected _parse(value, path): T | Promise<T>` 입니다.
  - 성공: `T` 반환
  - 실패: `ValidationError` 예외 throw
- `path`는 오류 위치 추적용 배열입니다. (예: `['users', 0, 'name']` → `users[0].name`)

### 공통 퍼블릭 API

- `parse(value)` — 동기 파싱(성공: 값 반환, 실패: 예외). 내부에 비동기가 섞이면 `AsyncParseError` 발생.
- `parseAsync(value)` — 비동기 파싱(Promise).
- `safeParse(value)` — 실패 시 예외를 던지지 않고 `{ success: false, error }` 반환.
- `safeParseAsync(value)` — 비동기 안전 파싱.
- `optional()` — `undefined` 허용
- `nullable()` — `null` 허용
- `.transform()`, `.refine()`, `.default()` — 확장 기능

<br/>

## 에러 모델 (ValidationError)

- `ValidationError`는 `issues: Issue[]` 를 담고 있습니다.

`Issue` 구조:

```ts
{
  path: (string | number)[],
  code: 'invalid_type' | 'too_small' | 'too_big' | 'invalid_string' | 'invalid_enum' | 'invalid_array' | 'invalid_object' | 'unrecognized_keys' | 'custom',
  message: string
}
```

예시:

```json
{
  "message": "Validation error",
  "issues": [
    { "path": ["ID"], "code": "invalid_type", "message": "Expected number" },
    { "path": ["ROLE"], "code": "invalid_enum", "message": "Expected one of [admin, user, guest]" }
  ]
}
```

<br/>

## 스키마별 요약 & 예제

### 문자열 (String)

```ts
s.string().min(1).max(30).email();
```

- 잘못된 타입 → `invalid_type`
- 길이/정규식/이메일 형식 검사

<br/>

### 숫자 (Number)

```ts
s.number().int().min(1).max(100);
```

- `invalid_type`, 정수 검사, 범위 검사

<br/>

### 불리언 (Boolean)

```ts
s.boolean();
```

<br/>

### Enum

```ts
s.enum(['admin', 'user', 'guest'] as const);
```

- 목록에 없으면 `invalid_enum`

<br/>

### 배열 (Array)

```ts
s.array(s.string().min(1));
```

- 배열이 아니면 `invalid_array`
- 각 요소는 내부 스키마로 재검증되며, 인덱스가 `path`에 포함됩니다.

<br/>

### 객체 (Object)

```ts
s.object({
  id: s.number().int(),
  name: s.string().min(1),
  email: s.string().email().nullable().optional(),
}).strict();
```

- `.strict()` : 선언되지 않은 키는 `unrecognized_keys` 오류 발생
- `.passthrough()` 옵션이 있으면 unknown 키를 통과시킵니다.
- `.partial()` 로 모든 필드를 optional 처리할 수 있습니다.

<br/>

### 유니언 (Union)

```ts
s.union([s.string(), s.number()]);
```

- 후보 중 하나라도 통과하면 OK. 모두 실패하면 모든 이슈를 합쳐서 보고합니다.
- 내부에 비동기 스키마가 있으면 `parseAsync`/`safeParseAsync` 사용 권장.

<br/>

### optional / nullable

```ts
s.string().nullable().optional();
```

- `undefined` 허용 (optional)
- `null` 허용 (nullable)
- 보통 `nullable().optional()` 조합을 권장합니다(값이 없거나 null도 허용되는 경우).

<br/>

## parse vs safeParse (꼭 알아두기)

- `parse(value)`
  - 성공: 검증된 값 반환
  - 실패: `ValidationError` 예외 던짐
  - 내부에 비동기 검증이 섞였으면 `AsyncParseError` 발생 — `parseAsync` 사용 권장

- `safeParse(value)`
  - 성공: `{ success: true, data }`
  - 실패: `{ success: false, error: ValidationError }`
  - 예외를 던지지 않으므로 컨트롤러, 핸들러에서 사용하기 편리

- 비동기 버전: `parseAsync`, `safeParseAsync` (내부에 Promise가 섞이거나 transform/refine가 async일 때 사용)

<br/>

## 클린 아키텍처에서의 활용 (짧게)

- Data 레이어: 외부 API/DB의 DTO 스키마 정의 → `safeParse` → Mapper → Domain 타입으로 변환
- Domain 레이어: 스키마에 의존하지 않고 순수 타입/엔티티만 사용
- Presentation: 요청 바디 검증을 요청 스키마로 1차 필터링

간단 흐름:

```
Presentation -> (요청 스키마 검증) -> Use Case -> Repository(Data)
                          ↑                         ↓
                    Domain 타입                (DTO 스키마 검증) + Mapper
```

<br/>

## DTO → Domain 매핑 예시 (요약)

```ts
// DTO 스키마
const UserDTOSchema = s
  .object({
    ID: s.number().int().min(1).nullable(),
    USER_NAME: s.string().min(1).nullable(),
    EMAIL: s.string().email().nullable().optional(),
    ROLE: s.enum(['admin', 'user', 'guest'] as const),
    CREATED_AT: s.string().min(1).nullable(),
  })
  .strict();

// 1) DTO 검증
const parsed = UserDTOSchema.safeParse(raw);
if (!parsed.success) return err(parsed.error);

// 2) 추가 검증/매핑
const dto = parsed.data;
const t = Date.parse(dto.CREATED_AT as string);
if (Number.isNaN(t)) {
  return err(
    new ValidationError([{ path: ['CREATED_AT'], code: 'custom', message: 'Invalid ISO date' }])
  );
}

// 3) 도메인 객체 생성(예: null -> undefined 정규화)
return ok({
  id: dto.ID!,
  name: dto.USER_NAME!,
  email: dto.EMAIL ?? undefined,
  role: mappedRole,
  createdAt: new Date(t),
});
```

<br/>

## 의문 사항

Q. `null`과 `undefined`는 어떻게 다루나요?  
A. DTO에서 `null` 혹은 `undefined`를 허용하더라도 도메인에서는 보통 `undefined`로 정규화합니다. 정책에 따라 `null`을 유지할 수도 있습니다.

<br/>

Q. `nullable().optional()` 순서 중요해요?  
A. 결과 타입은 비슷하지만 권장 패턴은 `nullable().optional()`입니다: “값이 없거나(null) 유효”를 허용합니다.

<br/>

Q. `AsyncParseError`가 나와요.  
A. 내부에 비동기 검증(예: async refine, transform)이 섞여 있을 때 동기 `parse()`를 호출하면 발생합니다. `parseAsync()`/`safeParseAsync()`를 사용하세요.

<br/>

Q. 타입 불일치(`BaseSchema<any>` 등)가 떠요.  
A. 같은 모듈을 중복 임포트(소스/빌드 산출물 혼용)하면 발생합니다. 한 경로로만 임포트하세요.

<br/>

## 팁

- 도메인에서 `null`을 제거하려면 DTO에서 `null`/`undefined`를 받아 `undefined`로 정규화하세요.
- Object/Array 스키마는 내부 에러를 모아 한 번에 전달합니다.
- 타입 확인: `type X = Infer<typeof schema>`로 TS 타입이 기대한 대로 나오는지 빠르게 검사하세요.
