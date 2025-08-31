# tiny-ts-mapper — Schema Module Guide

- `schema` is a lightweight schema builder that provides **runtime validation** and **TypeScript type inference** together.
- Validate inputs at the **boundary** and pass only clean, well-typed data into your domain.

<br/>

## Core Ideas

- Use a declared schema to validate values at runtime.
- Derive a TypeScript type (`Infer`) from the same schema declaration.
- Errors come with structured **state** (`ValidationError.issues` → path / code / message) so you can see exactly **what** failed and **where**.
- Supports both **sync** and **async** validation.

<br/>

## Quick Start

```ts
import { s, Infer } from '@/schema';

// 1) Define a schema
const UserSchema = s
  .object({
    id: s.number().int().min(1),
    name: s.string().min(1),
    email: s.string().email().nullable().optional(), // can be absent (null/undefined allowed)
  })
  .strict(); // reject keys not declared

// 2) Infer the TS type
type User = Infer<typeof UserSchema>;
// -> { id: number; name: string; email?: string | null | undefined }

// 3) Validate at runtime
const result = UserSchema.safeParse(someInput);
if (result.success) {
  const user: User = result.data;
} else {
  console.log(result.error.issues); // see what failed and why
}
```

<br/>

## Schema Overview

### Anatomy

- Every schema extends `BaseSchema<T>`.
- The core implementation is `protected _parse(value, path): T | Promise<T>`.
  - success: returns `T`
  - failure: throws `ValidationError`
- `path` tracks the failing location (e.g., `['users', 0, 'name']` → `users[0].name`).

### Common Public API

- `parse(value)` — synchronous parse (success: returns value; failure: throws). If any async logic exists inside, throws `AsyncParseError`.
- `parseAsync(value)` — asynchronous parse (Promise).
- `safeParse(value)` — does not throw; returns `{ success: false, error }` on failure.
- `safeParseAsync(value)` — async non-throwing parse.
- `optional()` — allow `undefined`
- `nullable()` — allow `null`
- `.transform()`, `.refine()`, `.default()` — extension hooks

<br/>

## Error Model (ValidationError)

- `ValidationError` contains `issues: Issue[]`.

**`Issue` shape:**

```ts
{
  path: (string | number)[],
  code:
    | 'invalid_type'
    | 'too_small'
    | 'too_big'
    | 'invalid_string'
    | 'invalid_enum'
    | 'invalid_array'
    | 'invalid_object'
    | 'unrecognized_keys'
    | 'custom',
  message: string
}
```

**Example:**

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

## Schema Catalog & Examples

### String

```ts
s.string().min(1).max(30).email();
```

- Wrong type → `invalid_type`
- Length/regex/email checks

### Number

```ts
s.number().int().min(1).max(100);
```

- `invalid_type`, integer check, range checks

### Boolean

```ts
s.boolean();
```

### Enum

```ts
s.enum(['admin', 'user', 'guest'] as const);
```

- Not in list → `invalid_enum`

### Array

```ts
s.array(s.string().min(1));
```

- Not an array → `invalid_array`
- Each element is validated with the inner schema; failing index appears in `path`.

### Object

```ts
s.object({
  id: s.number().int(),
  name: s.string().min(1),
  email: s.string().email().nullable().optional(),
}).strict();
```

- `.strict()` : unknown keys trigger `unrecognized_keys`
- `.passthrough()` lets unknown keys pass through
- `.partial()` makes all fields optional

### Union

```ts
s.union([s.string(), s.number()]);
```

- Passes if **any** candidate passes; if all fail, issues are merged.
- If any candidate is async, prefer `parseAsync` / `safeParseAsync`.

### optional / nullable

```ts
s.string().nullable().optional();
```

- `optional` → allow `undefined`
- `nullable` → allow `null`
- Common pattern: `nullable().optional()` when “absent or null is OK”.

<br/>

## parse vs safeParse (Must-Know)

- `parse(value)`
  - success: returns validated data
  - failure: throws `ValidationError`
  - if async logic exists inside, sync `parse()` throws `AsyncParseError` → use `parseAsync`

- `safeParse(value)`
  - success: `{ success: true, data }`
  - failure: `{ success: false, error: ValidationError }`
  - No throw; convenient in controllers/handlers

- Async counterparts: `parseAsync`, `safeParseAsync` (use when any transform/refine is async)

<br/>

## Using It in Clean Architecture (Brief)

- **Data layer**: define DTO schemas for external API/DB → `safeParse` → map → Domain types
- **Domain layer**: avoid schema dependency; use pure types/entities only
- **Presentation**: validate request bodies upfront with request schemas

**Flow:**

```
Presentation -> (Request schema validation) -> Use Case -> Repository (Data)
                          ↑                                 ↓
                   Domain types                    (DTO schema validation) + Mapper
```

<br/>

## DTO → Domain Mapping (Condensed)

```ts
// DTO schema
const UserDTOSchema = s
  .object({
    ID: s.number().int().min(1).nullable(),
    USER_NAME: s.string().min(1).nullable(),
    EMAIL: s.string().email().nullable().optional(),
    ROLE: s.enum(['admin', 'user', 'guest'] as const),
    CREATED_AT: s.string().min(1).nullable(),
  })
  .strict();

// 1) Validate DTO
const parsed = UserDTOSchema.safeParse(raw);
if (!parsed.success) return err(parsed.error);

// 2) Extra checks / mapping
const dto = parsed.data;
const t = Date.parse(dto.CREATED_AT as string);
if (Number.isNaN(t)) {
  return err(
    new ValidationError([{ path: ['CREATED_AT'], code: 'custom', message: 'Invalid ISO date' }])
  );
}

// 3) Build domain object (e.g., normalize null -> undefined)
return ok({
  id: dto.ID!,
  name: dto.USER_NAME!,
  email: dto.EMAIL ?? undefined,
  role: mappedRole,
  createdAt: new Date(t),
});
```

<br/>

## FAQ

**Q. How should I handle `null` vs `undefined`?**  
A. Even if DTOs allow `null`/`undefined`, many domains normalize to `undefined`. Choose a policy and apply it consistently.

**Q. Does the order of `nullable().optional()` matter?**  
A. The resulting type is effectively the same, but a common, readable pattern is `nullable().optional()` to mean “value may be null or omitted.”

**Q. I’m getting `AsyncParseError`.**  
A. You called sync `parse()` while the schema has async logic (e.g., async `refine`/`transform`). Use `parseAsync()` / `safeParseAsync()`.

**Q. I see type mismatches like `BaseSchema<any>`.**  
A. This can happen if the same module is imported from multiple build paths (source vs build output). Import from a **single consistent path**.

<br/>

## Tips

- To remove `null` from the domain, accept `null`/`undefined` at the DTO boundary and normalize to `undefined`.
- Object/Array schemas collect inner errors and report them together.
- Quick type check: `type X = Infer<typeof schema>` to confirm the inferred TS type matches expectations.
