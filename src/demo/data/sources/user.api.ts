export interface Http {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, body: unknown): Promise<T>;
}

export class UserAPIDataSource {
  constructor(private readonly http: Http) {}

  getById(id: number) {
    return this.http.get(`/api/users/${id}`);
  }
}
