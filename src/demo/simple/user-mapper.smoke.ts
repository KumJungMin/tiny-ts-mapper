/**
 * Node로 바로 돌려보는 테스트 (성공/실패 케이스 한 파일)
 * 실행: npx tsx ./src/demo/simple/user-mapper.smoke.ts
 */

import { ValidationError } from '@/schema';
import { UserMapper } from '@/demo/data/mappers/user.mapper';
import type { User } from '@/demo/domain/entities/User';
import { UserRole } from '@/demo/domain/entities/User';

const mapper = new UserMapper();

/* ---------- 유틸 ---------- */
function printResult<T>(label: string, r: { ok: boolean; value?: T; error?: any }) {
  console.log(`\n[${label}]`);
  if (r.ok) {
    console.log('✅ OK');
    console.dir(r.value, { depth: null });
  } else {
    console.log('❌ ERR');
    if (r.error instanceof ValidationError) {
      console.dir({ message: r.error.message, issues: r.error.issues }, { depth: null });
    } else {
      console.dir({ message: String(r.error) }, { depth: null });
    }
  }
}

/* ---------- toDomain: 성공 케이스 ---------- */
const okRaw1 = {
  ID: 1,
  USER_NAME: 'Lux',
  EMAIL: null, // nullable + optional
  ROLE: 'admin',
  CREATED_AT: '2025-08-31T12:00:00.000Z',
};

const okRaw2 = {
  ID: 2,
  USER_NAME: 'Nova',
  // EMAIL 키 자체 없음(= optional)
  ROLE: 'user',
  CREATED_AT: '2024-01-01T00:00:00.000Z',
};

/* ---------- toDomain: 실패 케이스 ---------- */
const failRawMissingId = {
  // ID 누락 (optional 아님) -> invalid_type 에러 기대
  USER_NAME: 'NoId',
  ROLE: 'user',
  CREATED_AT: '2025-01-01T00:00:00.000Z',
};

const failRawBadRole = {
  ID: 3,
  USER_NAME: 'BadRole',
  ROLE: 'superuser', // 허용 enum 아님
  CREATED_AT: '2025-01-01T00:00:00.000Z',
};

const failRawBadDate = {
  ID: 4,
  USER_NAME: 'BadDate',
  ROLE: 'guest',
  CREATED_AT: 'not-a-date', // 파싱 실패
};

const failRawStrictUnknown = {
  ID: 5,
  USER_NAME: 'Strict',
  ROLE: 'user',
  CREATED_AT: '2025-01-01T00:00:00.000Z',
  EXTRA: 123, // strict()에서 거부
};

/* ---------- toDTO: 성공 케이스 ---------- */
const okDomainUser: User = {
  id: 10,
  name: 'Echo',
  role: UserRole.User,
  createdAt: new Date('2025-08-31T12:00:00.000Z'),
};

/* ---------- toDTO: 실패 케이스 ---------- */
const failDomainInvalidDate: User = {
  id: 11,
  name: 'BadISO',
  role: UserRole.Admin,
  // Invalid Date → toISOString()에서 RangeError
  createdAt: new Date(NaN),
} as User;

// 타입 강제 우회(실제 코드에서는 만들기 어려운 상황을 시뮬레이션)
const failDomainInvalidRole: User = {
  id: 12,
  name: 'BadRoleDomain',
  role: 'HACK' as unknown as UserRole, // 매퍼에서 invalid_enum로 처리
  createdAt: new Date('2025-08-31T12:00:00.000Z'),
};

/* ---------- 실행 ---------- */
(function main() {
  // toDomain
  printResult('toDomain / OK #1', mapper.toDomain(okRaw1));
  printResult('toDomain / OK #2 (EMAIL omitted)', mapper.toDomain(okRaw2));
  printResult('toDomain / FAIL missing ID', mapper.toDomain(failRawMissingId));
  printResult('toDomain / FAIL bad ROLE', mapper.toDomain(failRawBadRole));
  printResult('toDomain / FAIL bad CREATED_AT', mapper.toDomain(failRawBadDate));
  printResult('toDomain / FAIL strict unknown key', mapper.toDomain(failRawStrictUnknown));

  // toDTO
  printResult('toDTO / OK', mapper.toDTO(okDomainUser));
  printResult('toDTO / FAIL invalid Date', mapper.toDTO(failDomainInvalidDate));
  printResult('toDTO / FAIL invalid Role (domain)', mapper.toDTO(failDomainInvalidRole));
})();
