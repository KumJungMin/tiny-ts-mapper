import type { Result } from '@/schema';

import type { User } from '../entities/User';

export interface UserRepository {
  getById(id: number): Promise<Result<User>>;
}
