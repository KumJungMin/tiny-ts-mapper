# tiny-ts-mapper

A tiny **schema builder** that gives you **runtime validation** and **TypeScript type inference** at the same time — with practical **DTO ⇄ Domain mapping** examples for clean architecture.  
Validate everything at the boundary and pass **clean, typed** data into your domain.

<br/>

## ✨ What you get

- **Runtime validation + types** from one schema declaration (`Infer` for types).
- **Helpful errors**: each issue has `path / code / message`.
- **Sync & async** validation (`parse`/`safeParse`, `parseAsync`/`safeParseAsync`).
- **Clean-architecture friendly**: schemas at boundaries, a pure domain layer.
- **Small, composable API**: `s.string()`, `s.number()`, `s.object()`, etc., plus `.optional()`, `.nullable()`, `.transform()`, `.refine()`, `.default()`.

<br/>

## 🧰 Requirements & Run

- Node.js (LTS recommended)
- TypeScript (if you want typing)
- `tsx` or `ts-node` to run examples

```bash
pnpm i           # or npm i / yarn
npx tsx ./src/demo/simple/user-mapper.smoke.ts
```

<br/>

## 🚀 Quick Start

```ts
import { s, Infer } from '@/schema';

// 1) Declare a schema
const UserSchema = s
  .object({
    id: s.number().int().min(1),
    name: s.string().min(1),
    email: s.string().email().nullable().optional(), // allows null or missing
  })
  .strict(); // reject unknown keys

// 2) Get a TypeScript type from the schema
type User = Infer<typeof UserSchema>;
// -> { id: number; name: string; email?: string | null | undefined }

// 3) Validate data at runtime (no exceptions with safeParse)
const r = UserSchema.safeParse(input);
if (r.success) {
  const user: User = r.data;
} else {
  console.log(r.error.issues); // [{ path, code, message }, ...]
}
```

<br/>

## 🧠 Core ideas (in plain words)

- **Schema classes** extend `BaseSchema<T>` and implement `_parse(value, path)`.
  - If the value is valid → return the typed value (`T`).
  - If not → **throw** a `ValidationError` with helpful `issues`.
- **Builder `s`** creates schemas:
  - Primitives: `s.string()`, `s.number()`, `s.boolean()`, `s.enum([...])`
  - Containers: `s.array(inner)`, `s.object(shape)`, `s.union([a, b])`
  - Modifiers: `.optional()` (allow `undefined`), `.nullable()` (allow `null`),
    `.transform(fn)`, `.refine(predicate)`, `.default(v)`
- **Error model** (`ValidationError`):  
  `issues: Array<{ path: (string|number)[], code: string, message: string }>`
  - Common codes: `invalid_type`, `too_small`, `too_big`, `invalid_string`,
    `invalid_enum`, `invalid_array`, `invalid_object`, `unrecognized_keys`, `custom`

<br/>

## 🧩 The most-used builders

```ts
// Strings
s.string().min(1).max(30).regex(/[a-z]/i).email();

// Numbers
s.number().int().min(1).max(100);

// Boolean
s.boolean();

// Enums
s.enum(['admin', 'user', 'guest'] as const);

// Arrays
s.array(s.string().min(1));

// Objects
s.object({ id: s.number(), name: s.string() }).strict();

// Unions
s.union([s.string(), s.number()]);

// Presence & nullability
s.string().nullable().optional();
// (Usually prefer .nullable().optional() when both are allowed)
```

<br/>

## 🧪 Parsing APIs (when to use what)

- `parse(value)`  
  Returns the value **or throws** `ValidationError`.  
  If an async check is inside, throws `AsyncParseError` → use `parseAsync`.

- `safeParse(value)`  
  Returns `{ success: true, data }` **or** `{ success: false, error }`.  
  No exceptions → great for controllers/handlers.

- Async versions: `parseAsync(value)`, `safeParseAsync(value)`.

<br/>

## 🧭 Clean Architecture example (DTO ⇄ Domain)

**DTO schema (Data layer)**

```ts
export type UserDTO = {
  ID: number | null;
  USER_NAME: string | null;
  EMAIL?: string | null;
  ROLE: 'admin' | 'user' | 'guest';
  CREATED_AT: string | null; // ISO
};

export const UserDTOSchema = s
  .object({
    ID: s.number().int().min(1).nullable(),
    USER_NAME: s.string().min(1).nullable(),
    EMAIL: s.string().email().nullable().optional(),
    ROLE: s.enum(['admin', 'user', 'guest'] as const),
    CREATED_AT: s.string().min(1).nullable(),
  })
  .strict();
```

**Domain (pure types)**

```ts
export enum UserRole {
  Admin = 'Admin',
  User = 'User',
  Guest = 'Guest',
}
export interface User {
  id: number;
  name: string;
  email?: string; // domain drops null by policy (optional)
  role: UserRole;
  createdAt: Date;
}
```

**Mapper (short version)**

```ts
import { ok, err, type Result, ValidationError } from '@/schema';
type R<T> = Result<T, ValidationError>;

export class UserMapper {
  toDomain(raw: unknown): R<User> {
    const parsed = UserDTOSchema.safeParse(raw);
    if (!parsed.success) return err(parsed.error);

    const dto = parsed.data;

    const t = Date.parse(dto.CREATED_AT as string);
    if (Number.isNaN(t)) {
      return err(
        new ValidationError([{ path: ['CREATED_AT'], code: 'custom', message: 'Invalid ISO date' }])
      );
    }

    const role = this.roleDtoToDomain(dto.ROLE);
    if (!role.ok) return role as R<User>;

    return ok({
      id: dto.ID!,
      name: dto.USER_NAME!,
      email: dto.EMAIL ?? undefined, // normalize null → undefined
      role: role.value,
      createdAt: new Date(t),
    });
  }

  // ...toDTO(...) similar: enum to string, Date → ISO (with error handling)
}
```

<br/>

## 🔍 Smoke test (what you’ll see)

```bash
npx tsx ./src/demo/simple/user-mapper.smoke.ts
```

**Example output (excerpt)**

```
[toDomain / OK #1] ✅ OK
{ id: 1, name: 'Lux', email: undefined, role: 'Admin', createdAt: 2025-08-31T12:00:00.000Z }

[toDomain / FAIL bad ROLE] ❌ ERR
{ message: 'Validation error',
  issues: [{ path: ['ROLE'], code: 'invalid_enum', message: 'Expected one of [admin, user, guest]' }] }

[toDTO / FAIL invalid Date] ❌ ERR
{ message: 'Validation error',
  issues: [{ path: ['createdAt'], code: 'custom', message: 'RangeError: Invalid time value' }] }
```

<br/>

## 🗂 Project layout

```
src/
  schema/   # schema builder + docs
  demo/     # DTO ⇄ Domain examples and smoke tests
LICENSE
```

- For deeper docs, see <a href="https://github.com/KumJungMin/tiny-ts-mapper/tree/main/src/schema">`src/schema/README.md`</a>

<br/>

## ❓FAQ

- **null vs undefined?**  
  Many teams accept both at the boundary and **normalize to `undefined`** in Domain.
- **Order of `.nullable()` and `.optional()`?**  
  Prefer `.nullable().optional()` for “null **or** missing **or** valid”.
- **Type error about BaseSchema mismatch?**  
  You likely imported **two different `BaseSchema`s** (barrel vs source, `src` vs `dist`). Unify imports.
