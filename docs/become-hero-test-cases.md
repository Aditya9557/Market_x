# Become a Hero — Test Cases

> Comprehensive test suite for the Hero onboarding flow covering happy paths, edge cases, accessibility, and performance.

---

## 1. CTA Card Visibility

### TC-1.1 — CTA card renders for students
- **Precondition:** Logged in as student, no hero application exists
- **Action:** Navigate to `/browse`
- **Expected:** "Become a Hero" CTA card is visible with hero emoji, title, subtitle, and "Apply →" button
- **Priority:** P0

### TC-1.2 — CTA card click opens modal
- **Precondition:** CTA card is visible
- **Action:** Click the card or "Apply →" button
- **Expected:** BecomeHeroModal opens with Sign Up tab active
- **Priority:** P0

### TC-1.3 — CTA card not shown for vendors
- **Precondition:** Logged in as vendor
- **Action:** Navigate to vendor dashboard
- **Expected:** No "Become a Hero" card visible
- **Priority:** P1

### TC-1.4 — CTA card + Application Status coexist
- **Precondition:** Student has submitted application
- **Action:** Navigate to `/browse`
- **Expected:** Both CTA card and Application Status card visible; clicking CTA shows "You already have a pending application" error on resubmit
- **Priority:** P1

---

## 2. Sign-Up Tab — Form Validation

### TC-2.1 — All required fields empty
- **Action:** Click "Apply to be a Hero" without filling any field
- **Expected:** Error banner shows "⚠️ Please fix N error(s) below", each field shows red error text
- **Priority:** P0

### TC-2.2 — Phone validation
- **Action:** Enter phone with fewer than 10 digits
- **Expected:** "Must be 10 digits" error, counter shows "X/10 digits"
- **Action:** Enter phone with letters
- **Expected:** Non-digit characters stripped automatically
- **Priority:** P0

### TC-2.3 — File size validation
- **Action:** Upload a >5MB image for Student ID
- **Expected:** Toast "File must be under 5MB", file not accepted
- **Priority:** P0

### TC-2.4 — File type validation
- **Action:** Upload a PDF as selfie
- **Expected:** "Only JPEG, PNG, WebP, or HEIC files accepted" error
- **Priority:** P0

### TC-2.5 — Agreement checkbox required
- **Action:** Fill all fields but leave checkbox unchecked
- **Expected:** "You must agree to the Hero rules" error
- **Priority:** P0

### TC-2.6 — Preferred hours required
- **Action:** Fill all fields, select no hour slots
- **Expected:** "Select at least one time slot" error
- **Priority:** P0

### TC-2.7 — Zone selection required
- **Action:** Leave zone dropdown at "Select your zone"
- **Expected:** "Please select your zone/hostel" error
- **Priority:** P0

### TC-2.8 — Pre-filled fields
- **Precondition:** User has name "John Doe" and email "john@campus.edu" in their profile
- **Action:** Open Sign Up tab
- **Expected:** Full Name and Campus Email pre-filled and read-only; "✓ Verified from your student profile" shown under email
- **Priority:** P1

### TC-2.9 — Multiple time slots
- **Action:** Click Morning, Afternoon, then Morning again
- **Expected:** Morning deselected, only Afternoon selected; toggle behavior works
- **Priority:** P1

### TC-2.10 — Vehicle type selection
- **Action:** Click each vehicle option
- **Expected:** Only one selected at a time; visual highlight applied; default is Walking
- **Priority:** P1

### TC-2.11 — Image preview on upload
- **Action:** Upload valid JPEG for Student ID
- **Expected:** Image preview replaces the upload placeholder; "✓ Student ID" label shown in green
- **Priority:** P1

---

## 3. Sign-Up Tab — Submission

### TC-3.1 — Successful submission
- **Precondition:** All form fields valid, backend running
- **Action:** Click "Apply to be a Hero"
- **Expected:** Button shows spinner with "Submitting...", toast "🎉 Application submitted!", modal closes after 1.5s, Application Status card appears on page
- **Priority:** P0

### TC-3.2 — Duplicate application
- **Precondition:** Application already submitted and pending
- **Action:** Open modal and submit again
- **Expected:** Toast "You already have a pending application"
- **Priority:** P0

### TC-3.3 — Already a hero
- **Precondition:** User is already registered as DeliveryDriver
- **Action:** Submit application
- **Expected:** Toast "You are already registered as a hero"
- **Priority:** P1

### TC-3.4 — Non-student role
- **Precondition:** Logged in as vendor
- **Action:** Somehow access the form and submit
- **Expected:** 403 "Only students can apply to become heroes"
- **Priority:** P1

### TC-3.5 — Network error on submission
- **Precondition:** Backend unreachable
- **Action:** Fill form and submit
- **Expected:** Toast shows error message, form state preserved (user doesn't lose progress)
- **Priority:** P1

---

## 4. Login Tab

### TC-4.1 — Successful hero login
- **Precondition:** Hero has an approved account
- **Action:** Open Login tab, enter valid credentials, click "Login as Hero"
- **Expected:** Spinner, "✅ Logged in as Hero!" toast, modal closes, user session updated
- **Priority:** P0

### TC-4.2 — Invalid credentials
- **Action:** Enter wrong email/password
- **Expected:** Red error banner "Login failed. Check your credentials."
- **Priority:** P0

### TC-4.3 — Empty fields
- **Action:** Click login with empty fields
- **Expected:** Error "Email and password are required"
- **Priority:** P0

### TC-4.4 — Tab switching
- **Action:** Switch between Sign Up and Login tabs
- **Expected:** Smooth transition, errors cleared, form state preserved per tab
- **Priority:** P1

### TC-4.5 — Enter key submits login
- **Action:** Type password and press Enter
- **Expected:** Form submits without clicking button
- **Priority:** P2

### TC-4.6 — "Not a Hero yet? Sign up" link
- **Action:** Click the link text
- **Expected:** Switches to Sign Up tab
- **Priority:** P2

---

## 5. Application Status Card

### TC-5.1 — Status display for each state
- **Precondition:** Application in each status
- **Expected per status:**
  - draft: Gray badge, step 1 highlighted
  - submitted: Yellow badge, step 2 highlighted
  - under_review: Blue badge, step 3 highlighted
  - approved: Green badge, all steps checked, quickstart CTA shown
  - rejected: Red badge, no progress stepper, rejection reason shown
- **Priority:** P0

### TC-5.2 — Progress stepper visual
- **Action:** Application status is "under_review"
- **Expected:** Steps 1–3 show checkmarks, step 3 has ring highlight, connector lines filled for steps 1–2
- **Priority:** P1

### TC-5.3 — Rejection reason display
- **Precondition:** Application rejected with reason "Missing valid student ID"
- **Expected:** Red rejection card shows "Reason for Rejection: Missing valid student ID" and reapply hint
- **Priority:** P0

### TC-5.4 — Card not shown when no application
- **Precondition:** User has never applied
- **Action:** Navigate to `/browse`
- **Expected:** HeroApplicationStatus renders null (no card)
- **Priority:** P1

### TC-5.5 — Application date formatting
- **Precondition:** Application created on 2026-02-27
- **Expected:** Shows "Applied 27 Feb 2026"
- **Priority:** P2

---

## 6. Hero Quickstart Modal

### TC-6.1 — Quickstart opens for approved heroes
- **Precondition:** Application approved, onboarding NOT completed
- **Action:** Click "🎉 You're approved! Complete your quickstart →"
- **Expected:** Quickstart modal opens with 3 steps, progress shows 0/3
- **Priority:** P0

### TC-6.2 — Step completion
- **Action:** Click each step's action button sequentially
- **Expected:** Step updates to "✅ Completed", progress bar fills, counter increments
- **Priority:** P0

### TC-6.3 — Full onboarding completion
- **Precondition:** Complete all 3 steps
- **Expected:** Progress shows 3/3, Application Status card shows "✅ Onboarding complete!", quickstart CTA disappears
- **Priority:** P0

### TC-6.4 — Persistent state
- **Action:** Complete 2/3 steps, close modal, reopen
- **Expected:** Previous 2 steps still shown as completed
- **Priority:** P1

### TC-6.5 — Safety rules sub-items
- **Action:** Step 3 expanded
- **Expected:** Shows 3 safety rules in mini-list (privacy, reporting, traffic)
- **Priority:** P2

---

## 7. Hero Profile Card

### TC-7.1 — Profile card shows for heroes only
- **Precondition:** User is an approved hero with DeliveryDriver record
- **Expected:** HeroProfileCard renders with level, stats, toggle
- **Precondition:** User is not a hero
- **Expected:** HeroProfileCard renders null
- **Priority:** P0

### TC-7.2 — Level display
- **Data:** 0 deliveries → 🌱 Rookie, 10 → ⭐ Rising Star, 30 → 🦸 Campus Hero, 75 → 👑 Legend, 150 → 💎 Campus Legend
- **Expected:** Correct level badge, emoji, color for each threshold
- **Priority:** P1

### TC-7.3 — Level progress bar
- **Precondition:** Hero has 15 deliveries (Rising Star, next: Campus Hero at 30)
- **Expected:** Progress bar shows 5/20 = 25%, label shows "15/30 → 🦸 Campus Hero"
- **Priority:** P1

### TC-7.4 — Availability toggle
- **Action:** Click toggle when offline
- **Expected:** Toggle switches to green, dot appears, API call to /hero/toggle, button state updates
- **Priority:** P0

### TC-7.5 — Low reliability warning
- **Precondition:** Reliability score is 2.5
- **Expected:** Yellow warning "⚠️ Reliability score dropping — avoid cancellations"
- **Precondition:** Reliability score is 1.5
- **Expected:** Red warning "🔴 Account at risk — suspended if score stays below 2.0"
- **Priority:** P1

### TC-7.6 — Quick action links
- **Action:** Click "Hero Dashboard" and "Available Orders" links
- **Expected:** Navigate to /hero and /hero/orders respectively
- **Priority:** P1

---

## 8. Admin Hero Queue

### TC-8.1 — List all pending applications
- **Precondition:** 3 applications in "submitted" status
- **Action:** Navigate to /admin/hero-queue
- **Expected:** All 3 applications shown with applicant info, zone, vehicle, badge, "pending" count
- **Priority:** P0

### TC-8.2 — Filter by status
- **Action:** Click each filter chip
- **Expected:** Applications filtered accordingly; counts updated
- **Priority:** P0

### TC-8.3 — Quick approve
- **Action:** Click "✓ Quick Approve" on a submitted application
- **Expected:** Application approved, toast "✅ Application approved!", list refreshes, DeliveryDriver record created
- **Priority:** P0

### TC-8.4 — Review modal
- **Action:** Click "👁️ Review" on an application
- **Expected:** Detail modal opens with full applicant info, document images, admin notes field, rejection reason field, approve/reject buttons
- **Priority:** P0

### TC-8.5 — Reject with reason
- **Action:** In review modal, enter rejection reason, click "✕ Reject"
- **Expected:** Application rejected, reason saved, toast confirms, applicant sees reason on their status card
- **Priority:** P0

### TC-8.6 — Reject without reason
- **Action:** In review modal, leave rejection reason empty, click "✕ Reject"
- **Expected:** Toast "⚠️ Please provide a rejection reason", rejection blocked
- **Priority:** P0

### TC-8.7 — Approve already-approved
- **Action:** Attempt to approve an already-approved application
- **Expected:** 400 "Application is already approved"
- **Priority:** P2

### TC-8.8 — Empty state
- **Action:** Filter by status with no matching applications
- **Expected:** Empty state with hero emoji and "No applications" message
- **Priority:** P2

### TC-8.9 — Document preview
- **Action:** Review modal for application with uploaded documents
- **Expected:** Student ID and selfie images displayed at correct aspect ratio
- **Priority:** P1

---

## 9. Modal UX & Accessibility

### TC-9.1 — Close on backdrop click
- **Action:** Click outside the modal content area
- **Expected:** Modal closes
- **Priority:** P0

### TC-9.2 — Close on ESC key
- **Action:** Press Escape while modal is open
- **Expected:** Modal closes
- **Priority:** P0

### TC-9.3 — Close button
- **Action:** Click ✕ button in top-right
- **Expected:** Modal closes
- **Priority:** P0

### TC-9.4 — Body scroll lock
- **Action:** Open modal, try scrolling the background page
- **Expected:** Background does not scroll; modal content scrollable
- **Priority:** P1

### TC-9.5 — Screen reader support
- **Expected:** Modal has `role="dialog"`, `aria-modal="true"`, `aria-label="Become a Hero"`, close button has `aria-label="Close modal"`
- **Priority:** P1

### TC-9.6 — Keyboard navigation
- **Action:** Tab through form fields
- **Expected:** Focus order is logical: name → email → phone → zone → hours → vehicle → uploads → bank → checkbox → submit
- **Priority:** P1

### TC-9.7 — Mobile bottom-sheet style
- **Action:** View on viewport < 640px
- **Expected:** Modal appears from bottom with rounded top corners, handle bar visible
- **Priority:** P1

---

## 10. Performance

### TC-10.1 — Modal open speed
- **Action:** Click CTA card
- **Expected:** Modal appears within 200ms with slide-up animation
- **Priority:** P1

### TC-10.2 — Image upload preview speed
- **Action:** Select a 2MB image
- **Expected:** Preview appears within 500ms
- **Priority:** P2

### TC-10.3 — API response time
- **Action:** Submit application
- **Expected:** API responds within 2s on typical connection
- **Priority:** P1

### TC-10.4 — Status card lazy load
- **Action:** Navigate to `/browse`
- **Expected:** Product grid renders first, hero cards load asynchronously without blocking
- **Priority:** P2

### TC-10.5 — No layout shift
- **Action:** Cards loading (HeroProfileCard, HeroApplicationStatus)
- **Expected:** Components return null while loading (no empty containers causing layout shift)
- **Priority:** P2

---

## 11. Integration Tests

### TC-11.1 — Full happy path: Student → Application → Admin Approval → Quickstart → Hero Dashboard
1. Student logs in, clicks "Become a Hero", fills form, submits
2. Application Status card shows "Submitted"
3. Admin navigates to /admin/hero-queue, sees application, clicks Review, clicks Approve
4. Student refreshes: Status shows "Approved", Quickstart CTA visible
5. Student completes all 3 quickstart steps
6. Status shows "Onboarding complete!", HeroProfileCard appears
7. Student can toggle online/offline and access Hero Dashboard

### TC-11.2 — Rejection → Reapply path
1. Student submits application
2. Admin rejects with reason
3. Student sees rejection reason on Status card
4. Student opens modal and submits new application
5. New application appears in admin queue

### TC-11.3 — Concurrent approval (race condition)
1. Two admins open the same application in review modal
2. Admin A approves
3. Admin B tries to approve
4. Expected: Second approval returns "Application is already approved"
