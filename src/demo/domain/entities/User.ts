export enum UserRole {
  Admin = 'Admin',
  User = 'User',
  Guest = 'Guest',
}

export interface User {
  id: number;
  name: string;
  email?: string;
  role: UserRole;
  createdAt: Date;
}
