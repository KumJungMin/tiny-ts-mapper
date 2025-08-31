export type UserDTO = {
  ID: number | null;
  USER_NAME: string;
  EMAIL?: string | null;
  ROLE: 'admin' | 'user' | 'guest';
  CREATED_AT: string | null; // ISO
};
