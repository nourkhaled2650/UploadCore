# Auth Feature

## Overview

JWT-based authentication with refresh token rotation. Access tokens are short-lived (15m) and sent as Bearer tokens. Refresh tokens are long-lived (7d), stored as httpOnly cookies, and hashed with SHA256 before being persisted in the database.

---

## Endpoints

| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/auth/register` | None | Create a new user account |
| POST | `/auth/login` | LocalAuthGuard | Validate credentials, issue tokens |
| POST | `/auth/refresh` | None | Rotate refresh token, issue new access token |
| POST | `/auth/logout` | JwtAuthGuard | Revoke current refresh token |
| POST | `/auth/logout-all` | JwtAuthGuard | Revoke all refresh tokens for user |
| GET | `/auth/me` | JwtAuthGuard | Return current user info |

---

## Auth Flows

### Register

```
POST /auth/register { email, password, firstName, lastName }
  → validate RegisterDto
  → check email not taken (409 Conflict if taken)
  → hash password (bcrypt, 12 rounds)
  → create user with status=PENDING
  → return UserEntity (no password)
```

> New users are created with `status=PENDING`. They cannot log in until their status is set to `ACTIVE`.

---

### Login

```
POST /auth/login { email, password }
  → LocalAuthGuard triggers LocalStrategy
  → look up user by email (exclude soft-deleted)
  → compare password with bcrypt
  → check user.status === ACTIVE (403 if not)
  → generate accessToken (JWT, 15m, signed with JWT_ACCESS_SECRET)
  → generate refreshToken (JWT, 7d, signed with JWT_REFRESH_SECRET)
  → SHA256 hash the refreshToken
  → store hashed token + userId + expiresAt in DB
  → set refresh_token httpOnly cookie (7d)
  → return { accessToken, user }
```

---

### Refresh

```
POST /auth/refresh (refresh_token cookie)
  → verify JWT signature with JWT_REFRESH_SECRET (fail fast, no DB hit)
  → SHA256 hash the token and look it up in DB
  → if not found → 401
  → if revokedAt is set → REPLAY ATTACK: revoke ALL user tokens → 401
  → if expired → 401
  → if user.status !== ACTIVE → 403
  → mark old token as revoked (revokedAt = now)
  → generate + store new refresh token
  → set new refresh_token cookie
  → return { accessToken }
```

---

### Logout

```
POST /auth/logout (Bearer accessToken + refresh_token cookie)
  → JwtAuthGuard validates access token
  → hash refresh token, find in DB, set revokedAt = now
  → clear refresh_token cookie
```

### Logout All Devices

```
POST /auth/logout-all (Bearer accessToken)
  → JwtAuthGuard validates access token
  → set revokedAt = now on ALL active refresh tokens for user
  → clear refresh_token cookie
```

---

## Passport Strategies

### LocalStrategy — `passport-local`

Used only on `POST /auth/login`.

- Reads `email` and `password` from the request body.
- Calls `authService.validateUser(email, password)`.
- Attaches the returned user to `request.user`.

### JwtStrategy — `passport-jwt`

Used on all protected routes.

- Extracts the Bearer token from the `Authorization` header.
- Verifies signature with `JWT_ACCESS_SECRET`.
- Looks up the user by `payload.sub` (user ID).
- Throws 401 if the user no longer exists or is soft-deleted.
- Attaches the user to `request.user`.

---

## Guards & Decorators

### How Guards Work in NestJS

A guard is a class that runs **before** the route handler. It decides whether the request is allowed to proceed. If the guard returns `false` (or throws), NestJS sends a 401/403 and the handler never runs.

```
Incoming request
  → Middleware
  → Guard          ← runs here, can block the request
  → Interceptor
  → Route handler
```

`@UseGuards(SomeGuard)` can be placed on a controller class (applies to all routes) or on a single method (applies to that route only).

---

### `LocalAuthGuard`

```typescript
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

This is just a thin wrapper around Passport's `AuthGuard('local')`. The string `'local'` tells Passport which strategy to run — in this case `LocalStrategy`.

**What happens when this guard runs:**

1. Passport reads `email` and `password` from `req.body`.
2. It calls `LocalStrategy.validate(email, password)`.
3. `validate()` calls `authService.validateUser()` which checks the DB and compares the bcrypt hash.
4. If valid, `validate()` returns the user object. Passport writes it to `req.user`.
5. If `validate()` returns `null` or throws, the guard blocks the request with 401.

**Used on:** `POST /auth/login` only.

```typescript
@Post('login')
@UseGuards(LocalAuthGuard)       // ← runs LocalStrategy before the handler
login(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
  return this.authService.login(user.id, res);
  //                             ↑ safe to use because guard already validated it
}
```

---

### `JwtAuthGuard`

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Same pattern — a wrapper around `AuthGuard('jwt')` which runs `JwtStrategy`.

**What happens when this guard runs:**

1. Passport extracts the token from the `Authorization: Bearer <token>` header.
2. It verifies the JWT signature using `JWT_ACCESS_SECRET`.
3. If the signature is valid and the token is not expired, Passport calls `JwtStrategy.validate(payload)`.
4. `validate()` receives the decoded payload `{ sub: userId }`, queries the DB to confirm the user still exists and is not soft-deleted, then returns the user.
5. Passport writes the returned user to `req.user`.
6. If any step fails (bad signature, expired, user deleted), the request is blocked with 401.

**Used on:** `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me`.

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)         // ← verifies token and populates req.user
me(@CurrentUser() user: any) {
  return user;
}
```

---

### How Strategies Connect to Guards

The string you pass to `AuthGuard()` must match the name registered by the strategy. Passport uses it as a lookup key.

```
AuthGuard('jwt')  →  finds →  PassportStrategy(Strategy, 'jwt')  ← JwtStrategy
AuthGuard('local') →  finds →  PassportStrategy(Strategy, 'local') ← LocalStrategy
```

`PassportStrategy(Strategy)` without a second argument defaults to the strategy's built-in name:
- `passport-local` registers as `'local'`
- `passport-jwt` registers as `'jwt'`

---

### `@CurrentUser()` Decorator

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

This is a **parameter decorator**. It runs when NestJS is resolving the arguments for a route handler, and injects `request.user` directly into the parameter.

`request.user` is populated by Passport after a guard's strategy calls `validate()` and returns a value. Without a guard running first, `request.user` would be `undefined`.

**How it connects to guards:**

```
@UseGuards(JwtAuthGuard)          ← 1. guard runs, strategy validates token,
                                       Passport sets req.user = { id, email, ... }
me(@CurrentUser() user: any)      ← 2. decorator reads req.user and injects it
```

**`ExecutionContext`** is NestJS's abstraction over the raw request. `.switchToHttp()` tells it we're in an HTTP context (as opposed to WebSocket or RPC), and `.getRequest()` returns the Express `Request` object.

**Usage across the controller:**

| Endpoint | Guard that populates `req.user` | What `@CurrentUser()` gives you |
|----------|--------------------------------|--------------------------------|
| `POST /auth/login` | `LocalAuthGuard` | User from DB (validated credentials) |
| `POST /auth/logout-all` | `JwtAuthGuard` | User from DB (validated JWT) |
| `GET /auth/me` | `JwtAuthGuard` | User from DB (validated JWT) |

---

## Data Models

### User

| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| email | String | Unique |
| password | String | bcrypt hash |
| firstName | String | |
| lastName | String | |
| avatar | String? | Optional |
| status | UserStatus | `PENDING` \| `ACTIVE` \| `SUSPENDED` |
| deletedAt | DateTime? | Soft delete — null means active |
| refreshTokens | RefreshToken[] | |

### RefreshToken

| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| token | String | SHA256 hash of the JWT |
| userId | String | FK → User |
| expiresAt | DateTime | Mirrors JWT expiry |
| revokedAt | DateTime? | Null = active, set = revoked |

---

## Password Rules

Applied on registration and user creation:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character: `@ $ ! % * ? &`

---

## Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `JWT_ACCESS_SECRET` | Yes | — | Min 32 characters |
| `JWT_REFRESH_SECRET` | Yes | — | Min 32 characters |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `NODE_ENV` | Yes | — | `development` \| `production` \| `test` |

---

## Security Highlights

- **Refresh tokens hashed in DB** — raw JWTs are never stored.
- **Token rotation** — every refresh issues a new token and revokes the old one.
- **Replay attack detection** — if a revoked token is used again, all tokens for that user are immediately revoked, forcing a re-login on all devices.
- **Separate secrets** — access and refresh tokens use different signing secrets.
- **Short-lived access tokens** — 15 minute window limits the blast radius of a leaked token.
- **httpOnly cookies** — refresh token is inaccessible to JavaScript.
- **Soft deletes** — deleted users are excluded from all auth queries without removing data.
- **Status checks** — suspended or pending users are blocked at login and on every token refresh.
