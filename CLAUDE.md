# Workshop Pulse

Workshop management app for **MacForce Auto Engineering** (auto body repair shop in Sri Lanka).

## Tech Stack
- **Framework**: Next.js 14 with App Router
- **UI**: React 18, single-file client component (`app/WorkshopPulse.js`), inline styles
- **State**: React useState/useRef, persisted to localStorage
- **No external UI libraries** — all styles are inline JS objects

## Architecture
- Monolithic single-component architecture in `app/WorkshopPulse.js`
- All business logic, UI, and PDF generation in one file
- Data persists via `localStorage` with key `workshopPulse_jobs`
- Demo data loads if no saved data exists

## Key Concepts
- **Job types**: Insurance (12-stage pipeline), Direct Major, Quick Job
- **Work types**: Paint & Body, Mechanical, Both
- **Cost categories**: Ex-stock, Purchased, Outsource, Labour
- **Stages flow**: job_received → est_pending → est_submitted → est_approved → parts_ordering → parts_arrived → in_progress → qc → ready → delivered → follow_up → closed
- **Phone format**: Sri Lankan (10 digits with leading 0, or 9 without)

## Development
```bash
npm install
npm run dev    # starts on http://localhost:3000
```

## Conventions
- Color constants in `C` object at top of file
- Style helpers: `card`, `pill()`, `btn()`, `btnSm()`, `inp`
- Toast notifications via `tt("message")`
- `saveCurrentJob()` must be called before navigating away from a job
- PDF generation uses `window.open` with inline HTML/CSS
