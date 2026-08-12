// Workshop Pulse → kuruma project migration, STEP 2 of 3
// Copies user_roles, jobs, store_data rows AND all job-photos storage objects
// from the old Workshop Pulse Supabase project into the kuruma project.
//
// Prereqs: migration-to-kuruma.sql already run in the kuruma SQL editor.
// The old project is NEVER written to — read-only source.
//
// Usage:
//   OLD_URL=https://xxxx.supabase.co OLD_SERVICE_KEY=eyJ... \
//     node scripts/migrate-db.mjs            # dry run (counts only)
//   OLD_URL=... OLD_SERVICE_KEY=... node scripts/migrate-db.mjs --execute
//
// The kuruma (destination) credentials are read from ../kuruma-lk/.env.local.

import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const EXECUTE = process.argv.includes("--execute")
const OLD_URL = process.env.OLD_URL
const OLD_KEY = process.env.OLD_SERVICE_KEY
if (!OLD_URL || !OLD_KEY) {
  console.error("Set OLD_URL and OLD_SERVICE_KEY env vars (from the Workshop Pulse Supabase project, Settings → API).")
  process.exit(1)
}

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../kuruma-lk/.env.local")
const env = Object.fromEntries(fs.readFileSync(envPath, "utf8").split("\n").filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] }))
const NEW_URL = env.NEXT_PUBLIC_SUPABASE_URL
const NEW_KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!NEW_URL || !NEW_KEY) { console.error("kuruma .env.local missing Supabase credentials"); process.exit(1) }
if (NEW_URL.startsWith(OLD_URL) || OLD_URL.startsWith(NEW_URL)) { console.error("OLD and NEW projects are the same — aborting"); process.exit(1) }

const oldDb = createClient(OLD_URL, OLD_KEY)
const newDb = createClient(NEW_URL, NEW_KEY)

async function fetchAll(db, table) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select("*").range(from, from + 999)
    if (error) throw new Error(`${table} read failed: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function listAllObjects(db, prefix = "") {
  // Recursively list bucket contents (Supabase list() is per-folder)
  const out = []
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await db.storage.from("job-photos").list(prefix, { limit: 100, offset })
    if (error) throw new Error(`storage list failed at "${prefix}": ${error.message}`)
    for (const entry of data || []) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null && !entry.metadata) out.push(...await listAllObjects(db, full)) // folder
      else out.push(full)
    }
    if (!data || data.length < 100) break
  }
  return out
}

const main = async () => {
  console.log(`Source:      ${OLD_URL}`)
  console.log(`Destination: ${NEW_URL}`)
  console.log(`Mode:        ${EXECUTE ? "EXECUTE" : "DRY RUN (no writes)"}\n`)

  // ── Tables ──
  // Only columns that exist in the destination schema; extras in the old
  // tables (e.g. a redundant jobs.updated_at — the app tracks updated_at
  // inside the data JSON) are dropped, with a note.
  const COLUMNS = {
    user_roles: ["id", "email", "name", "role", "is_active", "created_at", "updated_at"],
    jobs: ["id", "data", "created_at", "stage", "on_hold", "vehicle_reg", "customer_name", "customer_phone", "job_type"],
    store_data: ["id", "data", "updated_at"],
  }
  for (const table of ["user_roles", "jobs", "store_data"]) {
    let rows = await fetchAll(oldDb, table)
    if (rows.length > 0) {
      const keep = new Set(COLUMNS[table])
      const dropped = Object.keys(rows[0]).filter(k => !keep.has(k))
      if (dropped.length) console.log(`${table}: dropping old-only column(s): ${dropped.join(", ")}`)
      rows = rows.map(r => Object.fromEntries(Object.entries(r).filter(([k]) => keep.has(k))))
    }
    const { count: existing, error: cErr } = await newDb.from(table).select("*", { count: "exact", head: true })
    if (cErr) throw new Error(`${table} missing in kuruma project — run migration-to-kuruma.sql first (${cErr.message})`)
    console.log(`${table}: ${rows.length} rows to copy (destination currently has ${existing})`)
    if (EXECUTE && rows.length > 0) {
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await newDb.from(table).upsert(rows.slice(i, i + 200))
        if (error) throw new Error(`${table} write failed: ${error.message}`)
      }
      const { count: after } = await newDb.from(table).select("*", { count: "exact", head: true })
      console.log(`  → copied. Destination now has ${after} rows`)
    }
  }

  // ── Storage ──
  const objects = await listAllObjects(oldDb)
  console.log(`\njob-photos: ${objects.length} files to copy`)
  if (EXECUTE) {
    let ok = 0, failed = []
    for (const objPath of objects) {
      try {
        const { data, error } = await oldDb.storage.from("job-photos").download(objPath)
        if (error) throw error
        const { error: upErr } = await newDb.storage.from("job-photos").upload(objPath, data, { upsert: true })
        if (upErr) throw upErr
        ok++
        if (ok % 20 === 0) console.log(`  … ${ok}/${objects.length}`)
      } catch (e) {
        failed.push(`${objPath}: ${e.message}`)
      }
    }
    console.log(`  → ${ok}/${objects.length} files copied${failed.length ? `, ${failed.length} FAILED:` : ""}`)
    failed.forEach(f => console.log("    ✗ " + f))
  }

  console.log(`\n${EXECUTE ? "✅ Migration complete. Old project untouched." : "Dry run complete — re-run with --execute to copy."}`)
}

main().catch(e => { console.error("\n❌ " + e.message); process.exit(1) })
