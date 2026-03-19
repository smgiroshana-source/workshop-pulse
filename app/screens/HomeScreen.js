"use client"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, card, SP, ALL_STAGES, regSearchKey, phoneSearchKey } from "../WorkshopContext"

// Shared job card renderer
function JobCard({ j, isTablet, isSelected, openJob, setHoverJobId, setHoverY }) {
  const stage = ALL_STAGES[j.stage] || ALL_STAGES.job_received
  const estTotal = (j.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0)
  const jobReplaceCnt = (j.estimates || []).flatMap(est => (est.approved_entries || est.entries || []).filter(e => e.category === "replace")).length
  const jobArrivedCnt = Object.values(j.partsArrived || {}).filter(Boolean).length
  const thumb = (j.jobDocs || [])[0]?.dataUrl
  return <div onClick={() => openJob(j)} onMouseEnter={e => { if (isTablet) { setHoverJobId(j.id); setHoverY(e.clientY) } }} onMouseLeave={() => setHoverJobId(null)} style={{ ...card, cursor: "pointer", padding: isTablet ? "10px 12px" : "12px 14px", background: isSelected ? C.accent + "08" : C.card, border: isSelected ? `1px solid ${C.accent}40` : `1px solid ${C.border}`, borderLeft: `4px solid ${stage.color}`, display: "flex", gap: 10, alignItems: "center" }}>
    {thumb ? <img src={thumb} style={{ width: isTablet ? 48 : 56, height: isTablet ? 48 : 56, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} alt="" /> : <div style={{ width: isTablet ? 48 : 56, height: isTablet ? 48 : 56, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>🚗</div>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: isTablet ? 16 : 18, fontWeight: 700 }}>{j.jobInfo.vehicle_reg || "New Job"}</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
          {j.paused && <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, background: C.orange + "15", padding: "5px 10px", borderRadius: 6 }}>⏸</span>}
          {j.onHold && <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, background: C.orange + "15", padding: "5px 10px", borderRadius: 6 }}>📌</span>}
          <span style={{ fontSize: isTablet ? 11 : 12, fontWeight: 700, color: stage.color, background: stage.color + "12", padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>{stage.icon} {stage.label}</span>
        </div>
      </div>
      <div style={{ fontSize: 14, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.jobInfo.customer_name || "--"}{j.jobInfo.vehicle_make ? ` · ${j.jobInfo.vehicle_make} ${j.jobInfo.vehicle_model || ""}` : ""}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
        {j.jobInfo.insurance_name ? <span style={{ fontSize: 12, color: C.accent }}>🛡️ {j.jobInfo.insurance_name}</span> : j.jobInfo.job_type === "quick" ? <span style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>⚡ Quick</span> : <span style={{ fontSize: 12, color: C.green }}>💰 Direct</span>}
        {jobReplaceCnt > 0 && <span style={{ fontSize: 12, color: jobArrivedCnt >= jobReplaceCnt ? C.green : C.orange }}>📦 {jobArrivedCnt}/{jobReplaceCnt}</span>}
        {estTotal > 0 && <span style={{ fontSize: 12, fontFamily: MONO, color: C.sub }}>Rs.{Number(estTotal).toLocaleString()}</span>}
      </div>
      {j.onHold && j.holdUntil && (() => {
        const ms = new Date(j.holdUntil) - new Date()
        const hours = Math.ceil(ms / (1000 * 60 * 60))
        const days = Math.ceil(ms / (1000 * 60 * 60 * 24))
        if (ms <= 0) return j.stage === "delivered" ? <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginTop: 3 }}>🔔 Follow-up due!</div> : <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginTop: 3 }}>🔔 Retry call now!</div>
        if (j.stage === "follow_up") return <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginTop: 3 }}>📵 No answer ({j.followUpAttempts}/3) · retry in {hours}h</div>
        return <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginTop: 3 }}>⏰ Follow-up in {days} day{days !== 1 ? "s" : ""}</div>
      })()}
      {j.stage === "closed" && j.followUpNote && <div style={{ fontSize: 12, color: C.sub, marginTop: 3, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>💬 {j.followUpNote}</div>}
    </div>
  </div>
}

// Dashboard summary metrics
function DashboardCards({ jobs, setFilterStage, setHomeTab, clearSearch }) {
  const active = jobs.filter(j => !j.onHold && j.stage !== "closed")
  const pendingEst = active.filter(j => j.stage === "est_pending").length
  const partsWaiting = active.filter(j => (j.estimates || []).flatMap(e => (e.approved_entries || e.entries || []).filter(en => en.category === "replace")).some(p => !j.partsArrived?.[p.id])).length
  const overdue = jobs.filter(j => j.onHold && j.holdUntil && new Date(j.holdUntil) < new Date()).length
  const metrics = [
    { label: "Active", value: active.length, color: C.accent, action: () => { clearSearch(); setHomeTab("active"); setFilterStage("all") } },
    { label: "Est. Pending", value: pendingEst, color: C.orange, action: () => { clearSearch(); setHomeTab("active"); setFilterStage("est_pending") } },
    { label: "Parts Wait", value: partsWaiting, color: C.purple, action: () => { clearSearch(); setHomeTab("active"); setFilterStage("parts_waiting") } },
    { label: "Overdue", value: overdue, color: C.red, action: () => { clearSearch(); setHomeTab("on_hold") } },
  ].filter(m => m.value > 0 || m.label === "Active")
  return <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
    {metrics.map(m => <div key={m.label} onClick={m.action} style={{ flex: "0 0 auto", minWidth: 100, background: C.card, borderRadius: 14, padding: "10px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer", borderBottom: `3px solid ${m.color}`, minHeight: 72 }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: m.color, fontFamily: MONO }}>{m.value}</div>
      <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, marginTop: 2 }}>{m.label}</div>
    </div>)}
  </div>
}

// Sort and filter helper
function sortJobs(filtered, sortBy) {
  const stageKeys = Object.keys(ALL_STAGES)
  if (sortBy === "oldest") return [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  if (sortBy === "highest_value") return [...filtered].sort((a, b) => (b.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0) - (a.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0))
  if (sortBy === "stage_order") return [...filtered].sort((a, b) => stageKeys.indexOf(a.stage) - stageKeys.indexOf(b.stage))
  return filtered
}

export default function HomeScreen() {
  const {
    jobs, homeTab, setHomeTab, filterStage, setFilterStage,
    searchQuery, setSearchQuery,
    isTablet, hoverJobId, setHoverJobId, hoverY, setHoverY,
    activeJobId, openJob, startNewJob,
    sidebarCollapsed, sidebarExpanded, setSidebarExpanded,
    isDetailScreen,
    APP_VERSION,
    sortBy, setSortBy,
  } = useWorkshop()

  function jobListPanel() {
    return (
      <div>
        <div style={{ paddingTop: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Workshop Pulse <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, letterSpacing: 0 }}>v{APP_VERSION}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: isTablet ? 28 : 36, fontWeight: 700, color: C.text, letterSpacing: "-1px" }}>Jobs</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div onClick={() => setSortBy(s => s === "newest" ? "oldest" : s === "oldest" ? "highest_value" : s === "highest_value" ? "stage_order" : "newest")} style={{ fontSize: 12, color: C.accent, cursor: "pointer", padding: "4px 10px", borderRadius: 8, background: C.accent + "08" }}>
                {sortBy === "newest" ? "↓ New" : sortBy === "oldest" ? "↑ Old" : sortBy === "highest_value" ? "💰 Value" : "📊 Stage"}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 15, color: C.sub }}>{jobs.filter(j => !j.onHold && j.stage !== "closed").length}</div>
            </div>
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search vehicles..." style={{ ...inp, background: C.card, fontSize: isTablet ? 15 : 17, paddingLeft: 42, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }} />
          {searchQuery && <span onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, cursor: "pointer", color: C.muted, padding: 4 }}>✕</span>}
        </div>

        {homeTab === "active" && <DashboardCards jobs={jobs} setFilterStage={setFilterStage} setHomeTab={setHomeTab} clearSearch={() => setSearchQuery("")} />}

        <div style={{ display: "flex", gap: 0, marginBottom: 12, background: C.card, borderRadius: 14, padding: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {[["active", "Active", jobs.filter(j => !j.onHold && j.stage !== "closed").length], ["on_hold", "📌 On Hold", jobs.filter(j => j.onHold).length], ["closed", "🏁 Closed", jobs.filter(j => j.stage === "closed").length]].map(([k, l, cnt]) => <div key={k} onClick={() => { setHomeTab(k); setFilterStage("all") }} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, minHeight: 44, cursor: "pointer", background: homeTab === k ? (k === "on_hold" ? C.orange + "12" : k === "closed" ? C.sub + "12" : C.accent + "12") : "transparent", color: homeTab === k ? (k === "on_hold" ? C.orange : k === "closed" ? C.sub : C.accent) : C.muted, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>{l} ({cnt})</div>)}
        </div>

        {homeTab === "active" && <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, marginBottom: 4 }}>
          {filterStage === "parts_waiting" && <div onClick={() => setFilterStage("all")} style={{ padding: "12px 18px", borderRadius: 20, minHeight: 44, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", background: C.purple + "15", color: C.purple, border: `1px solid ${C.purple}50` }}>{"\uD83D\uDCE6"} Parts Waiting ×</div>}
          <div onClick={() => setFilterStage("all")} style={{ padding: "12px 18px", borderRadius: 20, minHeight: 44, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, background: filterStage === "all" ? C.accent : C.card, color: filterStage === "all" ? "#fff" : C.sub, border: `1px solid ${filterStage === "all" ? C.accent : C.border}` }}>All ({jobs.filter(j => !j.onHold && j.stage !== "closed").length})</div>
          {Object.entries(ALL_STAGES).filter(([, s]) => s.label !== "Closed").map(([key, s]) => { const cnt = jobs.filter(j => j.stage === key && !j.onHold).length; return cnt > 0 ? <div key={key} onClick={() => setFilterStage(filterStage === key ? "all" : key)} style={{ padding: "12px 18px", borderRadius: 20, minHeight: 44, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", background: filterStage === key ? s.color + "15" : C.card, color: filterStage === key ? s.color : C.sub, border: `1px solid ${filterStage === key ? s.color + "50" : C.border}` }}>{s.icon} {s.label} ({cnt})</div> : null })}
        </div>}

        {(() => {
          let filtered = homeTab === "on_hold" ? jobs.filter(j => j.onHold) : homeTab === "closed" ? jobs.filter(j => j.stage === "closed") : jobs.filter(j => !j.onHold && j.stage !== "closed")
          if (homeTab === "active" && filterStage !== "all") {
            if (filterStage === "parts_waiting") {
              filtered = filtered.filter(j => (j.estimates || []).flatMap(e => (e.approved_entries || e.entries || []).filter(en => en.category === "replace")).some(p => !j.partsArrived?.[p.id]))
            } else {
              filtered = filtered.filter(j => j.stage === filterStage)
            }
          }
          if (searchQuery.trim()) { const q = searchQuery.toLowerCase().replace(/[\s\-]/g, ""); filtered = filtered.filter(j => { const reg = regSearchKey(j.jobInfo.vehicle_reg); const phone = phoneSearchKey(j.jobInfo.customer_phone); const name = (j.jobInfo.customer_name || "").toLowerCase(); const make = (j.jobInfo.vehicle_make || "").toLowerCase(); const num = (j.jobNumber || "").toLowerCase(); return reg.includes(q) || phone.includes(q) || name.includes(q) || make.includes(q) || num.includes(q) }) }
          filtered = sortJobs(filtered, sortBy)
          return filtered.length ? filtered.map(j => <JobCard key={j.id} j={j} isTablet={isTablet} isSelected={isTablet && activeJobId === j.id} openJob={openJob} setHoverJobId={setHoverJobId} setHoverY={setHoverY} />)
            : <div style={{ textAlign: "center", padding: 40, color: C.muted }}><div style={{ fontSize: 40, marginBottom: 12 }}>{homeTab === "on_hold" ? "📌" : homeTab === "closed" ? "🏁" : "🔧"}</div><div style={{ fontSize: 18, fontWeight: 600 }}>{homeTab === "on_hold" ? "No jobs on hold" : homeTab === "closed" ? "No closed jobs" : `No jobs${filterStage !== "all" ? " in this stage" : ""}`}</div><div style={{ fontSize: 16, marginTop: 6 }}>{homeTab === "on_hold" ? "Delivered jobs wait here for 2-week follow-up" : homeTab === "closed" ? "Completed jobs will appear here" : "Tap + to create a new job"}</div></div>
        })()}

        <button onClick={startNewJob} style={{ ...btn(C.accent, "#fff"), marginTop: 8, position: "sticky", bottom: 20 }}>+ New Job</button>
      </div>
    )
  }

  function emptyDetail() {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", color: C.muted }}>
        <div style={{ fontSize: 60, marginBottom: 16, opacity: 0.3 }}>🔧</div>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Select a job</div>
        <div style={{ fontSize: 16 }}>Tap a job from the list to see details</div>
      </div>
    )
  }

  if (isTablet) return emptyDetail()
  return jobListPanel()
}
