"use client"
import { useState } from "react"
import { WorkshopProvider, useWorkshop, C, FONT, MONO, btn, btnSm, inp, card, pill, Sheet, NavBar, ALL_STAGES, fmt, regSearchKey, phoneSearchKey, SP } from "./WorkshopContext"
import { useAuth } from "./AuthGate"
import { uploadPhoto, deletePhoto } from "./supabase"
import UserManagement from "./screens/UserManagement"
import HomeScreen, { ClosedHistory, ClosedJobDetail } from "./screens/HomeScreen"
import NewJobScreen from "./screens/NewJobScreen"
import JobScreen from "./screens/JobScreen"
import EstimateParts from "./screens/EstimateParts"
import EstimateCat from "./screens/EstimateCat"
import EstimateReview from "./screens/EstimateReview"
import ApprovalUpload from "./screens/ApprovalUpload"
import ApprovalEntry from "./screens/ApprovalEntry"
import ApprovalSummary from "./screens/ApprovalSummary"
import InvoiceDetail from "./screens/InvoiceDetail"
import StoreScreen from "./screens/StoreScreen"

function AppInner() {
  const {
    screen, setScreen,
    toast,
    isTablet,
    sidebarCollapsed, sidebarExpanded, setSidebarExpanded,
    activeJobId,
    jobs,
    homeTab,
    jobDocs, setJobDocs,
    showImage, setShowImage,
    showUploadMenu, setShowUploadMenu,
    photoTag, setPhotoTag,
    estimates,
    selEst,
    showSubFlowPrompt, setShowSubFlowPrompt,
    setJobPaused,
    showPQScreen, setShowPQScreen,
    isInsurance, isDirectJob,
    partsQuotation, setPartsQuotation,
    pqTab, setPqTab,
    pqStatus, setPqStatus,
    pqApprovalPhoto, setPqApprovalPhoto,
    pqLumpMode, setPqLumpMode,
    pqLumpSum, setPqLumpSum,
    pqTotalPrice, pqFilled, pqTotal, pqAllFilled, pqApprovedTotal, pqHasApproval,
    supplierInvoices, setSupplierInvoices,
    showSupplierInvForm, setShowSupplierInvForm,
    customerConfirmed, confirmCustomer,
    generatePQPDF, sharePQ,
    jobInfo,
    openJob,
    hoverJobId, setHoverJobId,
    hoverY, setHoverY,
    tt,
    isDetailScreen,
    APP_VERSION,
    searchQuery, setSearchQuery,
    filterStage, setFilterStage,
    setHomeTab,
    sortBy, setSortBy,
    startNewJob,
    setNewJobInfo,
    newJobInfo,
    pqPhotoRef,
    uploadRef,
    closedCount,
    purchaseOrders, setPurchaseOrders,
    grns, setGrns,
    customerRegistry,
  } = useWorkshop()
  const { signOut, isSuperAdmin, role } = useAuth()
  const [showUserMgmt, setShowUserMgmt] = useState(false)
  const [selectedClosedJob, setSelectedClosedJob] = useState(null)
  const [rightTab, setRightTab] = useState(null) // null | "store" | "registry" | "payments"
  const [regSearch, setRegSearch] = useState("")
  const [regSelectedVehicle, setRegSelectedVehicle] = useState(null) // vehicle reg key for expanded view

  // Job list panel (shared between phone home + tablet sidebar)
  function jobListPanel() {
    return (
      <div>
        <div style={{ paddingTop: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.accent, letterSpacing: 1.5, textTransform: "uppercase" }}>Workshop Pulse <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, letterSpacing: 0 }}>v{APP_VERSION}</span></div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {isSuperAdmin && <div onClick={() => setShowUserMgmt(true)} style={{ fontSize: 12, color: C.accent, cursor: "pointer", padding: "4px 10px", borderRadius: 8, background: C.accent + "10", border: `1px solid ${C.accent}30` }}>👥 Users</div>}
              <div onClick={signOut} style={{ fontSize: 13, color: C.sub, cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, minHeight: 36, display: "flex", alignItems: "center" }}>Logout</div>
            </div>
          </div>
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

        {/* Dashboard summary cards */}
        {homeTab === "active" && (() => {
          const active = jobs.filter(j => !j.onHold && j.stage !== "closed")
          const pendingEst = active.filter(j => j.stage === "est_pending").length
          const partsWaiting = active.filter(j => (j.estimates || []).flatMap(e => (e.approved_entries || e.entries || []).filter(en => en.category === "replace")).some(p => !j.partsArrived?.[p.id])).length
          const overdue = jobs.filter(j => j.onHold && j.holdUntil && new Date(j.holdUntil) < new Date()).length
          const metrics = [
            { label: "Active", value: active.length, color: C.accent, action: () => { setSearchQuery(""); setHomeTab("active"); setFilterStage("all") } },
            { label: "Est. Pending", value: pendingEst, color: C.orange, action: () => { setSearchQuery(""); setHomeTab("active"); setFilterStage("est_pending") } },
            { label: "Parts Wait", value: partsWaiting, color: C.purple, action: () => { setSearchQuery(""); setHomeTab("active"); setFilterStage("parts_waiting") } },
            { label: "Overdue", value: overdue, color: C.red, action: () => { setSearchQuery(""); setHomeTab("on_hold") } },
          ].filter(m => m.value > 0 || m.label === "Active")
          return <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
            {metrics.map(m => <div key={m.label} onClick={m.action} style={{ flex: "0 0 auto", minWidth: 100, background: C.card, borderRadius: 14, padding: "10px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer", borderBottom: `3px solid ${m.color}`, minHeight: 72 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: m.color, fontFamily: MONO }}>{m.value}</div>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, marginTop: 2 }}>{m.label}</div>
            </div>)}
          </div>
        })()}

        {/* Active / On Hold / Closed tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 12, background: C.card, borderRadius: 14, padding: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {[["active", "Active", jobs.filter(j => !j.onHold && j.stage !== "closed").length], ["on_hold", "📌 On Hold", jobs.filter(j => j.onHold).length], ["closed", "🏁 Closed", jobs.filter(j => j.stage === "closed").length || closedCount || 0]].map(([k, l, cnt]) => (
            <div key={k} onClick={() => { setHomeTab(k); setFilterStage("all"); setSelectedClosedJob(null) }} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, minHeight: 44, cursor: "pointer", background: homeTab === k ? (k === "on_hold" ? C.orange + "12" : k === "closed" ? C.sub + "12" : C.accent + "12") : "transparent", color: homeTab === k ? (k === "on_hold" ? C.orange : k === "closed" ? C.sub : C.accent) : C.muted, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>{l} ({cnt})</div>
          ))}
        </div>

        {/* Stage filter pills -- active tab only */}
        {homeTab === "active" && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, marginBottom: 4 }}>
            {filterStage === "parts_waiting" && <div onClick={() => setFilterStage("all")} style={{ padding: "12px 18px", borderRadius: 20, minHeight: 44, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", background: C.purple + "15", color: C.purple, border: `1px solid ${C.purple}50` }}>{"\uD83D\uDCE6"} Parts Waiting ×</div>}
            <div onClick={() => setFilterStage("all")} style={{ padding: "12px 18px", borderRadius: 20, minHeight: 44, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, background: filterStage === "all" ? C.accent : C.card, color: filterStage === "all" ? "#fff" : C.sub, border: `1px solid ${filterStage === "all" ? C.accent : C.border}` }}>All ({jobs.filter(j => !j.onHold && j.stage !== "closed").length})</div>
            {Object.entries(ALL_STAGES).filter(([, s]) => s.label !== "Closed").map(([key, s]) => { const cnt = jobs.filter(j => j.stage === key && !j.onHold).length; return cnt > 0 ? <div key={key} onClick={() => setFilterStage(filterStage === key ? "all" : key)} style={{ padding: "12px 18px", borderRadius: 20, minHeight: 44, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", background: filterStage === key ? s.color + "15" : C.card, color: filterStage === key ? s.color : C.sub, border: `1px solid ${filterStage === key ? s.color + "50" : C.border}` }}>{s.icon} {s.label} ({cnt})</div> : null })}
          </div>
        )}

        {/* Job cards */}
        {homeTab === "closed" && <ClosedHistory jobs={jobs} searchQuery={searchQuery} openJob={openJob} isTablet={isTablet} activeJobId={activeJobId} onSelectJob={isTablet ? (j) => setSelectedClosedJob(j) : null} selectedJobId={selectedClosedJob?.id} />}
        {homeTab !== "closed" && (() => {
          let filtered = homeTab === "on_hold" ? jobs.filter(j => j.onHold) : jobs.filter(j => !j.onHold && j.stage !== "closed")
          if (homeTab === "active" && filterStage !== "all") {
            if (filterStage === "parts_waiting") {
              filtered = filtered.filter(j => (j.estimates || []).flatMap(e => (e.approved_entries || e.entries || []).filter(en => en.category === "replace")).some(p => !j.partsArrived?.[p.id]))
            } else {
              filtered = filtered.filter(j => j.stage === filterStage)
            }
          }
          if (searchQuery.trim()) { const q = searchQuery.toLowerCase().replace(/[\s\-]/g, ""); filtered = filtered.filter(j => { const reg = regSearchKey(j.jobInfo.vehicle_reg); const phone = phoneSearchKey(j.jobInfo.customer_phone); const name = (j.jobInfo.customer_name || "").toLowerCase(); const make = (j.jobInfo.vehicle_make || "").toLowerCase(); const num = (j.jobNumber || "").toLowerCase(); return reg.includes(q) || phone.includes(q) || name.includes(q) || make.includes(q) || num.includes(q) }) }
          // Sort
          const stageKeys = Object.keys(ALL_STAGES)
          if (sortBy === "oldest") filtered = [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          else if (sortBy === "highest_value") filtered = [...filtered].sort((a, b) => (b.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0) - (a.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0))
          else if (sortBy === "stage_order") filtered = [...filtered].sort((a, b) => stageKeys.indexOf(a.stage) - stageKeys.indexOf(b.stage))
          return filtered.length ? filtered.map(j => {
            const stage = ALL_STAGES[j.stage] || ALL_STAGES.job_received
            const estTotal = (j.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0)
            const jobReplaceCnt = (j.estimates || []).flatMap(est => (est.approved_entries || est.entries || []).filter(e => e.category === "replace")).length
            const jobArrivedCnt = Object.values(j.partsArrived || {}).filter(Boolean).length
            const isSelected = isTablet && activeJobId === j.id
            const thumb = (j.jobDocs || [])[0]?.dataUrl
            return (
              <div key={j.id} onClick={() => openJob(j)} onMouseEnter={e => { if (isTablet) { setHoverJobId(j.id); setHoverY(e.clientY) } }} onMouseLeave={() => setHoverJobId(null)} style={{ ...card, cursor: "pointer", padding: isTablet ? "10px 12px" : "12px 14px", background: isSelected ? C.accent + "08" : C.card, border: isSelected ? `1px solid ${C.accent}40` : `1px solid ${C.border}`, borderLeft: `4px solid ${stage.color}`, display: "flex", gap: 10, alignItems: "center" }}>
                {thumb ? <img src={thumb} style={{ width: isTablet ? 48 : 52, height: isTablet ? 48 : 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} alt="" /> : <div style={{ width: isTablet ? 48 : 52, height: isTablet ? 48 : 52, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>🚗</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontFamily: MONO, fontSize: isTablet ? 16 : 18, fontWeight: 700 }}>{j.jobInfo.vehicle_reg || "New Job"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                      {j.paused && <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, background: C.orange + "15", padding: "3px 8px", borderRadius: 6 }}>⏸</span>}
                      {j.onHold && <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, background: C.orange + "15", padding: "3px 8px", borderRadius: 6 }}>📌</span>}
                      <span style={{ fontSize: isTablet ? 11 : 12, fontWeight: 700, color: stage.color, background: stage.color + "12", padding: "3px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>{stage.icon} {stage.label}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: isTablet ? 14 : 15, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.jobInfo.customer_name || "--"}{j.jobInfo.vehicle_make ? ` · ${j.jobInfo.vehicle_make} ${j.jobInfo.vehicle_model || ""}` : ""}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                    {j.jobInfo.insurance_name ? <span style={{ fontSize: 12, color: C.accent }}>🛡️ {j.jobInfo.insurance_name}</span> : j.jobInfo.job_type === "quick" ? <span style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>⚡ Quick</span> : <span style={{ fontSize: 12, color: C.green }}>💰 Direct</span>}
                    {jobReplaceCnt > 0 && <span style={{ fontSize: 12, color: jobArrivedCnt >= jobReplaceCnt ? C.green : C.orange }}>📦 {jobArrivedCnt}/{jobReplaceCnt}</span>}
                    {estTotal > 0 && <span style={{ fontSize: 12, fontFamily: MONO, color: C.sub }}>Rs.{Number(estTotal).toLocaleString()}</span>}
                  </div>
                  {j.onHold && j.holdUntil && (() => {
                    const ms = new Date(j.holdUntil) - new Date()
                    const hours = Math.ceil(ms / (1000 * 60 * 60))
                    const days = Math.ceil(ms / (1000 * 60 * 60 * 24))
                    if (ms <= 0) return j.stage === "delivered" ? <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginTop: 4 }}>🔔 Follow-up due!</div> : <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginTop: 4 }}>🔔 Retry call now!</div>
                    if (j.stage === "follow_up") return <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginTop: 4 }}>📵 No answer ({j.followUpAttempts}/3) · retry in {hours}h</div>
                    return <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginTop: 4 }}>⏰ Follow-up in {days} day{days !== 1 ? "s" : ""}</div>
                  })()}
                  {j.stage === "closed" && j.followUpNote && <div style={{ fontSize: 12, color: C.sub, marginTop: 4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>💬 {j.followUpNote}</div>}
                </div>
              </div>
            )
          }) : (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{homeTab === "on_hold" ? "📌" : homeTab === "closed" ? "🏁" : "🔧"}</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{homeTab === "on_hold" ? "No jobs on hold" : homeTab === "closed" ? "No closed jobs" : `No jobs${filterStage !== "all" ? " in this stage" : ""}`}</div>
              <div style={{ fontSize: 16, marginTop: 6 }}>{homeTab === "on_hold" ? "Delivered jobs wait here for 2-week follow-up" : homeTab === "closed" ? "Completed jobs will appear here" : "Tap + to create a new job"}</div>
            </div>
          )
        })()}

        <button onClick={startNewJob} style={{ ...btn(C.accent, "#fff"), marginTop: 8, position: "sticky", bottom: 20 }}>+ New Job</button>
      </div>
    )
  }

  // Right panel hub — shows when no job is selected on tablet
  function rightPanelHub() {
    // Pending payments: jobs with invoices that aren't fully paid
    const pendingPaymentJobs = jobs.filter(j => {
      if (j.stage === "closed") return false
      const invs = j.invoices || []
      return invs.some(inv => {
        const total = (inv.entries || []).reduce((s, e) => s + ((e.approved || e.amount || 0) * (e.qty || 1)), 0)
        const paid = [...(inv.insurance_payments || []), ...(inv.customer_payments || [])].reduce((s, p) => s + (p.amount || 0), 0)
        return total > 0 && paid < total
      })
    })

    // Job type counts
    const insCount = jobs.filter(j => j.jobInfo?.job_type === "insurance" && j.stage !== "closed").length
    const directCount = jobs.filter(j => j.jobInfo?.job_type === "direct" && j.stage !== "closed").length
    const quickCount = jobs.filter(j => j.jobInfo?.job_type === "quick" && j.stage !== "closed").length

    // Customer registry entries
    const regEntries = Object.values(customerRegistry.byReg || {})

    // If a right tab is selected, show that content
    if (rightTab === "store") {
      return <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span onClick={() => setRightTab(null)} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Back</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Store</span>
        </div>
        <StoreScreen purchaseOrders={purchaseOrders} grns={grns} setPurchaseOrders={setPurchaseOrders} setGrns={setGrns} tt={tt} />
      </div>
    }

    if (rightTab === "registry") {
      // If a vehicle is selected, show its job history detail
      if (regSelectedVehicle) {
        const vehicleJobs = jobs.filter(j => regSearchKey(j.jobInfo.vehicle_reg) === regSelectedVehicle).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        const firstJob = vehicleJobs[0]
        return <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span onClick={() => setRegSelectedVehicle(null)} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Back</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{firstJob?.jobInfo.vehicle_reg || regSelectedVehicle}</span>
            <span style={{ fontSize: 14, color: C.muted }}>{firstJob?.jobInfo.vehicle_make} {firstJob?.jobInfo.vehicle_model}</span>
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>{firstJob?.jobInfo.customer_name} · {vehicleJobs.length} job{vehicleJobs.length !== 1 ? "s" : ""}</div>
          {vehicleJobs.map(j => <ClosedJobDetail key={j.id} job={j} openJob={openJob} />)}
        </div>
      }

      // Search filter
      const q = regSearch.toLowerCase().replace(/[\s\-]/g, "")
      const filteredEntries = q ? regEntries.filter(r =>
        regSearchKey(r.vehicle_reg).includes(q) ||
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.vehicle_make || "").toLowerCase().includes(q) ||
        (r.vehicle_model || "").toLowerCase().includes(q) ||
        (r.customer_phone || "").replace(/[\s\-]/g, "").includes(q)
      ) : regEntries

      return <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span onClick={() => { setRightTab(null); setRegSearch("") }} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Back</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Customer Registry</span>
        </div>
        <input value={regSearch} onChange={e => setRegSearch(e.target.value)} placeholder="Search vehicle, customer, phone..." style={{ ...inp, marginBottom: 12, width: "100%", boxSizing: "border-box" }} />
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{filteredEntries.length} vehicle{filteredEntries.length !== 1 ? "s" : ""}{q ? " found" : " registered"}</div>
        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{q ? "🔍" : "📋"}</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{q ? "No matching vehicles" : "No vehicles registered yet"}</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>{q ? "Try a different search term" : "Vehicles are registered when jobs are created"}</div>
          </div>
        ) : filteredEntries.map(r => {
          const vehicleJobCount = jobs.filter(j => regSearchKey(j.jobInfo.vehicle_reg) === regSearchKey(r.vehicle_reg)).length
          return (
            <div key={r.vehicle_reg} onClick={() => setRegSelectedVehicle(regSearchKey(r.vehicle_reg))} style={{ ...card, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{r.vehicle_reg}</div>
                <div style={{ fontSize: 14, color: C.sub }}>{r.customer_name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{r.vehicle_make} {r.vehicle_model}{r.customer_phone ? ` · ${r.customer_phone}` : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{vehicleJobCount} job{vehicleJobCount !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 18, color: C.muted }}>›</div>
              </div>
            </div>
          )
        })}
      </div>
    }

    if (rightTab === "payments") {
      return <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span onClick={() => setRightTab(null)} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Back</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Pending Payments</span>
        </div>
        {pendingPaymentJobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>All payments up to date</div>
          </div>
        ) : pendingPaymentJobs.map(j => {
          const inv = (j.invoices || [])[0]
          if (!inv) return null
          const total = (inv.entries || []).reduce((s, e) => s + ((e.approved || e.amount || 0) * (e.qty || 1)), 0)
          const paid = [...(inv.insurance_payments || []), ...(inv.customer_payments || [])].reduce((s, p) => s + (p.amount || 0), 0)
          const balance = total - paid
          const stage = ALL_STAGES[j.stage] || ALL_STAGES.job_received
          return (
            <div key={j.id} onClick={() => openJob(j)} style={{ ...card, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{j.jobInfo.vehicle_reg}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, background: stage.color + "12", padding: "2px 8px", borderRadius: 6 }}>{stage.icon} {stage.label}</span>
                </div>
                <div style={{ fontSize: 14, color: C.sub }}>{j.jobInfo.customer_name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{j.jobInfo.insurance_name || (j.jobInfo.job_type === "quick" ? "Quick" : "Direct")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: C.red }}>Rs.{balance.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: C.muted }}>of Rs.{total.toLocaleString()}</div>
              </div>
            </div>
          )
        })}
      </div>
    }

    // Default: show hub cards
    return (
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: C.text }}>Workshop Hub</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Store */}
          <div onClick={() => setRightTab("store")} style={{ ...card, cursor: "pointer", padding: "20px 16px", textAlign: "center", border: `1px solid ${C.purple}20`, transition: "all 0.2s" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏪</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Store</div>
            <div style={{ fontSize: 13, color: C.muted }}>PO & GRN</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.purple, marginTop: 8 }}>{purchaseOrders.length} PO · {grns.length} GRN</div>
          </div>

          {/* New Job Buttons */}
          <div style={{ ...card, padding: "16px", border: `1px solid ${C.accent}20`, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>New Job</div>
            {[
              { key: "insurance", label: "Insurance", icon: "🛡️", color: C.accent, count: insCount },
              { key: "direct", label: "Non-Insurance", icon: "💰", color: C.green, count: directCount },
              { key: "quick", label: "Quick Job", icon: "⚡", color: C.orange, count: quickCount },
            ].map(t => (
              <div key={t.key} onClick={() => { startNewJob(); setNewJobInfo(prev => ({ ...prev, job_type: t.key })) }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", background: t.color + "08", border: `1px solid ${t.color}20`, transition: "all 0.2s" }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text, flex: 1 }}>{t.label}</span>
                <span style={{ fontSize: 12, fontFamily: MONO, fontWeight: 700, color: t.color }}>{t.count}</span>
              </div>
            ))}
          </div>

          {/* Customer Registry */}
          <div onClick={() => setRightTab("registry")} style={{ ...card, cursor: "pointer", padding: "20px 16px", textAlign: "center", border: `1px solid ${C.green}20`, transition: "all 0.2s" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Customers</div>
            <div style={{ fontSize: 13, color: C.muted }}>Registry</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.green, marginTop: 8 }}>{regEntries.length} vehicles</div>
          </div>

          {/* Pending Payments */}
          <div onClick={() => setRightTab("payments")} style={{ ...card, cursor: "pointer", padding: "20px 16px", textAlign: "center", border: `1px solid ${pendingPaymentJobs.length > 0 ? C.red : C.border}20`, transition: "all 0.2s" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Payments</div>
            <div style={{ fontSize: 13, color: C.muted }}>Pending</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: pendingPaymentJobs.length > 0 ? C.red : C.green, marginTop: 8 }}>
              {pendingPaymentJobs.length > 0 ? `${pendingPaymentJobs.length} pending` : "All clear"}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: FONT, background: C.bg, color: C.text, minHeight: "100vh", display: isTablet ? "flex" : "block" }}>
      {/* TABLET: Left sidebar */}
      {isTablet && (
        <div onClick={() => { if (sidebarCollapsed) setSidebarExpanded(true) }} style={{ width: sidebarCollapsed ? 82 : 380, minWidth: sidebarCollapsed ? 82 : 380, height: "100vh", position: "sticky", top: 0, overflowY: "auto", overflowX: "hidden", borderRight: `1px solid ${C.border}`, padding: sidebarCollapsed ? "8px 6px" : "0 16px", background: C.bg, transition: "width 0.25s ease, min-width 0.25s ease, padding 0.25s ease", cursor: sidebarCollapsed ? "pointer" : "default" }}>
          {sidebarCollapsed ? (
            <>
              {/* Collapsed: mini thumbnails + reg */}
              <div style={{ textAlign: "center", padding: "10px 0 8px", marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 1 }}>JOBS</div>
                <div style={{ fontSize: 11, color: C.muted }}>{jobs.filter(j => !j.onHold && j.stage !== "closed").length}</div>
              </div>
              {(() => {
                let filtered = homeTab === "on_hold" ? jobs.filter(j => j.onHold) : homeTab === "closed" ? jobs.filter(j => j.stage === "closed") : jobs.filter(j => !j.onHold && j.stage !== "closed")
                return filtered.map(j => {
                  const stage = ALL_STAGES[j.stage] || ALL_STAGES.job_received
                  const thumb = (j.jobDocs || [])[0]?.dataUrl
                  const isSel = activeJobId === j.id
                  return (
                    <div key={j.id} onClick={e => { e.stopPropagation(); setHoverJobId(null); openJob(j); setSidebarExpanded(false) }} onMouseEnter={e => { setHoverJobId(j.id); setHoverY(e.clientY) }} onMouseLeave={() => setHoverJobId(null)} style={{ marginBottom: 6, cursor: "pointer", borderRadius: 12, overflow: "hidden", border: isSel ? `2px solid ${C.accent}` : `2px solid transparent`, background: isSel ? C.accent + "08" : C.card, transition: "all 0.2s" }}>
                      {thumb ? <img src={thumb} style={{ width: "100%", height: 52, objectFit: "cover", display: "block" }} alt="" /> : <div style={{ width: "100%", height: 52, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚗</div>}
                      <div style={{ padding: "4px 4px 5px", textAlign: "center" }}>
                        <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.jobInfo.vehicle_reg || "--"}</div>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: stage.color, margin: "3px auto 0" }} />
                      </div>
                    </div>
                  )
                })
              })()}
              <div onClick={e => { e.stopPropagation(); setSidebarExpanded(true) }} style={{ textAlign: "center", padding: "10px 0", cursor: "pointer" }}>
                <div style={{ fontSize: 18, color: C.accent }}>▸</div>
              </div>
            </>
          ) : (
            <>
              {/* Expanded: full job list */}
              {isDetailScreen && (
                <div onClick={() => setSidebarExpanded(false)} style={{ textAlign: "right", padding: "10px 4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>◂ Collapse</span>
                </div>
              )}
              {jobListPanel()}
            </>
          )}
        </div>
      )}

      {/* TABLET: Vehicle photo popup on hover (only in collapsed sidebar, not when job is selected) */}
      {isTablet && hoverJobId && hoverJobId !== activeJobId && sidebarCollapsed && (() => {
        const hj = jobs.find(j => j.id === hoverJobId)
        const photo = (hj?.jobDocs || [])[0]?.dataUrl
        return photo ? (
          <div style={{ position: "fixed", left: 90, top: Math.min(hoverY - 40, window.innerHeight - 240), zIndex: 200, background: C.card, borderRadius: 16, padding: 6, boxShadow: "0 12px 40px rgba(0,0,0,0.22)", border: `1px solid ${C.border}`, pointerEvents: "none" }}>
            <img src={photo} style={{ width: 240, height: 180, objectFit: "cover", borderRadius: 12 }} alt="" />
            <div style={{ padding: "6px 8px", fontSize: 14, fontWeight: 700, color: C.sub, textAlign: "center" }}>{hj.jobInfo.vehicle_reg} · {hj.jobInfo.vehicle_make}</div>
          </div>
        ) : null
      })()}

      {/* Main content */}
      <div style={{ flex: isTablet ? 1 : undefined, maxWidth: isTablet ? undefined : 480, margin: isTablet ? undefined : "0 auto", padding: isTablet ? "16px 28px" : "16px 20px", paddingBottom: 100, minHeight: "100vh", overflowY: isTablet ? "auto" : undefined, maxHeight: isTablet ? "100vh" : undefined }}>

        {/* Toast */}
        {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: C.text, color: "#fff", padding: "14px 28px", borderRadius: 16, fontWeight: 600, fontSize: 17, zIndex: 999, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>{toast}</div>}

        {/* Hidden file inputs */}
        <input ref={uploadRef} type="file" accept="image/*" style={{ display: "none" }} id="galleryInput" onChange={async e => { const f = e.target.files[0]; if (f) { const label = showUploadMenu === "approval" && selEst ? (selEst.type === "supplementary" ? selEst.label : "Estimate") : photoTag; const docId = "d" + Date.now(); tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/${docId}.jpg`); setJobDocs(p => [...p, { id: docId, dataUrl: url, estId: selEst?.id || null, label }]); tt(`📸 ${label} photo saved`); setShowUploadMenu(null); setPhotoTag("General") } catch { tt("❌ Upload failed") } } e.target.value = "" }} />
        <input id="camInput" type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={async e => { const f = e.target.files[0]; if (f) { const label = showUploadMenu === "approval" && selEst ? (selEst.type === "supplementary" ? selEst.label : "Estimate") : photoTag; const docId = "d" + Date.now(); tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/${docId}.jpg`); setJobDocs(p => [...p, { id: docId, dataUrl: url, estId: selEst?.id || null, label }]); tt(`📸 ${label} photo saved`); setShowUploadMenu(null); setPhotoTag("General") } catch { tt("❌ Upload failed") } } e.target.value = "" }} />

        {/* Image full screen viewer */}
        {showImage && (() => {
          const d = jobDocs.find(x => x.id === showImage)
          return d ? (
            <div onClick={() => setShowImage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
              {d.label && <div style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>{d.label}</div>}
              <img src={d.dataUrl} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 16 }} alt="" />
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button onClick={(e) => { e.stopPropagation(); setShowImage(null) }} style={{ ...btnSm("#fff", C.text), width: "auto", padding: "14px 40px" }}>Close</button>
                <button onClick={async (e) => {
                  e.stopPropagation()
                  if (!confirm("Delete this photo?")) return
                  try {
                    await deletePhoto(d.dataUrl)
                    setJobDocs(prev => prev.filter(x => x.id !== d.id))
                    setShowImage(null)
                    tt("🗑️ Photo deleted")
                  } catch (err) {
                    console.error("Delete failed:", err)
                    tt("❌ Failed to delete photo")
                  }
                }} style={{ ...btnSm("#ff3b30", "#fff"), width: "auto", padding: "14px 40px" }}>🗑️ Delete</button>
              </div>
            </div>
          ) : null
        })()}

        {/* Upload sheet */}
        {showUploadMenu && (
          <Sheet onClose={() => { setShowUploadMenu(null); setPhotoTag("General") }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>{showUploadMenu === "approval" ? "Upload Approved Copy" : "Add Photo"}</div>
            {showUploadMenu !== "approval" && (
              <>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, textAlign: "center" }}>Tag this photo</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
                  {["Vehicle", "Before", "After", ...estimates.flatMap(e => (e.parts || []).map(p => p.name)).filter((v, i, a) => a.indexOf(v) === i), "General"].map(tag => {
                    const tagColor = tag === "Vehicle" ? C.accent : tag === "Before" ? C.orange : tag === "After" ? C.green : C.sub
                    return <div key={tag} onClick={() => setPhotoTag(tag)} style={{ padding: "6px 14px", borderRadius: 20, background: photoTag === tag ? tagColor + "18" : C.bg, border: `2px solid ${photoTag === tag ? tagColor : C.border}`, color: photoTag === tag ? tagColor : C.muted, fontSize: 14, fontWeight: photoTag === tag ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>{tag}</div>
                  })}
                </div>
              </>
            )}
            <button onClick={() => document.getElementById("camInput").click()} style={{ ...btn(C.bg, C.text), marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 16 }}>
              <span style={{ fontSize: 26 }}>📷</span> Take Photo
            </button>
            <button onClick={() => document.getElementById("galleryInput").click()} style={{ ...btn(C.bg, C.text), marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 16 }}>
              <span style={{ fontSize: 26 }}>🖼️</span> Choose from Gallery
            </button>
            <button onClick={() => { setShowUploadMenu(null); setPhotoTag("General") }} style={{ ...btn("transparent", C.sub) }}>Cancel</button>
          </Sheet>
        )}

        {/* Sub-flow pause/continue prompt */}
        {showSubFlowPrompt && (
          <Sheet onClose={() => setShowSubFlowPrompt(false)}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Supplementary Added</div>
            <div style={{ fontSize: 16, color: C.sub, textAlign: "center", marginBottom: 20 }}>Should the main job pause while this supplementary is processed?</div>
            <button onClick={() => { setJobPaused(true); setShowSubFlowPrompt(false); tt("⏸ Main job paused") }} style={{ ...btn(C.orange, "#fff"), marginBottom: 10 }}>⏸ Pause Main Job</button>
            <button onClick={() => { setJobPaused(false); setShowSubFlowPrompt(false); tt("▶ Continuing alongside") }} style={{ ...btn(C.green, "#fff"), marginBottom: 10 }}>▶ Continue Alongside</button>
          </Sheet>
        )}

        {/* Parts Quotation / PO Editor overlay */}
        {showPQScreen && (
          <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 999, overflowY: "auto", padding: "0 20px 40px" }}>
            <NavBar title={isInsurance ? "Parts Quotation" : "Purchase Order"} subtitle={`${jobInfo.vehicle_reg} · ${partsQuotation.length} parts`} onBack={() => setShowPQScreen(false)} right={<div style={{ display: "flex", gap: 6 }}>
              {isInsurance && <button onClick={generatePQPDF} style={{ ...btnSm(C.purple, "#fff"), padding: "8px 12px" }}>📄</button>}
              <button onClick={() => sharePQ("whatsapp")} style={{ ...btnSm(C.green, "#fff"), padding: "8px 12px" }}>📱</button>
              <button onClick={() => sharePQ("copy")} style={{ ...btnSm(C.bg, C.sub), padding: "8px 12px" }}>📋</button>
            </div>} />

            {isInsurance && <>
              {/* Quote / Approve / Costs tabs */}
              <div style={{ display: "flex", gap: 0, marginBottom: 14, background: C.card, borderRadius: 14, padding: 4 }}>
                <div onClick={() => setPqTab("quote")} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: pqTab === "quote" ? C.purple + "12" : "transparent", color: pqTab === "quote" ? C.purple : C.muted, fontSize: 14, fontWeight: 600 }}>📝 Quote</div>
                <div onClick={() => setPqTab("approve")} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: pqTab === "approve" ? C.green + "12" : "transparent", color: pqTab === "approve" ? C.green : C.muted, fontSize: 14, fontWeight: 600 }}>✓ Approve</div>
                <div onClick={() => setPqTab("cost")} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: pqTab === "cost" ? C.accent + "12" : "transparent", color: pqTab === "cost" ? C.accent : C.muted, fontSize: 14, fontWeight: 600 }}>💰 Costs</div>
              </div>

              {/* QUOTE TAB */}
              {pqTab === "quote" && <>
                <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Fill supplier name &amp; quoted price for each part, then send to insurance for price approval.</div>
                {partsQuotation.map((p, idx) => (
                  <div key={p.id} style={{ ...card, padding: "14px 16px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 600 }}>{idx + 1}. {p.partName}</span>
                      <span style={{ fontSize: 13, color: C.muted, background: C.bg, padding: "3px 8px", borderRadius: 6 }}>{p.remarks}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Supplier</div>
                        <input value={p.supplier} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, supplier: e.target.value } : x))} placeholder="Toyota Lanka" style={{ ...inp, fontSize: 16 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Quoted Price</div>
                        <input type="number" value={p.quotedPrice === null ? "" : p.quotedPrice} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, quotedPrice: e.target.value === "" ? null : Number(e.target.value) } : x))} placeholder="0" style={{ ...inp, fontSize: 20, fontFamily: MONO, fontWeight: 700, textAlign: "right" }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ ...card, background: C.purple + "08", textAlign: "center", marginTop: 4 }}>
                  <div style={{ fontSize: 14, color: C.sub }}>Quoted Total</div>
                  <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.purple }}>Rs.{pqTotalPrice.toLocaleString()}</div>
                  <div style={{ fontSize: 13, color: pqAllFilled ? C.green : C.orange, marginTop: 4, fontWeight: 600 }}>{pqAllFilled ? "✓ All parts priced" : `${pqTotal - pqFilled} parts need pricing`}</div>
                </div>
                {pqAllFilled && pqStatus === "draft" && <button onClick={() => { setPqStatus("submitted"); tt("📤 Submitted to insurance"); setPqTab("approve") }} style={{ ...btn(C.purple, "#fff"), marginTop: 12 }}>📤 Mark as Submitted to Insurance</button>}
                {pqStatus !== "draft" && <div style={{ textAlign: "center", marginTop: 10, fontSize: 14, color: C.green, fontWeight: 600 }}>✓ Submitted to insurance</div>}
              </>}

              {/* APPROVE TAB */}
              {pqTab === "approve" && <>
                <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Record insurance-approved prices and attach approval photo.</div>
                <div style={{ ...card, textAlign: "center", padding: "12px 16px", border: `2px solid ${pqStatus === "approved" ? C.green : C.orange}30`, marginBottom: 12 }}>
                  <span style={pill(pqStatus === "approved" ? C.green : pqStatus === "submitted" ? C.orange : C.muted)}>{pqStatus === "approved" ? "✓ Approved" : pqStatus === "submitted" ? "⏳ Awaiting Approval" : "Draft"}</span>
                </div>
                <div style={{ display: "flex", gap: 0, marginBottom: 14, background: C.card, borderRadius: 14, padding: 4 }}>
                  <div onClick={() => setPqLumpMode(false)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: !pqLumpMode ? C.accent + "12" : "transparent", color: !pqLumpMode ? C.accent : C.muted, fontSize: 14, fontWeight: 600 }}>Per Part</div>
                  <div onClick={() => setPqLumpMode(true)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: pqLumpMode ? C.accent + "12" : "transparent", color: pqLumpMode ? C.accent : C.muted, fontSize: 14, fontWeight: 600 }}>Lump Sum</div>
                </div>
                {!pqLumpMode ? <>
                  {partsQuotation.map((p, idx) => (
                    <div key={p.id} style={{ ...card, padding: "12px 16px", marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 500 }}>{idx + 1}. {p.partName}</span>
                        <span style={{ fontFamily: MONO, fontSize: 14, color: C.muted }}>Quoted: {p.quotedPrice?.toLocaleString() || "--"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, color: C.sub, width: 70 }}>Approved</span>
                        <input type="number" value={p.approvedPrice === null ? "" : p.approvedPrice} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, approvedPrice: e.target.value === "" ? null : Number(e.target.value) } : x))} placeholder={p.quotedPrice?.toString() || "0"} style={{ flex: 1, ...inp, fontSize: 20, fontFamily: MONO, fontWeight: 700, textAlign: "right", border: `2px solid ${p.approvedPrice !== null ? (p.approvedPrice < (p.quotedPrice || 0) ? C.red + "40" : C.green + "40") : C.border}` }} />
                      </div>
                      {p.approvedPrice !== null && p.approvedPrice < (p.quotedPrice || 0) && <div style={{ fontSize: 13, color: C.red, marginTop: 4 }}>Cut Rs.{((p.quotedPrice || 0) - p.approvedPrice).toLocaleString()}</div>}
                    </div>
                  ))}
                  <div style={{ ...card, textAlign: "center", background: C.green + "06" }}>
                    <div style={{ fontSize: 14, color: C.sub }}>Approved Total</div>
                    <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.green }}>Rs.{pqApprovedTotal.toLocaleString()}</div>
                  </div>
                </> : <>
                  <div style={{ ...card, padding: "16px" }}>
                    <div style={{ fontSize: 14, color: C.sub, marginBottom: 8 }}>Insurance approved lump sum for all parts:</div>
                    <input type="number" value={pqLumpSum === null ? "" : pqLumpSum} onChange={e => setPqLumpSum(e.target.value === "" ? null : Number(e.target.value))} placeholder="Total approved amount" style={{ ...inp, fontSize: 28, fontFamily: MONO, fontWeight: 700, textAlign: "center" }} />
                    {pqLumpSum > 0 && pqTotalPrice > 0 && pqLumpSum < pqTotalPrice && <div style={{ fontSize: 14, color: C.red, marginTop: 8, textAlign: "center" }}>Cut Rs.{(pqTotalPrice - pqLumpSum).toLocaleString()} ({Math.round(((pqTotalPrice - pqLumpSum) / pqTotalPrice) * 100)}%)</div>}
                  </div>
                </>}
                <div style={{ ...card, padding: "14px 16px", marginTop: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, marginBottom: 8 }}>📷 Approval Photo</div>
                  {pqApprovalPhoto ? (
                    <div style={{ position: "relative" }}>
                      <img src={pqApprovalPhoto} style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} alt="Approval" />
                      <span onClick={() => setPqApprovalPhoto(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 20, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>×</span>
                    </div>
                  ) : (
                    <div onClick={() => pqPhotoRef.current?.click()} style={{ padding: "24px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.muted }}>
                      <div style={{ fontSize: 32, marginBottom: 4 }}>📷</div>
                      <div style={{ fontSize: 15 }}>Tap to attach approval photo</div>
                    </div>
                  )}
                  <input ref={pqPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={async e => { const f = e.target.files?.[0]; if (f) { tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/pq-approval-${Date.now()}.jpg`); setPqApprovalPhoto(url); tt("📷 Approval photo saved") } catch { tt("❌ Upload failed") } } }} />
                </div>
                {pqStatus !== "approved" && (
                  <button onClick={() => {
                    if (!pqHasApproval) { tt("⚠️ Enter approved prices first"); return }
                    if (!pqApprovalPhoto) { tt("⚠️ Attach approval photo first"); return }
                    setPqStatus("approved"); tt("✓ Parts prices approved")
                  }} style={{ ...btn(C.green, "#fff"), marginTop: 12 }}>✓ Confirm Prices Approved</button>
                )}
                {pqStatus === "approved" && (
                  <div style={{ ...card, textAlign: "center", background: C.green + "06", marginTop: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: C.green }}>✓ Parts Prices Approved</span>
                    <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>Rs.{pqApprovedTotal.toLocaleString()} approved · Photo attached</div>
                  </div>
                )}
              </>}

              {/* COST TAB */}
              {pqTab === "cost" && <>
                {pqStatus !== "approved" ? (
                  <div style={{ ...card, textAlign: "center", padding: "30px 16px" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.sub }}>Prices not yet approved</div>
                    <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Complete the Approve tab first</div>
                  </div>
                ) : <>
                  <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Enter actual cost per part. Supplier invoice is at approved price — your margin is the difference.</div>
                  {partsQuotation.map((p, idx) => {
                    const margin = (p.approvedPrice || 0) - (p.actualCost || 0)
                    const hasMargin = p.actualCost > 0 && p.approvedPrice > 0
                    return (
                      <div key={p.id} style={{ ...card, padding: "14px 16px", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 600 }}>{idx + 1}. {p.partName}</span>
                          <span style={{ fontFamily: MONO, fontSize: 14, color: C.green, fontWeight: 600 }}>Appr: {p.approvedPrice?.toLocaleString() || "--"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 0, marginBottom: 8, background: C.bg, borderRadius: 10, padding: 3 }}>
                          <div onClick={() => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, suppliedBy: "supplier" } : x))} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, cursor: "pointer", background: p.suppliedBy === "supplier" ? C.accent + "15" : "transparent", color: p.suppliedBy === "supplier" ? C.accent : C.muted, fontSize: 13, fontWeight: 600 }}>🏭 Supplier</div>
                          <div onClick={() => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, suppliedBy: "insurance", actualCost: 0 } : x))} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, cursor: "pointer", background: p.suppliedBy === "insurance" ? C.orange + "15" : "transparent", color: p.suppliedBy === "insurance" ? C.orange : C.muted, fontSize: 13, fontWeight: 600 }}>🛡️ Insurance Supplied</div>
                        </div>
                        {p.suppliedBy === "supplier" && (
                          <div>
                            <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Actual Cost (what you paid)</div>
                            <input type="number" value={p.actualCost || ""} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, actualCost: e.target.value === "" ? 0 : Number(e.target.value) } : x))} placeholder="0" style={{ ...inp, fontSize: 20, fontFamily: MONO, fontWeight: 700, textAlign: "right" }} />
                            {hasMargin && (
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "6px 10px", background: margin > 0 ? C.green + "08" : C.red + "08", borderRadius: 8 }}>
                                <span style={{ fontSize: 14, color: margin > 0 ? C.green : C.red, fontWeight: 600 }}>Margin</span>
                                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: margin > 0 ? C.green : C.red }}>Rs.{margin.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {p.suppliedBy === "insurance" && <div style={{ padding: "8px 12px", background: C.orange + "08", borderRadius: 8, fontSize: 14, color: C.orange, fontWeight: 500 }}>Insurance supplied this part directly -- no cost to workshop</div>}
                      </div>
                    )
                  })}
                  {(() => {
                    const supplierParts = partsQuotation.filter(p => p.suppliedBy === "supplier" && p.actualCost > 0)
                    const insParts = partsQuotation.filter(p => p.suppliedBy === "insurance")
                    const totalApproved = supplierParts.reduce((s, p) => s + (p.approvedPrice || 0), 0)
                    const totalActual = supplierParts.reduce((s, p) => s + (p.actualCost || 0), 0)
                    const totalMargin = totalApproved - totalActual
                    const allFilled = partsQuotation.every(p => p.suppliedBy)
                    return <>
                      {supplierParts.length > 0 && (
                        <div style={{ ...card, background: totalMargin > 0 ? C.green + "06" : C.red + "06", textAlign: "center" }}>
                          <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>Parts Margin Summary</div>
                          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 6 }}>
                            <div><div style={{ fontSize: 11, color: C.muted }}>Approved</div><div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>Rs.{totalApproved.toLocaleString()}</div></div>
                            <div><div style={{ fontSize: 11, color: C.muted }}>Actual</div><div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>Rs.{totalActual.toLocaleString()}</div></div>
                            <div><div style={{ fontSize: 11, color: C.muted }}>Margin</div><div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: totalMargin > 0 ? C.green : C.red }}>Rs.{totalMargin.toLocaleString()}</div></div>
                          </div>
                          {insParts.length > 0 && <div style={{ fontSize: 13, color: C.orange }}>+ {insParts.length} part{insParts.length > 1 ? "s" : ""} supplied by insurance</div>}
                        </div>
                      )}
                      {!allFilled && <div style={{ fontSize: 13, color: C.orange, textAlign: "center", marginTop: 8 }}>⚠️ Select supplier/insurance for all parts</div>}
                    </>
                  })()}
                  <div style={{ ...card, padding: "14px 16px", marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.sub }}>📄 Supplier Invoices</span>
                      <span style={{ fontSize: 13, color: C.muted }}>{supplierInvoices.length} attached</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Invoices at insurance-approved prices to submit to insurance</div>
                    {supplierInvoices.map((inv, idx) => (
                      <div key={inv.id} style={{ background: C.bg, borderRadius: 12, padding: 10, marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{inv.supplierName || `Invoice ${idx + 1}`}</span>
                          <span onClick={() => setSupplierInvoices(prev => prev.filter(x => x.id !== inv.id))} style={{ fontSize: 13, color: C.red, cursor: "pointer", fontWeight: 600 }}>Remove</span>
                        </div>
                        {inv.photo && <img src={inv.photo} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 10, marginBottom: 6 }} alt="" />}
                      </div>
                    ))}
                    {showSupplierInvForm ? (
                      <div style={{ background: C.bg, borderRadius: 12, padding: 12, border: `2px dashed ${C.accent}40` }}>
                        <input id="suppInvName" placeholder="Supplier name" style={{ ...inp, fontSize: 16, marginBottom: 8 }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <div onClick={() => { const inp2 = document.createElement("input"); inp2.type = "file"; inp2.accept = "image/*"; inp2.capture = "environment"; inp2.onchange = async e => { const f = e.target.files?.[0]; if (f) { const name = document.getElementById("suppInvName")?.value || "Supplier"; const sid = "si" + Date.now(); tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/supp-inv-${sid}.jpg`); setSupplierInvoices(prev => [...prev, { id: sid, supplierName: name, photo: url }]); setShowSupplierInvForm(false); tt("📄 Invoice attached") } catch { tt("❌ Upload failed") } } }; inp2.click() }} style={{ flex: 1, padding: "20px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.muted }}>
                            <div style={{ fontSize: 24, marginBottom: 2 }}>📷</div>
                            <div style={{ fontSize: 13 }}>Camera</div>
                          </div>
                          <div onClick={() => { const inp2 = document.createElement("input"); inp2.type = "file"; inp2.accept = "image/*"; inp2.onchange = async e => { const f = e.target.files?.[0]; if (f) { const name = document.getElementById("suppInvName")?.value || "Supplier"; const sid = "si" + Date.now(); tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/supp-inv-${sid}.jpg`); setSupplierInvoices(prev => [...prev, { id: sid, supplierName: name, photo: url }]); setShowSupplierInvForm(false); tt("📄 Invoice attached") } catch { tt("❌ Upload failed") } } }; inp2.click() }} style={{ flex: 1, padding: "20px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.muted }}>
                            <div style={{ fontSize: 24, marginBottom: 2 }}>🖼️</div>
                            <div style={{ fontSize: 13 }}>Gallery</div>
                          </div>
                        </div>
                        <div onClick={() => setShowSupplierInvForm(false)} style={{ textAlign: "center", fontSize: 14, color: C.muted, marginTop: 8, cursor: "pointer" }}>Cancel</div>
                      </div>
                    ) : (
                      <button onClick={() => setShowSupplierInvForm(true)} style={{ ...btn(C.bg, C.accent), border: `1px solid ${C.accent}30`, fontSize: 15 }}>+ Add Supplier Invoice</button>
                    )}
                  </div>
                </>}
              </>}
            </>}

            {isDirectJob && <>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Purchase order for your purchasing office. Share via WhatsApp.</div>
              {partsQuotation.map((p, idx) => (
                <div key={p.id} style={{ ...card, padding: "12px 16px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 17, fontWeight: 500 }}>{idx + 1}. {p.partName}</span>
                    <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>({p.remarks})</span>
                  </div>
                </div>
              ))}
              {!customerConfirmed && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 14, color: C.orange, marginBottom: 8, fontWeight: 500 }}>⚠️ Customer hasn't confirmed — PO not sent</div>
                  <button onClick={() => { confirmCustomer(); setShowPQScreen(false) }} style={{ ...btn(C.accent, "#fff") }}>✓ Customer Confirmed</button>
                </div>
              )}
              {customerConfirmed && <div style={{ fontSize: 14, color: C.green, fontWeight: 600, textAlign: "center", marginTop: 14 }}>✓ Customer confirmed -- share PO with purchasing</div>}
            </>}

            <button onClick={() => setShowPQScreen(false)} style={{ ...btn(C.bg, C.sub), marginTop: 16 }}>Done</button>
          </div>
        )}

        {/* Floating doc ref button */}
        {jobDocs.length > 0 && (screen === "approve_entry" || screen === "inv_detail") && (() => {
          const relevantDocs = screen === "approve_entry" && selEst ? jobDocs.filter(d => d.estId === selEst.id) : jobDocs
          const lastDoc = relevantDocs[relevantDocs.length - 1]
          return lastDoc ? <div onClick={() => setShowImage(lastDoc.id)} style={{ position: "fixed", bottom: 80, right: 20, width: 58, height: 58, borderRadius: 29, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 60, boxShadow: "0 6px 20px rgba(0,122,255,0.4)", fontSize: 24 }}>📋</div> : null
        })()}

        {/* User Management (super admin only) */}
        {showUserMgmt && <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 2000, overflowY: "auto" }}><UserManagement onBack={() => setShowUserMgmt(false)} /></div>}

        {/* Screen router */}
        {screen === "home" && (isTablet ? (homeTab === "closed" && selectedClosedJob ? <ClosedJobDetail job={selectedClosedJob} openJob={openJob} /> : rightPanelHub()) : jobListPanel())}
        {screen === "new_job" && <NewJobScreen />}
        {screen === "job" && <JobScreen />}
        {screen === "est_parts" && <EstimateParts />}
        {screen === "est_cat" && <EstimateCat />}
        {screen === "est_review" && <EstimateReview />}
        {screen === "approve" && <ApprovalUpload />}
        {screen === "approve_entry" && <ApprovalEntry />}
        {screen === "approve_summary" && <ApprovalSummary />}
        {screen === "inv_detail" && <InvoiceDetail />}

        <style>{`input[type=number]::-webkit-inner-spin-button{opacity:1}input[type=number]{-moz-appearance:textfield}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.3}}.pulse-anim{animation:pulse-dot 1.2s infinite}`}</style>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <WorkshopProvider>
      <AppInner />
    </WorkshopProvider>
  )
}
