# AGENTS.md — YW-EIMS

## Project Overview

Enterprise Information Management System. NestJS 11 + Prisma 6 + PostgreSQL backend, Vue 3 + SoybeanAdmin frontend. pnpm monorepo.

## Database Naming Convention

**Schema**: `public` (system tables), `material` (business tables). Use `@@schema()` on every model.

| Layer | Convention | Example |
|---|---|---|
| Table name | snake_case, plural, `@@map()` | `@@map("system_user")` |
| Column name | snake_case, `@map()` | `userName String @map("user_name")` |
| Prisma field | camelCase (TypeScript side) | `userName`, `createTime` |
| DTO / Entity property | camelCase | `CreateUserDto.userName` |
| API JSON response | camelCase (auto from Prisma) | `{ "userName": "admin" }` |

**Rule**: Every multi-word column MUST have `@map("snake_case")`. Single-word columns (`id`, `password`, `status`, `roles`, `buttons`) need no `@map`.

## Prisma Workflow

Schema location: `backend/libs/database/prisma/schema.prisma` (not default path).

All Prisma commands require `--schema` flag or use the npm scripts:

```bash
cd backend
pnpm prisma:generate    # regenerate client
pnpm prisma:validate    # check schema syntax
pnpm prisma:migrate     # create + apply migration (interactive)
pnpm prisma:seed        # idempotent seed data
pnpm prisma:studio      # visual DB browser
```

**Column rename**: Prisma does not auto-detect renames. Manual steps:
1. Add `@map("new_name")` to schema
2. Create migration dir + SQL with `ALTER TABLE ... RENAME COLUMN`
3. `npx prisma db execute --file <migration.sql>` to run SQL
4. `npx prisma migrate resolve --applied <migration_name>` to register

**Never** use `prisma db push` for column renames on tables with array columns — it generates DROP+ADD instead of RENAME, which fails on PostgreSQL array types.

## Backend Architecture

NestJS monorepo. App entry: `apps/api/src/`. Libraries under `libs/`:

| Lib | Purpose |
|---|---|
| `common` | Response interceptor, exception filter, pagination DTO, decorators |
| `config` | `.env` loading + Joi validation |
| `database` | PrismaService (global), PrismaModule, schema, migrations, seed |
| `auth` | JWT login/refresh, JwtGuard, `@CurrentUser()` decorator |
| `user` | System user CRUD |
| `material` | Material, Unit, MaterialCodeRule CRUD |

Each lib exports via `libs/<name>/src/index.ts`. Import with path alias `@eims/<name>`.

## Key Commands

```bash
# Backend
cd backend
pnpm start:dev         # hot-reload dev server on :3000
pnpm build             # production build
pnpm lint              # eslint --fix
pnpm test              # jest unit tests

# Frontend
cd frontend
pnpm dev               # dev server on :9527 (proxies /api to :3000)
pnpm build             # production build
```

## API Conventions

- Success: `{ "code": "0000", "msg": "success", "data": ... }`
- Auth header: `Authorization: Bearer <token>`
- Token expired code: `9999`
- Force logout code: `8888`
- Default admin: `superadmin` / `123456`

## Style

- Backend: single quotes, trailing commas (`.prettierrc`)
- No `as any`, `@ts-ignore`, or `@ts-expect-error`
- Passwords: bcrypt hashed, never returned in API responses
