# Student Hero Delivery Partner — Full Implementation Plan

## Overview
This plan transforms the existing multi-vendor campus marketplace into a full delivery platform with Student Hero drivers, real-time tracking, 3-way split payments, and a Flutter mobile app.

---

## PHASE A: Hero Role & Delivery System (Express + MongoDB)
**Priority: HIGH | Estimated Effort: This Session**
> Adapt the delivery/hero concepts to the existing stack.

### A1. Data Model Extensions
- [ ] Add `hero` role to User model
- [ ] Create `DeliveryDriver` model (student hero profile: vehicle type, availability status, current location, earnings)
- [ ] Create `Delivery` model (links Order → Driver, status tracking, location history, timestamps)
- [ ] Add delivery fields to Order model (delivery fee, driver tip, delivery status)

### A2. Hero Availability Toggle
- [ ] `POST /api/hero/toggle` — Go online/offline
- [ ] `GET /api/hero/status` — Get current availability status
- [ ] `GET /api/hero/earnings` — Get earnings summary

### A3. Order Assignment Engine
- [ ] Auto-assignment logic: find nearest available hero when order placed
- [ ] `GET /api/hero/available-orders` — See pending deliveries
- [ ] `POST /api/hero/accept/:orderId` — Accept a delivery
- [ ] `PUT /api/hero/delivery/:id/status` — Update delivery status (picked_up → in_transit → delivered)

### A4. Location Tracking (Socket.io)
- [ ] Install Socket.io on backend
- [ ] Create WebSocket server alongside HTTP server
- [ ] Hero emits location updates every 5 seconds
- [ ] Customer subscribes to delivery channel for live updates
- [ ] Throttle updates (5s interval or 20m distance)
- [ ] Disconnect/cleanup on delivery complete

### A5. Hero Frontend Pages (React)
- [ ] `HeroDashboard.tsx` — Earnings, toggle online/offline, active delivery
- [ ] `HeroOrders.tsx` — Available orders to accept  
- [ ] `ActiveDelivery.tsx` — Current delivery with map/status controls
- [ ] `HeroEarnings.tsx` — Earnings history & breakdown

---

## PHASE B: Stripe Connect 3-Way Splits
**Priority: HIGH | Estimated Effort: Requires Stripe API Keys**

### B1. Stripe Connect Setup
- [ ] Configure Stripe Connect account (Platform)
- [ ] Implement Express Account onboarding for Vendors
- [ ] Implement Express Account onboarding for Heroes (Instant Payouts)

### B2. Payment Flow
- [ ] Customer checkout → Stripe Payment Intent
- [ ] On delivery complete → Trigger 3-way split:
  - Vendor payout (product cost minus commission)
  - Hero payout (delivery fee + tip)
  - Platform retains remainder
- [ ] Transfer groups for audit trail (ORDER_xxx)

### B3. Instant Payouts for Heroes
- [ ] Enable Instant Payouts via Stripe Express
- [ ] Hero dashboard: "Cash Out Now" button
- [ ] Earnings ledger with transaction history

---

## PHASE C: Supabase/PostgreSQL Migration Path
**Priority: MEDIUM | Estimated Effort: Multi-session**
> Gradual migration — not a big-bang rewrite.

### C1. Set Up Supabase Project
- [ ] Create Supabase project
- [ ] Enable PostGIS extension for geospatial queries
- [ ] Set up RLS policies for location data privacy
- [ ] Configure Supabase Realtime for driver_locations table

### C2. Dual-Database Strategy (Transitional)
- [ ] Keep MongoDB for existing data (users, stores, products, orders)
- [ ] Use Supabase/PostgreSQL for NEW real-time features:
  - `driver_locations` table (PostGIS POINT geometry)
  - `delivery_tracking` table (live status updates)
- [ ] Backend connects to both databases during transition

### C3. PostGIS Geospatial Queries
- [ ] KNN (K-Nearest Neighbor) query for finding closest hero
- [ ] GiST spatial index on driver locations
- [ ] Delivery radius calculations using ST_DWithin

### C4. Supabase Realtime Integration
- [ ] Replace Socket.io with Supabase Realtime channels
- [ ] Customer subscribes to delivery-specific channel
- [ ] WAL-based broadcasting of location updates
- [ ] RLS: customer can only see their driver's location during active delivery

### C5. Full Migration (Future)
- [ ] Migrate Users → Supabase Auth
- [ ] Migrate Stores/Products/Orders → PostgreSQL
- [ ] Remove MongoDB dependency entirely

---

## PHASE D: Flutter Mobile App
**Priority: MEDIUM-LOW | Estimated Effort: Multi-session**
> Requires Flutter SDK installation.

### D1. Flutter Setup
- [ ] Install Flutter SDK
- [ ] Create Flutter project: `student_hero_app`
- [ ] Set up Riverpod state management
- [ ] Configure API client to connect to existing Express backend

### D2. Core App Structure
- [ ] Auth screens (Login/Signup) connecting to existing API
- [ ] Role-based navigation (Student/Hero/Shopkeeper)
- [ ] Customer: Browse products, cart, checkout, order tracking
- [ ] Hero: Dashboard, toggle availability, accept/manage deliveries

### D3. Real-time Tracking (Flutter)
- [ ] Integrate Mapbox SDK for map display
- [ ] Customer view: Live driver location on map
- [ ] Hero view: Navigation with delivery route

### D4. Background Geolocation (Hero Mode)
- [ ] Install `flutter_background_geolocation`
- [ ] Motion activity recognition (still/walking/driving)
- [ ] Headless task for background location updates
- [ ] Battery-efficient elastic tracking strategy
- [ ] Throttled location emission (5s/20m)

### D5. Stripe Integration (Flutter)
- [ ] Stripe SDK for customer payments
- [ ] Hero: View earnings, instant payout button

---

## Implementation Priority Order

```
SESSION 1 (NOW):  Phase A (Hero role + Socket.io + React pages)
SESSION 2:        Phase B (Stripe Connect — needs API keys)
SESSION 3:        Phase C1-C2 (Supabase setup + dual-database)
SESSION 4:        Phase C3-C4 (PostGIS + Realtime migration)
SESSION 5+:       Phase D (Flutter app)
```

---

## Architecture Diagram (Target State)

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   React Web      │     │   Flutter App     │     │  Admin Panel  │
│   (Customer)     │     │   (Hero/Customer │     │   (React)    │
└────────┬────────┘     └────────┬─────────┘     └──────┬───────┘
         │                       │                       │
         └───────────┬───────────┘───────────────────────┘
                     │ REST API + WebSocket
              ┌──────┴──────┐
              │   Express   │
              │   Backend   │
              │  + Socket.io│
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────┴────┐ ┌────┴────┐ ┌───┴───────┐
    │ MongoDB │ │Supabase │ │  Stripe   │
    │ (Main)  │ │(PostGIS)│ │ Connect   │
    │         │ │(Realtime│ │(Payments) │
    └─────────┘ └─────────┘ └───────────┘
```
