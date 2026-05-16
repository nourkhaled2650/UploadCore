# UploadCore

A production-grade file upload and user management API built for scale. Designed with security, observability, and cloud-native deployment as first-class concerns — not afterthoughts.

---

## Overview

UploadCore is a backend API service that handles everything a modern application needs around file storage, user identity, and access control. Built to run locally with zero cost and deploy to AWS with zero code changes.

---

## Features

### Authentication
- JWT-based authentication with short-lived access tokens and rotating refresh tokens
- Refresh tokens stored server-side as cryptographic hashes in HttpOnly cookies
- Replay attack detection with automatic session revocation
- Login, logout, logout all devices, silent token refresh
- Email verification and password reset flows

### Role-Based Access Control
- Flexible role and permission system
- Fine-grained resource-level authorization
- Admin, user, and custom role support
- Ownership-based access guards

### User Management
- Full user lifecycle — registration, verification, suspension, deletion
- Soft delete with full audit trail
- Cursor-based pagination and full-text search
- Two-factor authentication (TOTP)
- Avatar upload integrated with file service
- Bulk operations with database transactions

### File Upload Service
- Direct upload via API and presigned URL flows
- Multipart upload support for large files
- Automatic image processing — resize, compress, generate variants (thumbnail, medium, original)
- Async processing queue — uploads return immediately, processing happens in background
- Private and public file access with time-limited signed URLs
- File metadata tracked per user
- Orphaned file cleanup via scheduled jobs

### Infrastructure
- Async job queue for email delivery, image processing, and webhook dispatch
- Transactional email with Handlebars templates
- Redis caching with per-route TTL strategy and automatic cache invalidation
- Scheduled tasks for session cleanup and storage maintenance

### Observability
- Structured JSON logging with per-request correlation IDs
- Prometheus metrics — request duration, error rate, queue depth, active users
- Liveness and readiness health checks
- Distributed tracing ready

### Developer Experience
- Fail-fast startup — invalid configuration crashes immediately with a clear error
- Type-safe environment variables validated at boot
- Full OpenAPI documentation
- Unit and E2E test suite with isolated test database
- Seed scripts for local development

---

## Local Infrastructure

Everything runs locally for free. Each service maps directly to its AWS equivalent — switching to production is a configuration change, not a code change.

| Local | AWS | Purpose |
|-------|-----|---------|
| PostgreSQL | RDS | Primary database |
| Redis | ElastiCache | Cache + session store + queue backend |
| MinIO | S3 | File storage |
| Mailpit | SES | Email delivery |
| Prometheus + Grafana | CloudWatch | Metrics and alerting |

---

## Deployment

Designed for AWS ECS Fargate with a fully automated CI/CD pipeline.

- Multi-stage Docker build
- GitHub Actions — test → build → push to ECR → deploy to ECS
- Secrets managed via AWS Secrets Manager
- RDS, ElastiCache, S3, SES, CloudWatch wired through environment config
- Staging deploys on PR merge, production deploys on release tag

---

## License

MIT