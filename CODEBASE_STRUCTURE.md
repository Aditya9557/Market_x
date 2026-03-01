# 🏪 Market_x — Campus Delivery Platform

> A full-stack campus delivery marketplace connecting **Students**, **Shopkeepers (Vendors)**, **Delivery Heroes**, and **Admins** — built with React + TypeScript (frontend), Express + MongoDB (backend), and Flutter (mobile).

---

## 📌 Project Overview

**Market_x** is a multi-role campus delivery platform that allows:

- **Students** to browse products from campus shops, add to cart, place orders, track deliveries in real-time, file disputes, and manage a wallet.
- **Shopkeepers (Vendors)** to register their stores, manage products, process orders, and configure store settings (requires admin approval).
- **Delivery Heroes** to pick up ready orders, deliver them with live GPS tracking, earn ratings, and cash out via Stripe.
- **Admins** to approve/reject stores, manage all orders, resolve disputes, issue refunds, and monitor platform analytics.

---

## ✅ Complete Feature List — Everything Built So Far

### Phase 1 — Core Platform (Foundation)
| Feature                      | Status | Key Files |
| ---------------------------- | ------ | --------- |
| JWT Authentication (4 roles) | ✅ | `authController.ts`, `authMiddleware.ts` |
| Admin store approval system | ✅ | `adminController.ts`, `AdminStores.tsx` |
| Product catalog + search | ✅ | `productController.ts`, `ProductCatalog.tsx` |
| Shopping cart (multi-store) | ✅ | `cartController.ts`, `CartPage.tsx` |
| Multi-store order splitting | ✅ | `orderSplitter.ts`, `orderController.ts` |
| Order lifecycle management | ✅ | `Order.ts`, `VendorOrders.tsx` |
| Hero delivery assignment | ✅ | `heroController.ts`, `HeroOrders.tsx` |
| Real-time delivery tracking | ✅ | `socketServer.ts`, `useDeliveryTracking.ts` |
| Wallet system | ✅ | `userController.ts`, `Wallet.tsx` |
| Stripe Connect 3-way splits | ✅ | `stripeService.ts`, `paymentController.ts` |
| Uni Guide (campus map) | ✅ | `uniGuideController.ts`, `UniGuide.tsx` |
| Contact/Support page | ✅ | `ContactSupport.tsx`, `ContactMessage.ts` |
| Mobile app | ✅ | `mobile/lib/` |
| Indian Rupee (₹) currency | ✅ | All frontend pages |

### Phase 2 — Production Hardening & Automation
| Feature                      | Status | Key Files |
| ---------------------------- | ------ | --------- |
| **Admin Action Audit Log** — Immutable append-only log | ✅ | `AdminActionLog.ts`, `auditLogService.ts`, `AdminAuditLog.tsx` |
| **Fraud & Risk Detection** — Auto-flagging for Multi-IPs, Refund abuse, Velocity | ✅ | `RiskFlag.ts`, `fraudService.ts`, `AdminRiskDashboard.tsx` |
| **Stripe Reconciliation Cron** — Daily ledger vs Stripe mismatch detection | ✅ | `ReconciliationReport.ts`, `reconciliationService.ts` |
| **Hero Economics & Discipline** — Auto-suspension rules | ✅ | `heroEconomicsService.ts`, `heroEconomicsController.ts` |
| **Multi-Campus Configuration** — Dynamic fee/commission engine | ✅ | `CampusConfig.ts`, `AdminCampusConfig.tsx` |
| **Load Testing (k6)** — High concurrency scenarios for checkout & hero assignment | ✅ | `load-test.js`, `load-test-report.md` |
| **Stripe webhook endpoint** — Dual-layer idempotency (Redis + MongoDB) | ✅ | `webhookService.ts`, `WebhookEvent.ts` |
| **Dispute & refund module** — Immutable ledger | ✅ | `Dispute.ts`, `disputeService.ts` |
| **Redis-backed distributed locking** — Prevents delivery accept race conditions | ✅ | `config/redis.ts`, `heroController.ts` |
| **Refresh tokens & session handling** | ✅ | `RefreshToken.ts`, `authService.ts` |
| **Zod validation & sanitization** + **Helmet security** | ✅ | `validation.ts`, `server.ts` |
| **Health checks & monitoring** | ✅ | `healthController.ts`, `config/logger.ts` |
| **Backup & Disaster Recovery Documentation** | ✅ | `backup-disaster-recovery.md` |

---

## 🗂️ Full Project File Tree

```
Market_x/
├── CODEBASE_STRUCTURE.md              # ← You are here
├── DEPLOYMENT_NOTES.md                # Env vars, infra IaC, PR descriptions
├── HERO_IMPLEMENTATION_PLAN.md        # Delivery hero feature plan
├── docs/                              # Architecture, Testing, & DR Specs
│   ├── load-test-report.md            # k6 performance and baseline metrics
│   └── backup-disaster-recovery.md    # Failover guidelines and cron backups
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions: lint → test → build
│
├── backend/                           # Express.js + TypeScript API server
│   ├── load-test.js                   # ⭐ k6 stress testing scripts
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts                  # App entry — Express, Socket.io, Redis, Helmet
│       │
│       ├── config/                    # Infrastructure & configuration
│       │   ├── db.ts                  # MongoDB connection
│       │   ├── redis.ts               # Redis client, SETNX locks
│       │   └── logger.ts              # Winston logger, Sentry SDK
│       │
│       ├── models/                    # Mongoose schemas & data models (19 total)
│       │   ├── AdminActionLog.ts      # ⭐ Immutable audit trails for admin operations
│       │   ├── CampusConfig.ts        # ⭐ Dynamic campus commissions, fees, features
│       │   ├── ReconciliationReport.ts# ⭐ Daily ledger vs Stripe mismatches
│       │   ├── RiskFlag.ts            # ⭐ Auto-flagged user/fraud events
│       │   ├── Dispute.ts             # Order disputes
│       │   ├── HeroRating.ts          # Individual delivery ratings
│       │   ├── LedgerEntry.ts         # Immutable wallet ledger
│       │   ├── WebhookEvent.ts        # Stripe webhook idempotency log
│       │   └── ... (User, Order, Store, Product, Delivery)
│       │
│       ├── controllers/               # Route handlers
│       │   ├── adminOpsController.ts  # ⭐ Handles audits, risk flags, configs, daily recon
│       │   ├── heroEconomicsController# ⭐ Analyzes hero stats & auto-suspends
│       │   ├── healthController.ts    # ⭐ Deep /api/health (DB + Redis + Stripe)
│       │   ├── authController.ts      
│       │   └── webhookController.ts   
│       │
│       ├── services/                  # Business logic
│       │   ├── auditLogService.ts     # ⭐ Fire & forget immutable logger
│       │   ├── fraudService.ts        # ⭐ Velocity, multi-account IP, refund abuse checks
│       │   ├── heroEconomicsService.ts# ⭐ Performance & auto-discipline calculator
│       │   ├── reconciliationService.ts# ⭐ Cron job querying Stripe APIs vs MongoDB ledgers
│       │   ├── disputeService.ts      
│       │   └── walletService.ts       
│       │
│       ├── middleware/                
│       │   ├── rateLimiter.ts         # Per-endpoint rate limits
│       │   └── validation.ts          # Zod schemas (Includes OWASP password checks)
│       │
│       ├── routes/                    # API definitions
│       │   ├── adminRoutes.ts         # ⭐ /audit-logs, /campus-configs, /reconciliation
│       │   ├── heroRoutes.ts          # ⭐ /economics, /accept
│       │   └── healthRoutes.ts        # ⭐ /health
│       │
│       ├── scripts/
│       │   └── migrate-v2.ts          # ⭐ Builds indexes & seeds campus defaults
│       │
│       └── __tests__/                 # Unit test suite
│           └── (webhook, dispute, lock specs)
│
├── frontend/                          # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── App.tsx                    # Routes & Layout
│   │   ├── index.css                  # Tailwind inputs
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminAuditLog.tsx      # ⭐ Security log visualizer
│   │   │   │   ├── AdminCampusConfig.tsx  # ⭐ Feature flag & commission toggler
│   │   │   │   ├── AdminReconciliation.tsx# ⭐ Stripe ledger sync status
│   │   │   │   ├── AdminRiskDashboard.tsx # ⭐ Fraud event action queue
│   │   │   │   └── ... (Orders, Stores, Heroes)
│   │   │   ├── hero/                  # Hero flows & earnings
│   │   │   ├── student/               # Marketplace, cart, tracking
│   │   │   └── vendor/                # Store CMS, POS
│
└── mobile/                            # Flutter mobile app (Student + Hero)
    └── lib/
        ├── providers, services, screens
```

> ⭐ = Added in **Phase 2 (Production Hardening & Ops)** — Latest Implementation

---

## 🔐 Security & Hardening Architecture

### Authentication Flow
- 15-minute access tokens + 7-day strictly rotated refresh tokens.
- Reuse detection kills all tokens tied to a family on compromised refresh triggers.
- **OWASP passwords:** Enforced 8+ length with numbers, cases, and specials.
- **Helmet:** Sets missing HTTP strict-transport-security & XSS shields.

### Audit & Anti-Fraud
- **`AdminActionLog`**: Any sensitive API manipulation (configs, dispute refunds, application approvals) creates an immutable log block tying the exact Admin ID, payload state (before/after), and IP.
- **`RiskFlag`**: `fraudService.ts` leverages fast Redis counters to throw flags for Velocity Abuse, exceeding Refund Caps, or Multi-Account IP sharing.
- **`express-rate-limit`**: Brute force & DDoS prevention on checkout & logins.

### Failover & Integrity
- **Distributed Locks**: Redis `SETNX` blocks double-assignments on identical deliveries.
- **Cron Reconciliation**: Nightly 02:00 UTC `reconciliationService.ts` reads the complete Stripe PaymentIntent log and perfectly matches internal MongoDB entries to enforce ledger parity.
- **Database Transactions**: Disputes, payments, and wallets mutate solely within MongoDB `$session` atomics.

---

## 🚀 Deployment & Operations

### Starting locally
```bash
# 1. Start MongoDB (127.0.0.1:27017) & Redis (127.0.0.1:6379)
# 2. Setup indices & initial config (run once)
cd backend && npx ts-node src/scripts/migrate-v2.ts

# 3. Boot backend (Port 5001)
npm run dev

# 4. Boot frontend (Port 5173)
cd ../frontend && npm run dev
```

### Load Testing
The platform contains a dedicated `k6` script (`load-test.js`) which spins up massive concurrent user sets running complex behaviors (like logging in, browsing products, dumping items into carts, entering checkout flows, and forcing heroes to aggressively poll for locking orders).

```bash
cd backend
k6 run load-test.js
```

---

*Last updated: Today — Production Hardening & Ops Admin Panels Complete*
