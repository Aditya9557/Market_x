# Production Deployment Notes

## New Environment Variables Required

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | ✅ Recommended | `redis://127.0.0.1:6379` | Redis connection URL for locking, idempotency, rate limiting |
| `STRIPE_WEBHOOK_SECRET` | ✅ Required | — | Stripe webhook signing secret (`whsec_...`) |
| `SENTRY_DSN` | Optional | — | Sentry error tracking DSN |
| `NOTIFICATIONS_ENABLED` | Optional | `false` | Master toggle for push/email notifications |
| `FCM_ENABLED` | Optional | `false` | Enable Firebase Cloud Messaging |
| `EMAIL_ENABLED` | Optional | `false` | Enable email notifications |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional | — | Path to Firebase service account JSON |
| `SMTP_HOST` | Optional | `smtp.gmail.com` | SMTP server host |
| `SMTP_PORT` | Optional | `587` | SMTP server port |
| `SMTP_USER` | Optional | — | SMTP username |
| `SMTP_PASS` | Optional | — | SMTP password |
| `SMTP_FROM` | Optional | `Market_x <noreply@marketx.campus>` | Email sender address |
| `LOG_LEVEL` | Optional | `info` | Winston log level |
| `NODE_ENV` | Optional | `development` | Environment (`development`, `staging`, `production`) |

## Infrastructure Requirements

### Redis
```bash
# Local development
brew install redis && redis-server

# Docker
docker run -d -p 6379:6379 redis:7-alpine

# Production (AWS)
# Use ElastiCache Redis cluster with encryption at rest
```

### MongoDB Indexes
```bash
# Run migration to create all indexes for new models
cd backend
npm run migrate
```

### Stripe Webhook
```bash
# Local testing with Stripe CLI
stripe listen --forward-to localhost:5001/api/payments/webhook

# Production
# Add webhook endpoint in Stripe Dashboard:
# URL: https://your-domain.com/api/payments/webhook
# Events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
```

## Migration Steps

1. **Install new dependencies:**
   ```bash
   cd backend && npm install
   ```

2. **Update .env file** with new variables (see table above)

3. **Run database migration:**
   ```bash
   npm run migrate
   ```
   This creates indexes for: `Dispute`, `HeroRating`, `LedgerEntry`, `RefreshToken`, `WebhookEvent`

4. **Start Redis** (local: `redis-server`, prod: ElastiCache)

5. **Restart backend:**
   ```bash
   npm run dev  # development
   npm run build && npm start  # production
   ```

6. **Verify health:**
   ```bash
   curl http://localhost:5001/api/health
   ```

## IaC Hints (AWS)

```hcl
# Terraform sketch for production infra

# Redis (ElastiCache)
resource "aws_elasticache_cluster" "marketx_redis" {
  cluster_id           = "marketx-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
}

# MongoDB Atlas — use M10+ for replica set (required for transactions)
# Atlas cluster with WiredTiger storage engine

# ECS/Fargate for backend
resource "aws_ecs_task_definition" "backend" {
  family = "marketx-backend"
  container_definitions = jsonencode([{
    name  = "backend"
    image = "your-ecr-repo/marketx-backend:latest"
    portMappings = [{ containerPort = 5001 }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "REDIS_URL", value = aws_elasticache_cluster.marketx_redis.cache_nodes[0].address },
    ]
  }])
}
```

---

## PR Descriptions

### `[payments] add stripe webhook verification`
Adds POST /api/payments/webhook with Stripe signature verification and dual-layer idempotency (Redis + MongoDB). Order transitions from pending → paid only after verified webhook event. Duplicate events are silently ignored. Handles payment_intent.succeeded, payment_intent.payment_failed, and charge.refunded.

**Env vars:** `STRIPE_WEBHOOK_SECRET`  
**Test:** `npm test -- --grep "Webhook"`

---

### `[payments] dispute & refund module`
New Dispute model and routes (POST /api/disputes, GET /api/admin/disputes, PUT /api/admin/disputes/:id/resolve). Admin can resolve disputes with full/partial refund or wallet credit. Resolution creates immutable ledger entries — old transactions are never mutated.

**Models:** `Dispute`, `LedgerEntry`  
**Test:** `npm test -- --grep "Dispute"`

---

### `[infra] redis locking + idempotency`
Adds Redis client with SETNX distributed locks for hero:accept:{orderId} with 10s TTL. Concurrent hero accept attempts now correctly return 409 for losers. Webhook event IDs stored in Redis to avoid reprocessing.

**Env vars:** `REDIS_URL`  
**Test:** `npm test -- --grep "Hero Accept Lock"`

---

### `[auth] refresh tokens & session handling`
Implements short-lived access tokens (15m) + refresh tokens with rotation and reuse detection. If a revoked token is reused, all user sessions are revoked as a security measure. New endpoints: POST /api/auth/refresh, POST /api/auth/logout

**Models:** `RefreshToken`

---

### `[validation] zod schemas for all payloads`
Adds Zod validation middleware for auth, orders, payments, disputes, hero, products, and stores. Invalid payloads now return 400 with field-level error messages. All request bodies are sanitized and typed.

---

### `[security] rate limiting for sensitive endpoints`
Redis-backed rate limiters: login (10/15m), signup (5/hr), hero accept (30/min), payments (10/min), general API (200/min). Returns 429 with retryAfter header.

---

### `[hero] rating & discipline system`
New HeroRating model with aggregate reliability score. Auto-suspension rules: score < 2.0 or 5+ cancellations in 7 days triggers suspension. Warning at score < 3.0 or 3+ cancellations.

**Models:** `HeroRating`

---

### `[notifications] FCM push + email fallback`
Abstracted notification service with FCM push and email (nodemailer) support. Env-based toggles for staging vs production. Dry-run logging when disabled.

**Env vars:** `NOTIFICATIONS_ENABLED`, `FCM_ENABLED`, `EMAIL_ENABLED`, SMTP configs

---

### `[wallet] immutable ledger pattern`
Every wallet change now produces an append-only LedgerEntry inside a MongoDB transaction. Includes reconciliation function to detect balance drift. Wallet balance and ledger stay consistent via atomic updates.

**Models:** `LedgerEntry`

---

### `[ops] health checks & monitoring`
GET /api/health checks MongoDB and Redis connectivity with latency measurements. Winston structured logging with request ID correlation. Sentry SDK integration for unhandled exceptions.

**Env vars:** `SENTRY_DSN`, `LOG_LEVEL`

---

### `[analytics] admin overview endpoint`
GET /api/admin/stats/overview returns GMV, orders/day, hero acceptance rate, pending  disputes, store counts, and 7-day revenue chart data via parallel MongoDB aggregation queries.

---

### `[ci] github actions pipeline`
Lint → Unit Test → Build pipeline with MongoDB and Redis services. Runs on Node 18 and 20. Coverage threshold at 50%.
