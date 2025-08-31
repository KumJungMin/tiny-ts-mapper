import { ValidationError, err, type Result } from '@/schema';

import type { User } from '@/demo/domain/entities/User';
import type { UserRepository } from '@/demo/domain/repositories/UserRepository';
import { UserAPIDataSource } from '@/demo/data/sources/user.api';
import * as UserMapper from '@/demo/data/mappers/user.mapper';

export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly api: UserAPIDataSource) {}

  async getById(id: number): Promise<Result<User, ValidationError>> {
    try {
      const mapper = new UserMapper.UserMapper();
      const raw = await this.api.getById(id);
      return mapper.toDomain(raw);
    } catch (e) {
      return err(new ValidationError([{ path: [], code: 'custom', message: String(e) }]));
    }
  }
}
