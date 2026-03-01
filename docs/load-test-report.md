# Load Test Report — UniHeart Backend

> **Status:** Baseline documentation pending first production run  
> **Script:** `backend/load-test.js`  
> **Tool:** [k6](https://k6.io/) v0.49+

---

## How to Run

### Prerequisites
```bash
# Install k6 (macOS)
brew install k6

# Ensure backend is running
npm run dev   # in /backend
```

### Basic Run
```bash
cd backend
k6 run load-test.js
```

### With target override
```bash
BASE_URL=https://your-production-url.com k6 run load-test.js
```

### With JSON output (for import into Grafana / k6 Cloud)
```bash
k6 run --out json=results.json load-test.js
```

### With hero token (enables hero accept scenario)
```bash
HERO_TOKEN=<your-hero-jwt> k6 run load-test.js
```

---

## Scenarios

| Scenario | VUs | Duration | Offset |
|----------|-----|----------|--------|
| `concurrent_logins` | 0 → 200 → 0 | 55s | 0s |
| `concurrent_checkouts` | 0 → 100 → 0 | 50s | 20s |
| `hero_accepts` | 0 → 50 → 0 | 50s | 25s |

**Total peak:** ~350 virtual users concurrently during the overlap window (~35–55s mark)

---

## Acceptance Thresholds

| Metric | Threshold |
|--------|-----------|
| `http_req_duration p(95)` | < 2000ms |
| `http_req_duration p(99)` | < 5000ms |
| `http_req_failed` | < 5% |
| `login_duration p(95)` | < 1000ms |
| `checkout_duration p(95)` | < 3000ms |
| `hero_accept_duration p(95)` | < 1500ms |
| `login_errors` | < 20 |
| `checkout_errors` | < 10 |
| `hero_accept_errors` | < 5 |

---

## Expected Results (Target — Pre-Deployment)

> Fill this in after running the test against staging.

| Metric | Target | Actual (Staging) | Status |
|--------|--------|------------------|--------|
| Login p(95) | < 1000ms | — | ⏳ |
| Checkout p(95) | < 3000ms | — | ⏳ |
| Hero accept p(95) | < 1500ms | — | ⏳ |
| Error rate | < 5% | — | ⏳ |
| Redis lock collision rate | < 2% | — | ⏳ |
| Peak memory (Node) | < 512MB | — | ⏳ |
| Peak CPU | < 80% | — | ⏳ |

---

## Known Bottlenecks (Architecture Review)

### Order Accept (Redis Lock)
- Every hero accept acquires a per-order Redis lock (`lock:order:{id}`)
- Concurrent accepts on the same order fail gracefully with HTTP 409
- **Expected behaviour** — not a bug, prevents double-booking

### Checkout (Stripe API call)
- Each checkout creates a Stripe PaymentIntent — adds ~300–800ms of external latency
- Idempotency key prevents duplicate charges on retry
- Checkout p(95) threshold is set to 3000ms to accommodate Stripe latency

### Auth (JWT verify)
- Auth is stateless — no DB hit for token verify (just JWT decode)
- Should handle 200 concurrent logins easily

---

## Infrastructure Recommendations (for Pilot)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js instances | 1 | 2 (with nginx load balancer) |
| MongoDB | M10 Atlas | M20 Atlas |
| Redis | 100MB | 256MB |
| RAM per Node instance | 512MB | 1GB |
| CPU per Node instance | 1 vCPU | 2 vCPU |

---

## How to Seed Test Data

Before running the load test, create a test student account:

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Load Test User","email":"loadtest@test.com","password":"TestPass123!","role":"student"}'
```

For the hero accept scenario:
```bash
# Login as an existing hero to get a token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hero@test.com","password":"TestPass123!"}'
# Copy accessToken → use as HERO_TOKEN env var
```

---

## Monitoring During Load Test

Open these in parallel while the test runs:

```bash
# Terminal 1: Watch server logs
npm run dev 2>&1 | grep -E "ERROR|WARN|429|500"

# Terminal 2: Monitor Redis load
redis-cli INFO stats | grep instantaneous

# Terminal 3: Node memory
node -e "setInterval(() => console.log(process.memoryUsage()), 2000)"
```

---

## Checklist — Before Pilot Launch

- [ ] Run load test against staging
- [ ] All thresholds pass
- [ ] Redis lock collision < 2%
- [ ] No memory leaks over 10-minute sustained load
- [ ] 503 health returns under load
- [ ] Sentry captured no new critical errors
- [ ] Stripe reconciliation ran cleanly
