import { UserMapper } from '@/demo/data/mappers/user.mapper';

// 벤치마킹용 데이터 크기
const SIZE = 100_000;

const allowedRoles = ['admin', 'user', 'guest'] as const;

function manualToDomain(raw: any) {
  const allowedKeys = ['ID', 'USER_NAME', 'EMAIL', 'ROLE', 'CREATED_AT'];
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.includes(key)) return { ok: false, error: 'unrecognized_keys' };
  }
  if (typeof raw.ID !== 'number' || raw.ID < 1) return { ok: false, error: 'ID' };
  if (typeof raw.USER_NAME !== 'string' || raw.USER_NAME.length < 1) return { ok: false, error: 'USER_NAME' };
  if (raw.EMAIL !== undefined && raw.EMAIL !== null && typeof raw.EMAIL !== 'string') return { ok: false, error: 'EMAIL' };
  if (!allowedRoles.includes(raw.ROLE)) return { ok: false, error: 'ROLE' };
  if (typeof raw.CREATED_AT !== 'string' || raw.CREATED_AT.length < 1) return { ok: false, error: 'CREATED_AT' };
  const t = Date.parse(raw.CREATED_AT);
  if (Number.isNaN(t)) return { ok: false, error: 'CREATED_AT' };
  return {
    ok: true,
    value: {
      id: raw.ID,
      name: raw.USER_NAME,
      email: raw.EMAIL ?? undefined,
      role: raw.ROLE,
      createdAt: new Date(t)
    }
  };
}

// 1. 하드한 경우 (nullable, optional, enum, strict, invalid 등 다양한 검증 포함)
const hardRawList = Array.from({ length: SIZE }, (_, i) => ({
  ID: i % 2 === 0 ? i + 1 : null,
  USER_NAME: i % 3 === 0 ? null : `User${i + 1}`,
  EMAIL: i % 10 === 0 ? undefined : (i % 3 === 0 ? null : `user${i + 1}@example.com`),
  ROLE: i % 5 === 0 ? 'invalid' : (i % 2 === 0 ? 'admin' : 'user'),
  CREATED_AT: i % 7 === 0 ? 'invalid-date' : '2025-08-31T12:00:00.000Z',
  UNKNOWN: i
}));

// 2. 간단한 경우 (모든 값이 정상, unknown 없음)
const simpleRawList = Array.from({ length: SIZE }, (_, i) => ({
  ID: i + 1,
  USER_NAME: `User${i + 1}`,
  EMAIL: `user${i + 1}@example.com`,
  ROLE: 'admin',
  CREATED_AT: '2025-08-31T12:00:00.000Z'
}));

// 3. 실패가 있는 경우 (정상 80%, 실패 20% 비율)
const mixedRawList = Array.from({ length: SIZE }, (_, i) =>
  i % 5 === 0
    ? { // 실패 케이스
        ID: null,
        USER_NAME: null,
        EMAIL: 123,
        ROLE: 'hacker',
        CREATED_AT: 'not-a-date'
      }
    : { // 정상 케이스
        ID: i + 1,
        USER_NAME: `User${i + 1}`,
        EMAIL: `user${i + 1}@example.com`,
        ROLE: 'admin',
        CREATED_AT: '2025-08-31T12:00:00.000Z'
      }
);

const mapper = new UserMapper();

function runScenario(label: string, rawList: any[]) {
  // 수동 방식
  console.time(`[수동] ${label}`);
  const before = rawList.map(manualToDomain);
  console.timeEnd(`[수동] ${label}`);
  const beforeOk = before.filter(r => r.ok).length;
  console.log(`[수동] ${label}: 성공 ${beforeOk}, 실패 ${before.length - beforeOk}`);

  // ts-mapper 방식
  console.time(`[ts-mapper] ${label}`);
  const after = rawList.map(raw => mapper.toDomain(raw));
  console.timeEnd(`[ts-mapper] ${label}`);
  const afterOk = after.filter(r => r.ok).length;
  console.log(`[ts-mapper] ${label}: 성공 ${afterOk}, 실패 ${after.length - afterOk}`);
}

console.log('\n--- 1. 하드한 데이터셋 ---');
runScenario('하드 케이스', hardRawList);

console.log('\n--- 2. 간단한 데이터셋 ---');
runScenario('간단 케이스', simpleRawList);

console.log('\n--- 3. 정상/실패 혼합 데이터셋 ---');
runScenario('혼합 케이스', mixedRawList);