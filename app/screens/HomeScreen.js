"use client"
import { useState } from "react"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, card, SP, ALL_STAGES, regSearchKey, phoneSearchKey, fmt, Icon, IconBadge } from "../WorkshopContext"

// Small colored status dot — replaces emoji in stage pills
const Dot = ({ color, size = 7 }) => <span style={{ width: size, height: size, borderRadius: size / 2, background: color, display: "inline-block", flexShrink: 0 }} />

// NOTE: the live home screen is jobListPanel/rightPanelHub inside WorkshopPulse.js.
// This file holds ONLY the closed-jobs views. (A dead duplicate HomeScreen
// component used to live here and silently swallowed edits — removed.)
export function ClosedJobDetail({ job: j, openJob, startWarrantyJob }) {
  if (!j) return null
  const jobTotal = (j.invoices || []).reduce((s, inv) => s + (inv.total || 0), 0)
    || (j.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0)
  const isIns = j.jobInfo.job_type === "insurance"
  const isQuick = j.jobInfo.job_type === "quick"

  const repairEntries = []
  ;(j.estimates || []).forEach(e => {
    ;(e.approved_entries || e.entries || []).forEach(en => {
      repairEntries.push({ part: en.part, category: en.category, qty: en.qty || 1, rate: en.approved_rate || en.rate || 0, remark: en.remark })
    })
  })
  ;(j.jobCosts || []).forEach(c => {
    repairEntries.push({ part: c.name, category: c.type, qty: 1, rate: c.cost || c.price || 0, remark: c.source })
  })
  const sundries = []
  ;(j.estimates || []).forEach(e => { ;(e.sundries || []).forEach(s => sundries.push({ name: s.name, amount: s.amount || 0, remark: s.remark })) })
  const photos = (j.jobDocs || []).filter(d => d.dataUrl)
  const replaceParts = repairEntries.filter(e => e.category === "replace")
  const repairWork = repairEntries.filter(e => e.category !== "replace")

  const catLabel = (cat) => ({ remove_refix: "R/R", reshaping: "Reshape", booth_painting: "Paint", replace: "Replace", labour: "Labour", part: "Part", sundry: "Sundry", outsource: "Outsource" }[cat] || cat || "")
  const catColor = (cat) => ({ remove_refix: C.accent, reshaping: C.orange, booth_painting: C.purple, replace: C.green, labour: C.sub, part: C.accent, sundry: C.orange, outsource: C.red }[cat] || C.sub)
  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : ""

  return (
    <div style={{ padding: SP.xxl, maxWidth: 700, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: SP.xxl }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SP.sm }}>
          <div>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: C.text }}>{j.jobInfo.vehicle_reg}</span>
            <span style={{ fontSize: 16, color: C.sub, marginLeft: SP.md }}>{j.jobInfo.vehicle_make} {j.jobInfo.vehicle_model}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {j.is_warranty && <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 8, background: C.red + "15", color: C.red }}>Warranty</span>}
            {j.stage === "cancelled" && <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 8, background: C.red + "15", color: C.red }}>✕ Cancelled</span>}
            <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 8, background: isIns ? C.accent + "15" : isQuick ? C.green + "15" : C.orange + "15", color: isIns ? C.accent : isQuick ? C.green : C.orange }}>
              {isIns ? "Insurance" : isQuick ? "Quick" : "Direct"}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 15, color: C.sub }}>{j.jobInfo.customer_name} · {j.jobNumber}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: SP.xs }}>
          {fmtDate(j.created_at)}{isIns && j.jobInfo.insurance_name ? ` · ${j.jobInfo.insurance_name}` : ""}{j.jobInfo.work_type ? ` · ${j.jobInfo.work_type === "paint" ? "Paint & Body" : j.jobInfo.work_type === "mechanical" ? "Mechanical" : "Paint + Mech"}` : ""}
        </div>
        {j.is_warranty && j.parent_job_number && (
          <div style={{ fontSize: 12, color: C.red, marginTop: 4, fontWeight: 600 }}>
            ↳ Warranty for {j.parent_job_number} ({fmtDate(j.parent_job_date)})
          </div>
        )}
        {/* Start Warranty button on closed jobs (not already warranty) */}
        {j.stage === "closed" && !j.is_warranty && startWarrantyJob && (
          <button onClick={() => startWarrantyJob(j)} style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.red}40`, background: C.red + "08", color: C.red, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Start Warranty Job</button>
        )}
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div style={{ ...card, marginBottom: SP.lg }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SP.md }}>Photos ({photos.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: SP.sm }}>
            {photos.map(d => (
              <div key={d.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden" }}>
                <img src={d.dataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                {d.label && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", color: "#fff", fontSize: 10, fontWeight: 600, padding: "10px 6px 4px", textAlign: "center" }}>{d.label}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repair Work */}
      {repairWork.length > 0 && (
        <div style={{ ...card, marginBottom: SP.lg }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SP.md }}>Repair Work</div>
          {repairWork.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${SP.sm}px 0`, borderBottom: i < repairWork.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: catColor(e.category) + "15", color: catColor(e.category), minWidth: 50, textAlign: "center" }}>{catLabel(e.category)}</span>
                <span style={{ fontSize: 15, color: C.text }}>{e.part}</span>
                {e.remark && <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>({e.remark})</span>}
              </div>
              {e.rate > 0 && <span style={{ fontSize: 14, fontFamily: MONO, color: C.sub, fontWeight: 500 }}>{Number(e.rate).toLocaleString()}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Parts Replaced */}
      {replaceParts.length > 0 && (
        <div style={{ ...card, marginBottom: SP.lg }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SP.md }}>Parts Replaced</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm }}>
            {replaceParts.map((e, i) => (
              <div key={i} style={{ padding: "8px 14px", borderRadius: 10, background: C.green + "10", border: `1px solid ${C.green}20`, fontSize: 14, color: C.text }}>
                {e.part}
                {e.remark && <span style={{ fontSize: 12, color: C.muted }}> ({e.remark})</span>}
                {e.rate > 0 && <span style={{ fontSize: 13, fontFamily: MONO, color: C.green, marginLeft: SP.sm, fontWeight: 600 }}>{Number(e.rate).toLocaleString()}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sundries */}
      {sundries.length > 0 && (
        <div style={{ ...card, marginBottom: SP.lg }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SP.md }}>Sundries</div>
          {sundries.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: `${SP.xs}px 0`, color: C.sub, borderBottom: i < sundries.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span>{s.name}{s.remark ? ` (${s.remark})` : ""}</span>
              {s.amount > 0 && <span style={{ fontFamily: MONO, fontWeight: 500 }}>{Number(s.amount).toLocaleString()}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {jobTotal > 0 && (
        <div style={{ ...card, background: C.accent + "08", border: `1px solid ${C.accent}20`, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP.lg }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.sub }}>Total Invoice</span>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: MONO, color: C.text }}>Rs.{Number(jobTotal).toLocaleString()}</span>
        </div>
      )}

      {/* Follow-up note */}
      {j.followUpNote && (
        <div style={{ ...card, background: C.green + "08", border: `1px solid ${C.green}20`, marginBottom: SP.lg }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: SP.xs }}>Follow-up Note</div>
          <div style={{ fontSize: 14, color: C.text, fontStyle: "italic" }}>{j.followUpNote}</div>
        </div>
      )}

      {/* View Full Job */}
      <div onClick={() => openJob(j)} style={{ textAlign: "center", padding: SP.lg, cursor: "pointer", fontSize: 15, fontWeight: 600, color: C.accent, borderRadius: 12, border: `1.5px solid ${C.accent}`, background: C.accent + "08" }}>
        View Full Job Details →
      </div>
    </div>
  )
}

export function ClosedHistory({ jobs, searchQuery, openJob, isTablet, activeJobId, onSelectJob, selectedJobId }) {
  const [expandedVehicle, setExpandedVehicle] = useState(null)
  const [expandedJob, setExpandedJob] = useState(null)

  // Group closed jobs by vehicle registration
  const closedJobs = jobs.filter(j => (j.stage === "closed" || j.stage === "cancelled"))
  const vehicleGroups = {}
  closedJobs.forEach(j => {
    const key = regSearchKey(j.jobInfo.vehicle_reg)
    if (!key) return
    if (!vehicleGroups[key]) vehicleGroups[key] = {
      key, reg: j.jobInfo.vehicle_reg, make: j.jobInfo.vehicle_make || "", model: j.jobInfo.vehicle_model || "",
      customers: [], jobs: [], totalValue: 0, partsRepaired: [], lastVisit: null,
    }
    const g = vehicleGroups[key]
    if (!g.customers.includes(j.jobInfo.customer_name)) g.customers.push(j.jobInfo.customer_name)
    g.jobs.push(j)
    // Sum values
    const invTotal = (j.invoices || []).reduce((s, inv) => s + (inv.total || 0), 0)
    const estTotal = (j.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0)
    g.totalValue += invTotal || estTotal
    // Collect repaired parts
    ;(j.estimates || []).forEach(e => {
      ;(e.entries || e.approved_entries || []).forEach(en => {
        if (en.part && !g.partsRepaired.includes(en.part)) g.partsRepaired.push(en.part)
      })
    })
    // Quick job costs
    ;(j.jobCosts || []).forEach(c => {
      if (c.name && !g.partsRepaired.includes(c.name)) g.partsRepaired.push(c.name)
    })
    const d = new Date(j.created_at)
    if (!g.lastVisit || d > g.lastVisit) g.lastVisit = d
  })

  let vehicles = Object.values(vehicleGroups).sort((a, b) => (b.lastVisit || 0) - (a.lastVisit || 0))

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().replace(/[\s\-]/g, "")
    const flat = s => (s || "").toLowerCase().replace(/[\s\-]/g, "")
    vehicles = vehicles.filter(v =>
      v.key.includes(q) || flat(`${v.make}${v.model}`).includes(q) ||
      v.customers.some(c => flat(c).includes(q)) ||
      v.partsRepaired.some(p => flat(p).includes(q)) ||
      v.jobs.some(j => flat(j.jobNumber).includes(q) || phoneSearchKey(j.jobInfo.customer_phone).includes(q))
    )
  }

  if (!vehicles.length) return (
    <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><IconBadge name="flag" color={C.muted} size={56} /></div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>No closed jobs</div>
      <div style={{ fontSize: 14, marginTop: 6 }}>Completed jobs will appear here grouped by vehicle</div>
    </div>
  )

  const fmtDate = d => d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : ""

  return vehicles.map(v => {
    const isExpanded = expandedVehicle === v.key
    const primaryCustomer = v.customers[v.customers.length - 1] // most recent
    const otherCount = v.customers.length - 1
    const partsShown = v.partsRepaired.slice(0, 4)
    const partsMore = v.partsRepaired.length - 4
    const hasInsurance = v.jobs.some(j => j.jobInfo.job_type === "insurance")
    const borderColor = hasInsurance ? C.accent : C.orange

    return (
      <div key={v.key} style={{ ...card, borderLeft: `4px solid ${borderColor}`, padding: 0, overflow: "hidden" }}>
        {/* Vehicle Summary Header */}
        <div onClick={() => setExpandedVehicle(isExpanded ? null : v.key)} style={{ padding: SP.lg, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SP.sm }}>
            <div>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, color: C.text }}>{v.reg}</span>
              <span style={{ fontSize: 14, color: C.sub, marginLeft: SP.sm }}>{v.make} {v.model}</span>
            </div>
            <span style={{ fontSize: 18, color: C.muted, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </div>

          <div style={{ fontSize: 14, color: C.sub, marginBottom: SP.sm }}>
            {primaryCustomer}
            {otherCount > 0 && <span style={{ color: C.muted, fontSize: 12 }}> + {otherCount} previous</span>}
            <span style={{ color: C.muted }}> · {v.jobs.length} job{v.jobs.length > 1 ? "s" : ""}</span>
          </div>

          {v.partsRepaired.length > 0 && (
            <div style={{ fontSize: 13, color: C.sub, marginBottom: SP.sm, lineHeight: 1.5 }}>
              
              {partsShown.join(", ")}
              {partsMore > 0 && <span style={{ color: C.muted }}> +{partsMore} more</span>}
            </div>
          )}

          <div style={{ display: "flex", gap: SP.lg, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: C.green }}>Rs.{Number(v.totalValue).toLocaleString()}</span>
            <span style={{ color: C.muted }}>{fmtDate(v.lastVisit)}</span>
          </div>
        </div>

        {/* Expanded: Individual Jobs with inline detail */}
        {isExpanded && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: `${SP.sm}px ${SP.md}px ${SP.md}px` }}>
            {v.jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(j => {
              const jobTotal = (j.invoices || []).reduce((s, inv) => s + (inv.total || 0), 0)
                || (j.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0)
              const isIns = j.jobInfo.job_type === "insurance"
              const isQuick = j.jobInfo.job_type === "quick"
              const isJobExpanded = expandedJob === j.id

              // Collect all repair entries with categories
              const repairEntries = []
              ;(j.estimates || []).forEach(e => {
                ;(e.approved_entries || e.entries || []).forEach(en => {
                  repairEntries.push({ part: en.part, category: en.category, qty: en.qty || 1, rate: en.approved_rate || en.rate || 0, remark: en.remark })
                })
              })
              // Quick job costs
              ;(j.jobCosts || []).forEach(c => {
                repairEntries.push({ part: c.name, category: c.type, qty: 1, rate: c.cost || c.price || 0, remark: c.source })
              })

              // Sundries
              const sundries = []
              ;(j.estimates || []).forEach(e => {
                ;(e.sundries || []).forEach(s => sundries.push({ name: s.name, amount: s.amount || 0, remark: s.remark }))
              })

              // Photos
              const photos = (j.jobDocs || []).filter(d => d.dataUrl)

              // Replace parts (category = replace)
              const replaceParts = repairEntries.filter(e => e.category === "replace")
              const repairWork = repairEntries.filter(e => e.category !== "replace")

              // Category labels
              const catLabel = (cat) => {
                const map = { remove_refix: "R/R", reshaping: "Reshape", booth_painting: "Paint", replace: "Replace", labour: "Labour", part: "Part", sundry: "Sundry", outsource: "Outsource" }
                return map[cat] || cat || ""
              }
              const catColor = (cat) => {
                const map = { remove_refix: C.accent, reshaping: C.orange, booth_painting: C.purple, replace: C.green, labour: C.sub, part: C.accent, sundry: C.orange, outsource: C.red }
                return map[cat] || C.sub
              }

              return (
                <div key={j.id} style={{
                  marginTop: SP.sm, borderRadius: 12, background: C.bg,
                  border: `1px solid ${C.border}`, overflow: "hidden",
                }}>
                  {/* Job Header — always visible, click to show detail */}
                  <div onClick={() => {
                    if (onSelectJob) { onSelectJob(j) } // tablet: show in right panel
                    else { setExpandedJob(isJobExpanded ? null : j.id) } // mobile: expand inline
                  }} style={{
                    padding: `${SP.md}px ${SP.lg}px`, cursor: "pointer",
                    background: selectedJobId === j.id ? C.accent + "08" : "transparent",
                    borderLeft: selectedJobId === j.id ? `3px solid ${C.accent}` : "3px solid transparent",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP.xs }}>
                      <div style={{ display: "flex", gap: SP.sm, alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{j.jobNumber}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 8, background: isIns ? C.accent + "15" : isQuick ? C.green + "15" : C.orange + "15", color: isIns ? C.accent : isQuick ? C.green : C.orange }}>
                          {isIns ? "Insurance" : isQuick ? "Quick" : "Direct"}
                        </span>
                        {isIns && j.jobInfo.insurance_name && (
                          <span style={{ fontSize: 12, color: C.muted }}>{j.jobInfo.insurance_name}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: C.text, fontFamily: MONO }}>
                          {jobTotal > 0 ? `Rs.${Number(jobTotal).toLocaleString()}` : ""}
                        </span>
                        <span style={{ fontSize: 14, color: C.muted, transition: "transform 0.2s", transform: isJobExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                      </div>
                    </div>
                    {j.jobInfo.customer_name !== primaryCustomer && (
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: SP.xs }}>{j.jobInfo.customer_name}</div>
                    )}
                    <div style={{ fontSize: 12, color: C.muted }}>{fmtDate(new Date(j.created_at))}{j.jobInfo.work_type ? ` · ${j.jobInfo.work_type === "paint" ? "Paint & Body" : j.jobInfo.work_type === "mechanical" ? "Mechanical" : "Paint + Mech"}` : ""}</div>
                  </div>

                  {/* Expanded inline detail (mobile only — tablet uses right panel) */}
                  {isJobExpanded && !onSelectJob && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: SP.lg }}>

                      {/* Photos */}
                      {photos.length > 0 && (
                        <div style={{ marginBottom: SP.lg }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SP.sm }}>Photos ({photos.length})</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 6 }}>
                            {photos.map(d => (
                              <div key={d.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden" }}>
                                <img src={d.dataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                                {d.label && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", color: "#fff", fontSize: 9, fontWeight: 600, padding: "8px 4px 3px", textAlign: "center" }}>{d.label}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Repair Work */}
                      {repairWork.length > 0 && (
                        <div style={{ marginBottom: SP.lg }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SP.sm }}>Repair Work</div>
                          {repairWork.map((e, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${SP.xs}px 0`, borderBottom: i < repairWork.length - 1 ? `1px solid ${C.border}` : "none" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: catColor(e.category) + "15", color: catColor(e.category) }}>{catLabel(e.category)}</span>
                                <span style={{ fontSize: 14, color: C.text }}>{e.part}</span>
                                {e.remark && <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>({e.remark})</span>}
                              </div>
                              {e.rate > 0 && <span style={{ fontSize: 13, fontFamily: MONO, color: C.sub }}>{Number(e.rate).toLocaleString()}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Replaced Parts */}
                      {replaceParts.length > 0 && (
                        <div style={{ marginBottom: SP.lg }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SP.sm }}>Parts Replaced</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {replaceParts.map((e, i) => (
                              <div key={i} style={{ padding: "6px 12px", borderRadius: 10, background: C.green + "10", border: `1px solid ${C.green}25`, fontSize: 13, color: C.text }}>
                                {e.part}
                                {e.remark && <span style={{ fontSize: 11, color: C.muted }}> ({e.remark})</span>}
                                {e.rate > 0 && <span style={{ fontSize: 12, fontFamily: MONO, color: C.green, marginLeft: 6 }}>{Number(e.rate).toLocaleString()}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sundries */}
                      {sundries.length > 0 && (
                        <div style={{ marginBottom: SP.lg }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SP.sm }}>Sundries</div>
                          {sundries.map((s, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: `${SP.xs}px 0`, color: C.sub }}>
                              <span>{s.name}{s.remark ? ` (${s.remark})` : ""}</span>
                              {s.amount > 0 && <span style={{ fontFamily: MONO }}>{Number(s.amount).toLocaleString()}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Invoice Summary */}
                      {jobTotal > 0 && (
                        <div style={{ background: C.card, borderRadius: 10, padding: SP.md, border: `1px solid ${C.border}`, marginBottom: SP.md, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.sub }}>Total</span>
                          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO, color: C.text }}>Rs.{Number(jobTotal).toLocaleString()}</span>
                        </div>
                      )}

                      {/* View Full Job link */}
                      <div onClick={() => openJob(j)} style={{ textAlign: "center", padding: `${SP.sm}px 0`, cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.accent }}>
                        View Full Job →
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  })
}

