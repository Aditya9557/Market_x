# Backup & Disaster Recovery — UniHeart

> This document covers backup procedures, restore processes, and disaster recovery timelines for a production UniHeart deployment.

---

## 1. MongoDB Backup

### Automated Backups (MongoDB Atlas)

If using **MongoDB Atlas (recommended for production)**:

1. Go to Atlas → Project → **Backup**
2. Enable **Continuous Cloud Backup** (PIT recovery up to 24h)
3. Set retention: **7 days** (minimum for a pilot)
4. Configure snapshot frequency: **Every 6 hours**

**Atlas Backup Cost:** Included from M10+ tier.

### Manual Backup (Self-Hosted)

```bash
# Full dump (compress with gzip)
mongodump \
  --uri="$MONGO_URI" \
  --gzip \
  --archive="backup_$(date +%Y%m%d_%H%M%S).gz"

# Restore from dump
mongorestore \
  --uri="$MONGO_URI" \
  --gzip \
  --archive="backup_20260227_120000.gz"
```

### Scheduled Backup Script (Cron)

```bash
# /etc/cron.d/uniheart-backup
# Run at 03:00 UTC every day
0 3 * * * root /opt/uniheart/scripts/backup.sh >> /var/log/uniheart-backup.log 2>&1
```

```bash
#!/bin/bash
# /opt/uniheart/scripts/backup.sh

BACKUP_DIR="/backups/mongodb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="uniheart_${TIMESTAMP}.gz"

mkdir -p "$BACKUP_DIR"

mongodump \
  --uri="$MONGO_URI" \
  --gzip \
  --archive="${BACKUP_DIR}/${FILENAME}"

# Delete backups older than 7 days
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "✅ Backup complete: $FILENAME"
```

---

## 2. Redis Backup

Redis is used for **ephemeral state** (locks, rate limits, sessions). It is **not the source of truth** — all persistent data lives in MongoDB.

### What Redis Loses on Crash
| Data | Impact | Recovery |
|------|--------|----------|
| Order locks (TTL 30s) | Orders briefly unprotected | Self-heals in <30s |
| Rate limit counters | Temporarily loose limits | Self-heals in <15min |
| Multi-account IP sets (24h TTL) | Lose fraud detection window | Acceptable |
| Idempotency keys | Possible duplicate webhook processing | WebhookEvent in Mongo prevents actual duplicates |

### Redis Persistence (if needed)
```bash
# redis.conf — enable AOF for persistence
appendonly yes
appendfsync everysec
```

---

## 3. File Storage Backup

Documents (student ID photos, selfies) are stored in **Supabase Storage**.

- Supabase automatically replicates storage across availability zones
- Enable **point-in-time recovery** in Supabase dashboard
- For additional safety, set up a nightly sync to S3:

```bash
# Using rclone
rclone sync supabase:uniheart-bucket s3:uniheart-backup/$(date +%Y%m%d)
```

---

## 4. Environment Variables Backup

**Store these securely in your secrets manager** (never in version control):

```
# Required for production
MONGO_URI=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SENTRY_DSN=
NODE_ENV=production
PORT=5000
```

Use **AWS Secrets Manager**, **HashiCorp Vault**, or **Railway** environment panel.

---

## 5. Disaster Recovery Scenarios

### Scenario A: Node.js App Crash
- **Detection:** Health check `/api/health` returns 503, Sentry alert
- **Recovery:** PM2/Railway auto-restarts in < 30s
- **RTO:** < 1 minute

### Scenario B: MongoDB Connection Loss
- **Detection:** `mongoose.connection.readyState !== 1`, health check → 503
- **Recovery:** Atlas auto-failover to secondary (M10+): < 60s
- **Data loss:** 0 (primary data replicated)
- **RTO:** < 2 minutes

### Scenario C: Redis Loss
- **Detection:** Redis error logs, features degrade gracefully
- **Recovery:** Restart Redis, features self-heal
- **Data loss:** Ephemeral only (locks, counters)
- **RTO:** < 5 minutes

### Scenario D: Full Server Loss
1. Deploy new server from Docker image / Git
2. Set environment variables from secrets manager
3. Start app — auto-connects to Atlas
4. If Redis empty: acceptable, self-heals
5. Run `/api/health` to verify
- **RTO:** < 15 minutes

### Scenario E: Data Corruption (Accidental Delete)
1. Identify corrupt/deleted documents
2. Identify last clean backup timestamp
3. Run `mongorestore` with `--nsInclude=uniheart.<collection>`
4. Verify with reconciliation report
- **RTO:** < 2 hours
- **RPO:** Last backup (max 6h with 6-hourly snapshots)

---

## 6. Health Check Endpoints

| Endpoint | Expected Response | Meaning |
|----------|-------------------|---------|
| `GET /api/health` | `{"status":"ok"}` HTTP 200 | All systems healthy |
| `GET /api/health` | `{"status":"degraded"}` HTTP 200 | Redis or Stripe issue — non-critical |
| `GET /api/health` | `{"status":"down"}` HTTP 503 | MongoDB down — site unavailable |

### Response Structure
```json
{
  "status": "ok",
  "timestamp": "2026-02-27T10:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "mongodb": { "status": "ok", "latencyMs": 12 },
    "redis": { "status": "ok", "latencyMs": 2 },
    "stripe": { "status": "ok", "latencyMs": 340 }
  }
}
```

### Uptime Monitoring
Configure **UptimeRobot**, **BetterUptime**, or **Checkly** to:
- Poll `/api/health` every 60 seconds
- Alert on `status !== ok` or HTTP status ≥ 400
- Send alerts to Slack + email + PagerDuty

---

## 7. Restore Runbook

```bash
# 1. Identify the backup to restore
ls -lt /backups/mongodb/

# 2. Bring down the app (optional but clean)
pm2 stop uniheart-backend

# 3. Restore specific collection (example: Orders)
mongorestore \
  --uri="$MONGO_URI" \
  --gzip \
  --archive="backup_20260227_030000.gz" \
  --nsInclude="uniheart.orders" \
  --drop   # ⚠️ drops existing collection first

# 4. Verify document count
mongosh "$MONGO_URI" --eval "db.orders.countDocuments()"

# 5. Restart app
pm2 start uniheart-backend

# 6. Run health check
curl https://your-domain/api/health | jq .

# 7. Trigger reconciliation to verify ledger integrity
curl -X POST https://your-domain/api/admin/reconciliation/trigger \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 8. Sentry Monitoring Setup

```typescript
// Already configured in backend/src/config/logger.ts
// Set SENTRY_DSN environment variable to enable

// Alerts configured in Sentry dashboard:
// - Error rate > 5/min → PagerDuty + Slack
// - Unhandled rejection → Email immediately
// - Reconciliation mismatch → Slack #ops
// - User suspension count spike → Email
```

---

## 9. Pre-Deployment Checklist

- [ ] MongoDB Atlas with continuous backup enabled
- [ ] Redis persistence (AOF) configured
- [ ] Supabase storage backup configured
- [ ] All env vars in secrets manager
- [ ] Health check configured in monitoring tool
- [ ] Sentry DSN set and alert rules configured
- [ ] Load test passed with thresholds met
- [ ] Reconciliation cron tested manually
- [ ] Disaster recovery runbook tested in staging
