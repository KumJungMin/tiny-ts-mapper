import { ok, err, type Result, ValidationError } from '@/schema';

import type { User } from '@/demo/domain/entities/User';
import { UserRole } from '@/demo/domain/entities/User';
import type { UserDTO } from '@/demo/data/dto/user.dto';
import { UserDTOSchema } from '@/demo/data/dto/user.dto.schema';

type R<T> = Result<T, ValidationError>;

/**
 * ok의 역할
 * - 성공적인 결과를 나타내는 객체를 생성합니다.
 * - 일반적으로 도메인 모델로 변환할 때 사용됩니다.
 * */
export class UserMapper {
  private roleDtoToDomain(role: UserDTO['ROLE']): R<UserRole> {
    switch (role) {
      case 'admin':
        return ok(UserRole.Admin);
      case 'user':
        return ok(UserRole.User);
      case 'guest':
        return ok(UserRole.Guest);
      default:
        return err(
          new ValidationError([
            { path: ['role'], code: 'invalid_enum', message: `Unknown role: ${role}` },
          ])
        );
    }
  }

  private roleDomainToDto(role: UserRole): R<UserDTO['ROLE']> {
    switch (role) {
      case UserRole.Admin:
        return ok('admin');
      case UserRole.User:
        return ok('user');
      case UserRole.Guest:
        return ok('guest');
      default:
        return err(
          new ValidationError([
            { path: ['role'], code: 'invalid_enum', message: `Unknown role: ${r}` },
          ])
        );
    }
  }

  /** unknown → DTO 스키마 검증 → Domain(User) 변환 */
  toDomain(raw: unknown): R<User> {
    // DTO 검증: safeParse를 사용해 raw를 UserDTOSchema에 맞게 검증합니다.
    const parsed = UserDTOSchema.safeParse(raw);

    if (parsed.success) {
      const dto = parsed.data;

      const time = Date.parse(dto.CREATED_AT);

      if (Number.isNaN(time)) {
        const error = new ValidationError([
          { path: ['CREATED_AT'], code: 'custom', message: 'Invalid ISO date' },
        ]);
        return err(error);
      }

      const roleResult = this.roleDtoToDomain(dto.ROLE);

      if (roleResult.ok) {
        return ok({
          id: dto.ID,
          name: dto.USER_NAME,
          email: dto.EMAIL ?? undefined,
          role: roleResult.value,
          createdAt: new Date(time),
        });
      } else {
        return roleResult as R<User>;
      }
    } else {
      return err(parsed.error);
    }
  }

  /** Domain(User) → DTO(UserDTO) 변환 */
  toDTO(u: User): R<UserDTO> {
    const roleResult = this.roleDomainToDto(u.role);

    if (!roleResult.ok) return roleResult as R<UserDTO>;

    let iso: string;
    try {
      iso = u.createdAt.toISOString();
    } catch (e) {
      return err(
        new ValidationError([{ path: ['createdAt'], code: 'custom', message: String(e) }])
      );
    }

    return ok({
      ID: u.id,
      USER_NAME: u.name,
      EMAIL: u.email ?? null,
      ROLE: roleResult.value,
      CREATED_AT: iso,
    });
  }
}
