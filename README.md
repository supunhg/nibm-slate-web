# 🏛️ SLATE — NIBM Instructor Roster & Task Allocation Engine

> **Scheduling & Leave Allocation Tracking Engine (SLATE)**  
> Mission-critical academic operational platform developed for the **National Institute of Business Management (NIBM)**, School of Computing (SOC).

SLATE provides real-time situational awareness across the 9-member academic instructor cadre: tracking who is actively teaching in lecture halls and computer labs, who is on approved leave, who is available on standby for ad-hoc allocations, and who is assigned to overnight campus care.

---

## ✨ System Architecture & Key Capabilities

```
                                  ┌──────────────────────────────────────────────┐
                                  │      SLATE Core Engine (Next.js 16)          │
                                  │  - AI Health Radar & Deterministic CSP       │
                                  │  - Neon Serverless PostgreSQL & Prisma       │
                                  │  - React 19 + Tailwind v4 Obsidian Velvet    │
                                  └───────────────┬──────────────────────────────┘
                                                  │
            ┌─────────────────────────────────────┼─────────────────────────────────────┐
            ▼                                     ▼                                     ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐   ┌───────────────────────────────┐
│     Full-Fledged Web PWA      │   │   Mobile Companion (Expo SDK) │   │     Public Status Board       │
│  - One-tap update prompt      │   │  - Standalone Android APK     │   │  - Zero-auth lobby kiosk      │
│  - Offline cached shell       │   │  - Native push notifications  │   │  - 3-bucket situational view  │
│  - iOS / Android standalone   │   │  - In-app APK updates         │   │  - Real-time auto-refresh     │
└───────────────────────────────┘   └───────────────────────────────┘   └───────────────────────────────┘
```

### 1. 🎓 Demonstrator Console (Roster Master — Yasith)
- **Flexible 7-Day Planning Studio**: Plan upcoming rosters starting from **any chosen date** (not locked to Monday).
- **1-Click Session Duplication**: Instant duplicate between Morning (`09:00 - 12:00`) and Afternoon (`13:00 - 16:00`).
- **Unified Full-Day Session Model**: Automatically unifies identical morning and afternoon sessions into seamless `09:00 - 16:00` blocks.
- **Sunday Evening CCS Batch Slot**: Dedicated slot (`16:30 - 17:30`) automatically available whenever Sunday falls in the selected horizon.
- **7-Day Overnight Rotation**: Ensures every single night of the week has exactly one designated campus caretaker officer.
- **Deterministic CSP & AI Health Radar**: Automatically scans for workload imbalances, scheduling conflicts, and recommends verified substitute instructors.
- **WhatsApp Dispatcher**: 1-click formatted timetable generation ready to paste directly into academic group chats.

### 2. 🛡️ Executive Operational Cockpit (Dr. Thisara)
- **3-Bucket Daily Readiness**:
  - 🟢 **On Duty (Teaching)**: Current active lectures, batches, and venue locations.
  - 🟡 **Available / Free Standby**: Mathematically verified idle pool available for student consultations, marking, or emergency coverage.
  - 🔴 **On Leave**: Approved absences and reasons.
- **Master 7-Day Matrix View**: Complete timetable view with instructor filters, search by module/batch/lab, and printable academic rosters.
- **Overnight Callout**: Quick-contact card for tonight's designated night duty caretaker.
- **Dual Leave Sign-Off Authority**: Formal review and approval workflow for pending holiday applications.

### 3. 👥 Instructor Cadre Portal
- **Personalized Schedule & Room Allocation**: Direct visibility into personal teaching blocks, lab venues, and upcoming night duties.
- **1-Click Calendar Sync**: Direct **Add to Google Calendar** URL generator and live downloadable `.ICS` calendar feeds.
- **Self-Service Leave Management**: Transparent holiday submission with live status tracking (`PENDING`, `APPROVED`, `REJECTED`).
- **Peer Transparency**: Real-time *Colleagues on Leave* transparency board to coordinate coverage seamlessly.

### 4. 📺 Public Live Status Board (No Login Required)
- Zero-authentication view accessible directly from the login screen (`/` → Public Board).
- Ultra-clean, read-only display tailored for campus lobby TVs and staff room monitors showing who is teaching, free, on leave, and on night shift.

### 5. 📱 Progressive Web App (PWA) & Mobile Companion
- **One-Tap Web Updates**: Every deployment is detected (versioned service worker + `/api/version`) and users get an "Update available · Reload now" prompt that swaps to the new build in place.
- **Offline Shell Resilience**: Cached assets enable instant startup even with intermittent campus Wi-Fi.
- **Standalone Android Companion (`mobile/`)**: Native React Native / Expo application with automated GitHub Actions APK builds (`.github/workflows/build-apk.yml`) and push notification dispatching.

---

## 🔑 Default Accounts & Access Roles

| Role | Username | Access Scope |
| :--- | :--- | :--- |
| **Public Board** | *No Login* | Zero-auth read-only live operational cockpit |
| **Demonstrator (Roster Master)** | `yasith` | Planning Studio, Duplication, Workload Balancer, WhatsApp Dispatcher, Publishing |
| **Executive (Director)** | `thisara` | Daily Cockpit, 7-Day Master Schedule, Free Pool, Leave Sign-Off Authority |
| **Instructor Cadre** | `instructors` / individual | Personal Timetable, Calendar Sync (.ICS/Google), Leave Applications |
| **System Administrator** | `admin` | Full System Control, Staff Management, Credential Resets, Academic Catalog |

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Web Framework** | [Next.js 16](https://nextjs.org) (App Router, Turbopack, Server Actions), [React 19](https://react.dev) |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com), Obsidian Velvet Design System (`#080b12`), Lucide Icons |
| **Database & ORM** | [Neon Serverless PostgreSQL](https://neon.tech) via [Prisma ORM 6.19](https://www.prisma.io) with resilient fallback |
| **Mobile Companion** | [React Native 0.86](https://reactnative.dev) / [Expo SDK 57](https://expo.dev), Expo Notifications |
| **Offline & PWA** | Web App Manifest, Service Worker (`public/sw.js`), Cache-First / Stale-While-Revalidate |
| **Language & Engine** | [TypeScript 5](https://www.typescriptlang.org) (Strict Mode), Node.js v22+ |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20 or v22+ (LTS)
- **npm**: v10+

### 2. Installation

```bash
# Clone repository
git clone https://github.com/supunhg/nibm-slate-web.git
cd nibm-slate-web

# Install web dependencies
npm install

# Install mobile dependencies (optional, for mobile development)
npm --prefix mobile install
```

### 3. Environment Setup

Create `.env` based on `.env.example`:

```bash
DATABASE_URL="postgresql://user:password@ep-proj-123.us-east-2.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-proj-123.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-secure-jwt-secret"
```

Push database schema:

```bash
npx prisma db push
```

### 4. Running the Applications

```bash
# Start Next.js Web & PWA Dev Server (http://localhost:3000)
npm run dev

# Start Mobile Companion in Expo
npm run mobile:start
```

---

## 🧪 Comprehensive Verification Suite

SLATE includes a multi-layered automated verification suite:

```bash
# Run ESLint static analysis
npm run lint

# Run 35 domain invariant tests (collision engine, leave precedence, AI health radar)
npm test

# Run 28 mobile companion REST API tests
npm run test:mobile

# Type-check mobile companion TypeScript
npm run mobile:check

# Run production build
npm run build
```

---

## 📄 License & Attribution

Internal academic operations software developed for the **National Institute of Business Management (NIBM)**, School of Computing. All rights reserved.
