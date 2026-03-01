# Become a Hero — Microcopy Reference

> All user-facing strings for the Hero onboarding flow. Organized by screen/context.

---

## 🦸 CTA Card (Student Browse Page)

| Element | Copy |
|---------|------|
| Title | Become a Hero |
| Subtitle | Earn by helping classmates — flexible hours |
| Button | Apply → |

---

## 📝 Sign-Up Modal

### Header
| Element | Copy |
|---------|------|
| Badge icon | 🦸 |
| Title | Become a Hero |
| Subtitle | Earn by helping classmates — flexible hours |

### Pitch Banner
| Element | Copy |
|---------|------|
| Message | 🌟 Deliver to classmates, earn per trip, and build reputation. |

### Form Labels
| Field | Label | Placeholder | Helper/Error |
|-------|-------|-------------|--------------|
| Full Name | Full Name * | Your full name | Required |
| Campus Email | Campus Email * | your.email@campus.edu | ✓ Verified from your student profile |
| Phone | Phone Number * | 10-digit phone number | {n}/10 digits · Must be 10 digits |
| Zone | Current Zone / Hostel * | Select your zone | Please select your zone/hostel |
| Hours | Preferred Hours * | — | Select at least one time slot |
| Vehicle | How will you deliver? * | — | — |
| Bank | Bank / UPI Details (optional — needed before first payout) | UPI ID or bank account details | — |

### Time Slot Labels
| Value | Display |
|-------|---------|
| morning | 🌅 Morning (6am–12pm) |
| afternoon | ☀️ Afternoon (12pm–6pm) |
| night | 🌙 Night (6pm–12am) |

### Vehicle Options
| Value | Emoji | Label |
|-------|-------|-------|
| walk | 🚶 | Walking |
| bicycle | 🚲 | Bicycle |
| scooter | 🛵 | Scooter |
| car | 🚗 | Car |

### Document Upload
| Element | Copy |
|---------|------|
| Section Label | Verification Documents * |
| File constraints | JPEG, PNG, WebP or HEIC · Max 5MB each |
| Student ID label | 🪪 Student ID |
| Selfie label | 🤳 Selfie |
| Success indicator | ✓ Student ID / ✓ Selfie |

### Agreement
| Element | Copy |
|---------|------|
| Checkbox | I agree to the Hero rules & code of conduct * |

### Privacy Microcopy
| Element | Copy |
|---------|------|
| ID photos | 🔒 We keep ID photos secure; only admins can view them for verification. |
| Location | 📍 Your location is only shared with Heroes when you request delivery and only precise location after acceptance. |

### Submit
| Element | Copy |
|---------|------|
| Button (idle) | 🦸 Apply to be a Hero |
| Button (loading) | Submitting... |
| Footer | Applications reviewed within 24–48 hours. You'll be notified when approved. |

### Errors
| Context | Copy |
|---------|------|
| Error banner | ⚠️ Please fix {n} error(s) below |
| Validation: required | Required |
| Validation: phone | Must be 10 digits |
| Validation: hours | Select at least one time slot |
| Validation: file size | Student ID / Selfie must be under 5MB |
| Validation: file type | Only JPEG, PNG, WebP, or HEIC files accepted |
| Validation: agreement | You must agree to the Hero rules |

### Success
| Context | Copy |
|---------|------|
| Toast | 🎉 Application submitted successfully! |
| API response | Application submitted successfully! You will be notified within 24–48 hours. |

---

## 🔑 Login Tab

| Element | Copy |
|---------|------|
| Tab label | 🔑 Login |
| Email label | Campus Email / Phone |
| Email placeholder | your.email@campus.edu |
| Password label | Password |
| Password placeholder | Enter your password |
| Button (idle) | 🔑 Login as Hero |
| Button (loading) | Logging in... |
| Forgot link | Forgot password? |
| Switch to signup | Not a Hero yet? Sign up |
| Success toast | ✅ Logged in as Hero! |
| Error | Login failed. Check your credentials. |

---

## 📊 Application Status Card

### Status Labels
| Status | Label | Icon |
|--------|-------|------|
| draft | Draft | 📝 |
| submitted | Submitted | 📤 |
| under_review | Under Review | 🔍 |
| approved | Approved | ✅ |
| rejected | Rejected | ❌ |

### Status-Specific Text
| Context | Copy |
|---------|------|
| Applied date | Applied {date} |
| Rejection heading | Reason for Rejection: |
| Reapply hint | You can reapply after addressing the issues mentioned above. |
| Approval CTA | 🎉 You're approved! Complete your quickstart → |
| Onboarding complete | ✅ Onboarding complete! You can now accept deliveries. |

---

## 🎉 Hero Quickstart Modal

### Header
| Element | Copy |
|---------|------|
| Title | Hero Quickstart |
| Subtitle | Complete these 3 steps before your first delivery |

### Steps
| Step | Title | Description | CTA |
|------|-------|-------------|-----|
| 1 | Accept your first job | Learn how order locking works — when you accept a delivery, a Redis lock ensures no other hero can take it simultaneously. | ▶️ Watch short video (30s) |
| 2 | Pickup / Delivery checklist | Verify items at pickup, confirm with the customer, and mark delivery as complete. Always double-check order contents. | 📝 Complete training quiz |
| 3 | Safety & contact rules | Keep personal info private, use in-app communication, and follow campus road safety guidelines at all times. | ✅ I accept safety rules |

### Safety Sub-items
| Item | Copy |
|------|------|
| Privacy | 🔒 Never share customer phone/address outside the app |
| Safety | ⚠️ Report unsafe situations immediately via support |
| Road rules | 🚦 Follow traffic rules, even on campus roads |

### Progress
| Element | Copy |
|---------|------|
| Label | Onboarding Progress |
| Counter | {n}/3 |

---

## 🦸 Hero Profile Card

### Levels
| Min Deliveries | Label | Emoji |
|----------------|-------|-------|
| 0 | Rookie | 🌱 |
| 10 | Rising Star | ⭐ |
| 30 | Campus Hero | 🦸 |
| 75 | Legend | 👑 |
| 150 | Campus Legend | 💎 |

### Points/Penalties Warnings
| Condition | Copy |
|-----------|------|
| Score < 3.0 | ⚠️ Reliability score dropping — avoid cancellations |
| Score < 2.0 | 🔴 Account at risk — suspended if score stays below 2.0 |
| Recovery help | Complete deliveries on time and maintain good ratings to recover. |

---

## 🛡️ Hero Rules & Code of Conduct

1. Always deliver within the estimated time window.
2. Handle all items with care — report damage immediately.
3. Be respectful and professional with all students and vendors.
4. Keep your delivery area clean and tidy.
5. Follow campus safety guidelines at all times.
6. Do not share customer contact details with anyone.
7. Cancelling accepted orders affects your reliability score.
8. Maintain a rating above 3.0 to stay active.
9. Report any issues through the support channel promptly.
10. UniHeart reserves the right to suspend accounts that violate these rules.

---

## 🔧 Admin Hero Queue

| Element | Copy |
|---------|------|
| Page title | Hero Applications |
| Page subtitle | Review and manage hero delivery applications |
| Empty state | No hero applications match the selected filter. |
| Quick approve | ✓ Quick Approve |
| Review CTA | 👁️ Review |
| Approve button | ✓ Approve Hero |
| Reject button | ✕ Reject |
| Approve toast | ✅ Application approved! Hero can now start delivering. |
| Reject prompt | ⚠️ Please provide a rejection reason |
| No docs | No documents uploaded |
| ID security | 🔒 ID photos are secure; only admins can view them for verification. |
