# Workshop Pulse v2.1.0

Workshop management system built for **MacForce Auto Engineering** — an auto body repair shop in Thalawathugoda, Sri Lanka.

## Features

- **Multi-job management** with 12-stage insurance pipeline, direct major jobs, and quick jobs
- **3 work types**: Paint & Body, Mechanical, or Both
- **Estimates & approvals** with insurance claim workflow
- **Parts quotation** with supplier tracking and approval photos
- **Invoice generation** with dual discount system (insurance + customer)
- **Cost tracking**: Ex-stock, Purchased, Outsource, Labour
- **QC checklist** with per-part quality checks
- **Follow-up system** with auto-reactivation and 3-attempt auto-close
- **PDF generation** for estimates, invoices, and parts quotations
- **WhatsApp sharing** for estimates and quotations
- **Customer registry** auto-built from job history
- **Photo documentation** with tagged uploads per job
- **Tablet + mobile responsive** design
- **Local data persistence** via browser localStorage

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy

Push to GitHub and import into [Vercel](https://vercel.com) for instant deployment.

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Single-file client component architecture
- No external UI dependencies

## Data Storage

All job data is stored in the browser's localStorage. Data persists across page refreshes but is local to the browser. For production use, consider adding a backend database.
