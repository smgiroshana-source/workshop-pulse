"use client"
import { useState } from "react"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, btnSm, card, pill, Sheet, NavBar, ALL_STAGES, VEHICLE_MAKES, INSURANCE_COMPANIES, INV_STATUS, fmt } from "../WorkshopContext"
import { uploadPhoto } from "../supabase"

export default function JobScreen() {
  const {
    screen, setScreen,
    jobInfo, setJobInfo,
    jobStage, jobPaused, setJobPaused,
    partsOrdered, setPartsOrdered,
    partsArrived, setPartsArrived,
    showPaintWarn, setShowPaintWarn,
    setJobs,
    setJobStage,
    setActiveJobId,
    setHomeTab,
    makeSuggestions, setMakeSuggestions,
    showInsDropdown, setShowInsDropdown,
    estimates, setEstimates,
    selEst, setSelEst,
    setEstParts, setEstEntries, setSundryItems, setSundryInput,
    setActiveCat,
    jobDocs, setJobDocs,
    qcChecks, toggleQc,
    jobCosts, setJobCosts,
    followUpNote, setFollowUpNote,
    followUpAttempts, setFollowUpAttempts,
    followUpLog, setFollowUpLog,
    showImage, setShowImage,
    showUploadMenu, setShowUploadMenu,
    photoTag, setPhotoTag,
    uploadRef,
    invoices, setInvoices,
    selInv, setSelInv,
    showSubFlowPrompt, setShowSubFlowPrompt,
    showArchived, setShowArchived,
    partsQuotation, setPartsQuotation,
    pqStatus, setPqStatus,
    pqApprovalPhoto, setPqApprovalPhoto,
    pqLumpSum, setPqLumpSum,
    pqLumpMode, setPqLumpMode,
    pqTab, setPqTab,
    pqPhotoRef,
    showPQScreen, setShowPQScreen,
    customerConfirmed, setCustomerConfirmed,
    confirmDelEst, setConfirmDelEst,
    confirmDelJob, setConfirmDelJob,
    isTablet,
    collapsedSections, toggleSection,
    isUploading,
    activeJobId, activeJob,
    isInsurance, isDirectJob, workType, jobCats,
    pipeline, isMinorJob,
    stageIdx, stageInfo, nextStage, prevStage,
    hasReplaceParts, arrivedCount, allPartsArrived, pendingParts,
    replaceParts,
    pqFilled, pqTotal, pqAllFilled, pqTotalPrice, pqApprovedTotal, pqAllApproved, pqHasApproval,
    supplierInvoices, setSupplierInvoices,
    showSupplierInvForm, setShowSupplierInvForm,
    goHome, saveCurrentJob,
    advanceStage, goBackStage, getNextActionLabel, canAdvance,
    toggleHold, deleteJob, deleteEstimate,
    confirmCustomer, sharePQ,
    generateEstimatePDF, generateInvoicePDF, generatePQPDF,
    generateInvoice, generateMinorInvoice,
    startApproval,
    invTotal, invNet, invInsPayments, invCustPayments, invInsTotal, invCustPaidTotal,
    invCustDiscount, invCustPortion, invCustOwes, invCustBalance, invTotalDiscount, invFullyPaid,
    INV_STATUS: invStatusConst,
    tt,
  } = useWorkshop()

  // Collapsible section helper
  const defaultOpen = {
    job_received: ["vehicle", "photos"],
    est_pending: ["vehicle", "photos", "estimates"],
    est_ready: ["vehicle", "photos", "estimates"],
    approved_dismantle: ["parts_tracker", "parts_quotation", "photos"],
    in_progress: ["parts_tracker", "parts_quotation", "photos"],
    paint_stage: ["parts_tracker", "photos"],
    qc: ["photos", "estimates", "invoices"],
    ready: ["invoices", "photos"],
    delivered: ["invoices"],
    follow_up: [],
    closed: [],
  }
  const isSectionOpen = (key) => {
    if (collapsedSections[key] !== undefined) return !collapsedSections[key]
    return (defaultOpen[jobStage] || []).includes(key)
  }
  // Vehicle & Customer edit mode
  const [editingDetails, setEditingDetails] = useState(false)
  const [detailsBackup, setDetailsBackup] = useState(null)

  const startEditDetails = () => {
    setDetailsBackup({ ...jobInfo })
    setEditingDetails(true)
  }
  const cancelEditDetails = () => {
    if (detailsBackup) setJobInfo(detailsBackup)
    setDetailsBackup(null)
    setEditingDetails(false)
    setMakeSuggestions([])
    setShowInsDropdown(false)
  }
  const saveEditDetails = () => {
    setDetailsBackup(null)
    setEditingDetails(false)
    setMakeSuggestions([])
    setShowInsDropdown(false)
    tt("✓ Details saved")
  }

  const SectionHead = ({ title, icon, sectionKey, badge }) => {
    const open = isSectionOpen(sectionKey)
    return <div onClick={() => toggleSection(sectionKey)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "4px 0", marginBottom: open ? 14 : 0, marginTop: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>{icon} {title}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {badge}
        <span style={{ fontSize: 18, color: C.muted, transition: "transform 0.2s", transform: open ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block" }}>▾</span>
      </div>
    </div>
  }

  return (
    <>
      <div style={{ paddingTop: 8, marginBottom: 14 }}>
        <div onClick={goHome} style={{ fontSize: 17, color: C.accent, cursor: "pointer", fontWeight: 400, marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 22 }}>‹</span> Jobs</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: "-0.7px" }}>{jobInfo.vehicle_reg || "New Job"}</div>
            <div style={{ fontSize: 14, color: C.sub }}>{activeJob?.jobNumber}</div>
          </div>
          {isInsurance && <span style={pill(C.accent)}>🛡️ {jobInfo.insurance_name}</span>}
          {isDirectJob && !isMinorJob && <span style={pill(C.green)}>💰 Direct</span>}
          {isMinorJob && <span style={pill(C.orange)}>⚡ Quick Job</span>}
          {workType === "paint" && <span style={pill(C.orange)}>🎨 Paint</span>}
          {workType === "mechanical" && <span style={pill(C.accent)}>🔧 Mech</span>}
          {workType === "both" && <span style={pill(C.purple)}>🎨+🔧</span>}
          {activeJob?.onHold && <span style={pill(C.orange)}>📌 On Hold</span>}
          {activeJob?.onHold && activeJob?.holdUntil && (() => {
            const ms = new Date(activeJob.holdUntil) - new Date()
            const hours = Math.ceil(ms / (1000 * 60 * 60))
            const days = Math.ceil(ms / (1000 * 60 * 60 * 24))
            if (ms <= 0) return <span style={pill(C.red)}>🔔 Due!</span>
            if (activeJob.stage === "follow_up") return <span style={pill(C.orange)}>📵 {hours}h</span>
            return <span style={pill(C.orange)}>⏰ {days}d</span>
          })()}
        </div>
      </div>

      {/* ═══ STAGE PIPELINE ═══ */}
      {!isMinorJob && <div style={{ ...card, padding: "12px 10px", marginBottom: 12 }}>
        {jobPaused && <div style={{ background: C.orange + "15", border: `1px solid ${C.orange}40`, borderRadius: 12, padding: "10px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.orange }}>⏸ Main job paused</span>
          <span onClick={() => { setJobPaused(false); tt("▶ Resumed") }} style={{ fontSize: 14, fontWeight: 600, color: C.accent, cursor: "pointer" }}>▶ Resume</span>
        </div>}
        <div style={{ display: "flex", gap: 4, flexWrap: isTablet ? "nowrap" : "wrap", overflowX: isTablet ? "auto" : "visible", paddingBottom: 4 }}>
          {pipeline.map((key, i) => { const s = ALL_STAGES[key]; const active = key === jobStage; const past = i < stageIdx; return <div key={key} style={{ flex: "0 0 auto", textAlign: "center", padding: "8px 10px", borderRadius: 12, background: active ? s.color + "15" : past ? C.green + "06" : "transparent", border: active ? `3px solid ${s.color}` : "1px solid transparent", boxShadow: active ? `0 2px 8px ${s.color}30` : "none", minWidth: 64, opacity: past ? 0.7 : 1 }}>
            <div style={{ fontSize: 20 }}>{past ? "✓" : s.icon}</div>
            <div style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? s.color : past ? C.green : C.muted, marginTop: 2, whiteSpace: "nowrap" }}>{s.label}</div>
          </div> })}
        </div>
        {/* Next action */}
        {canAdvance() && <button onClick={() => {
          if (jobStage === "qc" && !qcChecks["qc_passed"]) { tt("⚠️ Tick QC Checked first"); return }
          if (jobStage === "qc") {
            // After photos required
            if (!jobDocs.some(d => d.label === "After")) { tt("⚠️ Add After photos before marking ready"); return }
            // PQ approval check (insurance with replace parts)
            const hasReplace = estimates.flatMap(e => e.approved_entries || e.entries || []).some(e => e.category === "replace")
            if (isInsurance && hasReplace && pqStatus !== "approved") { tt("⚠️ Parts Quotation not yet approved by insurance"); return }
            // Workshop invoice check
            if (invoices.length === 0) { tt("⚠️ Create a workshop invoice first"); return }
            // Parts cost & supplier invoice check (insurance)
            if (isInsurance && hasReplace && partsQuotation.length > 0) {
              const unfilled = partsQuotation.filter(p => !p.suppliedBy)
              if (unfilled.length > 0) { tt(`⚠️ ${unfilled.length} part${unfilled.length > 1 ? "s" : ""} need supplier/insurance selection`); setPqTab("cost"); setShowPQScreen(true); return }
              const supplierParts = partsQuotation.filter(p => p.suppliedBy === "supplier")
              if (supplierParts.length > 0 && supplierInvoices.length === 0) { tt("⚠️ Attach supplier invoice photo"); setPqTab("cost"); setShowPQScreen(true); return }
            }
          }
          if (nextStage && jobStage === "paint_stage" && pendingParts.length > 0 && !showPaintWarn) { setShowPaintWarn(true); return }
          if (nextStage) { advanceStage(nextStage); setShowPaintWarn(false) }
        }} style={{ ...btn(stageInfo.color, "#fff"), marginTop: 10, padding: "14px 20px", fontSize: 16 }}>{showPaintWarn ? "⚠️ Continue Anyway" : getNextActionLabel()}</button>}
        {showPaintWarn && <div style={{ background: C.orange + "12", border: `1px solid ${C.orange}40`, borderRadius: 12, padding: "10px 14px", marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.orange, marginBottom: 4 }}>⚠️ {pendingParts.length} part{pendingParts.length > 1 ? "s" : ""} not yet arrived:</div>
          {pendingParts.map(p => <div key={p.id} style={{ fontSize: 13, color: C.sub, marginLeft: 8 }}>• {p.partName}</div>)}
          <div onClick={() => setShowPaintWarn(false)} style={{ fontSize: 13, color: C.muted, marginTop: 6, cursor: "pointer" }}>Cancel</div>
        </div>}
        {prevStage && jobStage !== "job_received" && <div onClick={goBackStage} style={{ fontSize: 14, color: C.muted, textAlign: "center", marginTop: 8, cursor: "pointer" }}>Undo: back to {ALL_STAGES[prevStage].label}</div>}
        {jobPaused && <div style={{ fontSize: 14, color: C.orange, textAlign: "center", marginTop: 8, fontWeight: 500 }}>Resume to advance stages</div>}
      </div>}

      {/* ═══ QC CHECK ═══ */}
      {jobStage === "qc" && <div style={{ ...card, padding: "14px 16px", border: `2px solid ${qcChecks["qc_passed"] ? C.green : C.orange}40` }}>
        <div onClick={() => toggleQc("qc_passed")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: qcChecks["qc_passed"] ? C.green + "08" : C.bg, borderRadius: 12, cursor: "pointer", border: `2px solid ${qcChecks["qc_passed"] ? C.green + "40" : C.border}`, transition: "all 0.15s" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, border: `3px solid ${qcChecks["qc_passed"] ? C.green : C.muted}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: qcChecks["qc_passed"] ? C.green : "transparent", transition: "all 0.15s" }}>
            {qcChecks["qc_passed"] && <span style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: qcChecks["qc_passed"] ? C.green : C.text }}>QC Checked</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Quality inspection completed</div>
          </div>
        </div>
        {qcChecks["qc_passed"] && <div style={{ background: C.green + "10", borderRadius: 10, padding: "8px 12px", marginTop: 10, textAlign: "center", fontSize: 15, color: C.green, fontWeight: 600 }}>✓ QC passed -- ready to advance</div>}
      </div>}

      {/* ═══ FOLLOW UP ═══ */}
      {(jobStage === "follow_up" || jobStage === "closed") && <div style={{ ...card, padding: "14px 16px", border: `2px solid ${jobStage === "follow_up" ? C.orange : C.green}40` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>📞 Follow Up</span>
          {jobStage === "closed" && <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>✓ Closed</span>}
        </div>

        {/* Attempt circles */}
        {jobStage === "follow_up" && <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
          {[1, 2, 3].map(n => <div key={n} style={{ width: 40, height: 40, borderRadius: 20, background: n <= followUpAttempts ? C.orange : n === followUpAttempts + 1 ? C.accent + "15" : C.bg, border: `2px solid ${n <= followUpAttempts ? C.orange : n === followUpAttempts + 1 ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: n <= followUpAttempts ? "#fff" : n === followUpAttempts + 1 ? C.accent : C.muted }}>{n <= followUpAttempts ? "✗" : n}</div>)}
        </div>}

        {/* Last attempt warning */}
        {jobStage === "follow_up" && followUpAttempts >= 2 && <div style={{ background: C.red + "10", border: `2px solid ${C.red}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 10, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>⚠️ Last attempt — job will auto-close if no answer</div>
        </div>}

        {jobStage === "follow_up" && <>
          <div style={{ fontSize: 14, color: C.sub, marginBottom: 10 }}>Call customer and record feedback before closing the job.</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <a href={`tel:${jobInfo.customer_phone}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", background: C.green + "10", borderRadius: 12, color: C.green, fontWeight: 600, fontSize: 15, textDecoration: "none", border: `1px solid ${C.green}30` }}>📞 Call {jobInfo.customer_name?.split(" ")[0] || "Customer"}</a>
            <a href={`https://wa.me/${(jobInfo.customer_phone || "").replace(/\D/g, "")}`} target="_blank" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", background: "#25d366" + "10", borderRadius: 12, color: "#25d366", fontWeight: 600, fontSize: 15, textDecoration: "none", border: "1px solid #25d36630" }}>💬 WhatsApp</a>
          </div>
        </>}

        {/* Attempt log */}
        {followUpLog.length > 0 && <div style={{ marginBottom: 10 }}>
          {followUpLog.map((entry, idx) => <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: idx < followUpLog.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap", marginTop: 1 }}>{new Date(entry.time).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {new Date(entry.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            <span style={{ fontSize: 13, color: entry.text.includes("No answer") ? C.orange : C.sub }}>{entry.text}</span>
          </div>)}
        </div>}

        <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Comment</div>
        <textarea value={followUpNote} onChange={e => setFollowUpNote(e.target.value)} readOnly={jobStage === "closed"} placeholder={jobStage === "follow_up" ? "e.g. Customer happy with work, no issues reported..." : "No comment recorded"} rows={3} style={{ ...inp, fontSize: 15, resize: "vertical", minHeight: 70, background: jobStage === "closed" ? C.bg : C.card, color: jobStage === "closed" ? C.sub : C.text }} />

        {jobStage === "follow_up" && <>
          <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
            {["No issues -- happy", "Minor concern noted", "Warranty callback needed"].map(q => <div key={q} onClick={() => setFollowUpNote(prev => prev ? prev + ". " + q : q)} style={{ padding: "6px 12px", borderRadius: 20, background: C.bg, border: `1px solid ${C.border}`, fontSize: 13, color: C.sub, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{q}</div>)}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {/* No Answer -- retry in 4h */}
            <button onClick={() => {
              const newAttempts = followUpAttempts + 1
              const now = new Date().toISOString()
              const logEntry = { text: `No answer -- attempt ${newAttempts}`, time: now }
              const newLog = [...followUpLog, logEntry]
              setFollowUpAttempts(newAttempts)
              setFollowUpLog(newLog)
              if (newAttempts >= 3) {
                // 3rd no-answer -> auto-close
                const closeNote = (followUpNote ? followUpNote + ". " : "") + "Auto-closed: 3 no-answer attempts"
                setFollowUpNote(closeNote)
                const closeLog = [...newLog, { text: "Auto-closed after 3 no-answer attempts", time: now }]
                saveCurrentJob() // save all local state (invoices, estimates, etc.) before navigating away
                setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: "closed", onHold: false, holdUntil: null, followUpNote: closeNote, followUpAttempts: newAttempts, followUpLog: closeLog } : j))
                setJobStage("closed")
                tt("🏁 3 no-answers -- job auto-closed")
                setActiveJobId(null); setScreen("home"); setHomeTab("closed")
              } else {
                // Hold for 4 hours
                const holdUntil = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
                saveCurrentJob() // save all local state before navigating away
                setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, onHold: true, holdUntil, followUpAttempts: newAttempts, followUpLog: newLog, followUpNote } : j))
                tt(`📵 No answer (${newAttempts}/3) -- retry in 4 hours`)
                setActiveJobId(null); setScreen("home"); setHomeTab("on_hold")
              }
            }} style={{ ...btn(C.orange + "15", C.orange), flex: 1, border: `1px solid ${C.orange}40`, fontSize: 15 }}>📵 No Answer {followUpAttempts > 0 ? `(${followUpAttempts}/3)` : ""}</button>

            {/* Close Job */}
            <button onClick={() => {
              if (!followUpNote.trim()) { tt("⚠️ Add a follow-up comment first"); return }
              const now = new Date().toISOString()
              const newLog = [...followUpLog, { text: followUpNote, time: now }]
              setFollowUpLog(newLog)
              saveCurrentJob() // save all local state (invoices, estimates, etc.) before navigating away
              setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: "closed", onHold: false, holdUntil: null, followUpNote, followUpAttempts, followUpLog: newLog } : j))
              setJobStage("closed")
              tt("🏁 Job closed")
              setActiveJobId(null); setScreen("home"); setHomeTab("closed")
            }} style={{ ...btn(C.green, "#fff"), flex: 1, fontSize: 15 }}>🏁 Close & Complete</button>
          </div>
        </>}
      </div>}

      {/* Vehicle & Customer */}
      <div style={card}>
        <SectionHead title="Vehicle & Customer" icon="🚗" sectionKey="vehicle" badge={
          !editingDetails
            ? <div onClick={(e) => { e.stopPropagation(); startEditDetails() }} style={{ fontSize: 13, fontWeight: 600, color: C.accent, cursor: "pointer", padding: "4px 12px", borderRadius: 8, background: C.accent + "08" }}>✏️ Edit</div>
            : null
        } />
        {isSectionOpen("vehicle") && <>
          {/* Read-only view */}
          {!editingDetails && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><div style={{ fontSize: 12, color: C.muted, marginBottom: 3, fontWeight: 500 }}>Vehicle Reg</div><div style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO, color: C.text }}>{jobInfo.vehicle_reg || "—"}</div></div>
            <div><div style={{ fontSize: 12, color: C.muted, marginBottom: 3, fontWeight: 500 }}>Customer</div><div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{jobInfo.customer_name || "—"}</div></div>
            <div><div style={{ fontSize: 12, color: C.muted, marginBottom: 3, fontWeight: 500 }}>Make</div><div style={{ fontSize: 16, color: C.text }}>{jobInfo.vehicle_make || "—"}</div></div>
            <div><div style={{ fontSize: 12, color: C.muted, marginBottom: 3, fontWeight: 500 }}>Model</div><div style={{ fontSize: 16, color: C.text }}>{jobInfo.vehicle_model || "—"}</div></div>
            <div><div style={{ fontSize: 12, color: C.muted, marginBottom: 3, fontWeight: 500 }}>Phone</div>
              {jobInfo.customer_phone
                ? <a href={`tel:${jobInfo.customer_phone}`} style={{ fontSize: 16, color: C.accent, textDecoration: "none", fontWeight: 500 }}>{jobInfo.customer_phone}</a>
                : <div style={{ fontSize: 16, color: C.text }}>—</div>}
            </div>
            <div><div style={{ fontSize: 12, color: C.muted, marginBottom: 3, fontWeight: 500 }}>Insurance</div><div style={{ fontSize: 16, color: jobInfo.insurance_name ? C.accent : C.muted, fontWeight: jobInfo.insurance_name ? 600 : 400 }}>{jobInfo.insurance_name || "No insurance"}</div></div>
          </div>}

          {/* Edit mode */}
          {editingDetails && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Vehicle Reg</div><input value={jobInfo.vehicle_reg} onChange={e => setJobInfo({ ...jobInfo, vehicle_reg: e.target.value })} placeholder="CBB-9636" style={{ ...inp, fontFamily: MONO, fontWeight: 700, fontSize: 20 }} /></div>
              <div><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Customer</div><input value={jobInfo.customer_name} onChange={e => setJobInfo({ ...jobInfo, customer_name: e.target.value })} placeholder="Mr. Kasun" style={inp} /></div>
              <div style={{ position: "relative" }}><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Make</div>
                <input value={jobInfo.vehicle_make} onChange={e => { setJobInfo({ ...jobInfo, vehicle_make: e.target.value }); const q = e.target.value.toLowerCase(); setMakeSuggestions(q.length >= 1 ? VEHICLE_MAKES.filter(m => m.toLowerCase().includes(q)) : []) }} onFocus={() => { if (!jobInfo.vehicle_make) setMakeSuggestions(VEHICLE_MAKES) }} onBlur={() => setTimeout(() => setMakeSuggestions([]), 200)} placeholder="Toyota" style={inp} />
                {makeSuggestions.length > 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, zIndex: 20, maxHeight: 200, overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", marginTop: 4 }}>
                  {makeSuggestions.map(m => <div key={m} onMouseDown={() => { setJobInfo(j => ({ ...j, vehicle_make: m })); setMakeSuggestions([]) }} style={{ padding: "14px 18px", fontSize: 17, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>{m}</div>)}
                </div>}
              </div>
              <div><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Model</div><input value={jobInfo.vehicle_model} onChange={e => setJobInfo({ ...jobInfo, vehicle_model: e.target.value })} placeholder="Aqua" style={inp} /></div>
              <div><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Phone</div><input value={jobInfo.customer_phone} onChange={e => setJobInfo({ ...jobInfo, customer_phone: e.target.value })} placeholder="077 331 3557" style={inp} /></div>
              <div style={{ position: "relative" }}><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Insurance</div>
                <div onClick={() => setShowInsDropdown(!showInsDropdown)} style={{ ...inp, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: jobInfo.insurance_name ? C.text : C.muted }}>{jobInfo.insurance_name || "No insurance (direct)"}</span>
                  <span style={{ color: C.muted, fontSize: 18 }}>›</span>
                </div>
                {showInsDropdown && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, zIndex: 20, maxHeight: 240, overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", marginTop: 4 }}>
                  <div onMouseDown={() => { setJobInfo(j => ({ ...j, insurance_name: "" })); setShowInsDropdown(false) }} style={{ padding: "14px 18px", fontSize: 17, cursor: "pointer", color: C.sub, borderBottom: `1px solid ${C.border}` }}>No insurance (direct)</div>
                  {INSURANCE_COMPANIES.map(c => <div key={c} onMouseDown={() => { setJobInfo(j => ({ ...j, insurance_name: c })); setShowInsDropdown(false) }} style={{ padding: "14px 18px", fontSize: 17, cursor: "pointer", borderBottom: `1px solid ${C.border}`, fontWeight: jobInfo.insurance_name === c ? 600 : 400, color: jobInfo.insurance_name === c ? C.accent : C.text }}>{c}</div>)}
                </div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={cancelEditDetails} style={{ ...btnSm(C.bg, C.sub), flex: 1, border: `1px solid ${C.border}` }}>Cancel</button>
              <button onClick={saveEditDetails} style={{ ...btnSm(C.green, "#fff"), flex: 1 }}>✓ Save</button>
            </div>
          </>}
        </>}
      </div>

      {/* Photos */}
      <div style={card}>
        <SectionHead title={`Photos (${jobDocs.length})`} icon="📷" sectionKey="photos" badge={<div onClick={(e) => { e.stopPropagation(); setShowUploadMenu("job") }} style={{ fontSize: 15, fontWeight: 500, color: C.accent, cursor: "pointer" }}>+ Add</div>} />
        {isSectionOpen("photos") && <>
        {isUploading && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.accent + "10", borderRadius: 10, marginBottom: 8, fontSize: 13, color: C.accent, fontWeight: 600 }}>⏳ Uploading...</div>}
        {jobDocs.length > 0 && <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, alignItems: "flex-end" }}>
          {jobDocs.map((d, i) => {
            const tagColor = d.label === "Vehicle" ? C.accent : d.label === "Before" ? C.orange : d.label === "After" ? C.green : C.sub
            return <div key={d.id} style={{ flexShrink: 0, position: "relative" }}>
            <img src={d.dataUrl} onClick={() => setShowImage(d.id)} style={{ width: i === 0 ? 180 : 90, height: i === 0 ? 136 : 68, objectFit: "cover", borderRadius: i === 0 ? 14 : 12, cursor: "pointer", border: i === 0 ? `2px solid ${C.accent}30` : `2px solid ${tagColor}25` }} alt="" />
            <div style={{ position: "absolute", bottom: 4, left: 4, right: 4, background: tagColor + "dd", color: "#fff", fontSize: i === 0 ? 11 : 10, fontWeight: 600, borderRadius: 6, padding: "2px 6px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label || "General"}</div>
          </div>})}
        </div>}
        {jobStage === "qc" && !jobDocs.some(d => d.label === "After") && <div style={{ background: C.orange + "08", border: `2px dashed ${C.orange}40`, borderRadius: 12, padding: "14px 16px", marginTop: 10, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.orange, marginBottom: 6 }}>📸 After photos required</div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>Take photos of completed work before marking ready</div>
          <div onClick={() => { setPhotoTag("After"); setShowUploadMenu("job") }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: C.green, color: "#fff", borderRadius: 12, cursor: "pointer", fontWeight: 600, fontSize: 15 }}>📷 Add After Photos</div>
        </div>}
        {!jobDocs.length && <div onClick={() => setShowUploadMenu("job")} style={{ padding: "24px 0", textAlign: "center", color: C.muted, cursor: "pointer" }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>📷</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Take a vehicle photo first</div>
          <div style={{ fontSize: 13, marginTop: 2 }}>Helps identify the correct vehicle</div>
        </div>}
        </>}
      </div>

      {/* ═══ MINOR JOB -- Direct Cost Entry + Close ═══ */}
      {isMinorJob && <div style={{ ...card, padding: "14px 16px", border: `2px solid ${C.orange}40` }}>
        {(() => {
          const materialItems = jobCosts.filter(c => c.type !== "labour")
          const confirmedCount = materialItems.filter(c => c.confirmed).length
          const allConfirmed = materialItems.length > 0 && confirmedCount === materialItems.length
          return <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>⚡ Quick Job -- Costs</span>
            {jobCosts.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: allConfirmed ? C.green : C.orange }}>{allConfirmed ? "✓ All confirmed" : `${confirmedCount}/${materialItems.length} materials confirmed`}</span>}
          </div>

          {jobCosts.length === 0 && <div style={{ padding: "20px 0", textAlign: "center", color: C.muted, fontSize: 15 }}>No costs added yet. Tap below to add parts, sundries, or labour.</div>}

          {jobCosts.map(item => <div key={item.id} style={{ padding: "10px 12px", background: item.type === "labour" ? C.accent + "04" : item.confirmed ? C.green + "06" : C.bg, borderRadius: 10, border: `1px solid ${item.type === "labour" ? C.accent + "20" : item.confirmed ? C.green + "30" : C.border}`, marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <input value={item.name} placeholder="Item name..." onChange={e => setJobCosts(prev => prev.map(c => c.id === item.id ? { ...c, name: e.target.value } : c))} style={{ flex: 1, padding: "6px 10px", fontSize: 15, fontWeight: 600, background: item.name ? "transparent" : C.orange + "08", border: item.name ? "none" : `1px solid ${C.orange}40`, borderRadius: 8, color: C.text, fontFamily: FONT, outline: "none" }} />
              <span onClick={() => setJobCosts(prev => prev.filter(c => c.id !== item.id))} style={{ fontSize: 12, color: C.red, cursor: "pointer", marginLeft: 8, flexShrink: 0 }}>Remove</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              {["part", "sundry", "outsource", "labour"].map(t => <div key={t} onClick={() => setJobCosts(prev => prev.map(c => c.id === item.id ? { ...c, type: t, source: t === "labour" ? null : c.source, confirmed: t === "labour" ? false : c.confirmed } : c))} style={{ padding: "5px 10px", borderRadius: 16, fontSize: 12, fontWeight: item.type === t ? 700 : 500, background: item.type === t ? (t === "part" ? C.green : t === "sundry" ? C.purple : t === "outsource" ? C.orange : C.accent) + "15" : C.bg, color: item.type === t ? (t === "part" ? C.green : t === "sundry" ? C.purple : t === "outsource" ? C.orange : C.accent) : C.muted, border: `1px solid ${item.type === t ? "transparent" : C.border}`, cursor: "pointer" }}>{t === "part" ? "🔧 Part" : t === "sundry" ? "📎 Sundry" : t === "outsource" ? "📦 Outsource" : "👷 Labour"}</div>)}
            </div>
            {item.type !== "labour" ? <>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                {["purchased", "ex_stock"].map(s => <div key={s} onClick={() => setJobCosts(prev => prev.map(c => c.id === item.id ? { ...c, source: s } : c))} style={{ padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: item.source === s ? 700 : 500, background: item.source === s ? (s === "purchased" ? C.green : C.purple) + "15" : C.bg, color: item.source === s ? (s === "purchased" ? C.green : C.purple) : C.muted, border: `1px solid ${item.source === s ? "transparent" : C.border}`, cursor: "pointer" }}>{s === "purchased" ? "🛒 Purchased" : "📎 Ex-Stock"}</div>)}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: C.muted, flexShrink: 0 }}>Cost Rs.</span>
                <input type="number" value={item.cost || ""} onChange={e => setJobCosts(prev => prev.map(c => c.id === item.id ? { ...c, cost: Number(e.target.value) || 0, confirmed: false } : c))} style={{ ...inp, flex: 1, fontSize: 17, fontFamily: MONO, padding: "10px 14px" }} placeholder="0" />
                <div onClick={() => { if (!item.name.trim()) { tt("⚠️ Enter item name first"); return } setJobCosts(prev => prev.map(c => c.id === item.id ? { ...c, confirmed: !c.confirmed } : c)) }} style={{ padding: "8px 14px", borderRadius: 10, background: item.confirmed ? C.green : C.bg, color: item.confirmed ? "#fff" : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer", border: `1px solid ${item.confirmed ? C.green : C.border}`, flexShrink: 0 }}>{item.confirmed ? "✓" : "Confirm"}</div>
              </div>
            </> : <div style={{ fontSize: 13, color: C.accent, fontWeight: 500 }}>👷 No cost — charge set freely on invoice</div>}
          </div>)}

          {/* Add item buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <div onClick={() => setJobCosts(prev => [...prev, { id: "jc" + Date.now(), name: "", type: "part", source: "purchased", cost: 0, confirmed: false }])} style={{ flex: 1, padding: "12px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.green, fontWeight: 600, fontSize: 14 }}>+ 🔧 Part</div>
            <div onClick={() => setJobCosts(prev => [...prev, { id: "jc" + Date.now(), name: "", type: "labour", source: null, cost: 0, confirmed: false }])} style={{ flex: 1, padding: "12px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.accent, fontWeight: 600, fontSize: 14 }}>+ 👷 Labour</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <div onClick={() => setJobCosts(prev => [...prev, { id: "jc" + Date.now(), name: "", type: "sundry", source: "ex_stock", cost: 0, confirmed: false }])} style={{ flex: 1, padding: "12px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.purple, fontWeight: 600, fontSize: 14 }}>+ 📎 Sundry</div>
            <div onClick={() => setJobCosts(prev => [...prev, { id: "jc" + Date.now(), name: "", type: "outsource", source: "purchased", cost: 0, confirmed: false }])} style={{ flex: 1, padding: "12px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.orange, fontWeight: 600, fontSize: 14 }}>+ 📦 Outsource</div>
          </div>

          {/* Summary */}
          {jobCosts.length > 0 && <div style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.sub }}>
              <span>Material Cost</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, color: C.text }}>Rs. {materialItems.reduce((s, c) => s + (c.cost || 0), 0).toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginTop: 4 }}>
              <span>{materialItems.length} material{materialItems.length !== 1 ? "s" : ""} + {jobCosts.filter(c => c.type === "labour").length} labour</span>
            </div>
          </div>}

          {/* Create Invoice */}
          {!invoices.length && jobCosts.length > 0 && <button onClick={generateMinorInvoice} style={{ ...btn(allConfirmed ? C.accent : C.muted, "#fff"), marginTop: 10, fontSize: 16, opacity: allConfirmed ? 1 : 0.6 }}>📄 Create Invoice</button>}
          {invoices.length > 0 && <button onClick={() => { setSelInv(invoices[0]); setScreen("inv_detail") }} style={{ ...btn(C.accent + "15", C.accent), marginTop: 10, fontSize: 16 }}>📄 View Invoice</button>}
          {invoices.length > 0 && invoices[0].payments?.length > 0 && <button onClick={() => {
            saveCurrentJob() // save invoices and all state before navigating away
            setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: "closed", onHold: false, jobCosts: [...jobCosts] } : j))
            tt("🏁 Quick job closed"); setActiveJobId(null); setScreen("home"); setHomeTab("closed")
          }} style={{ ...btn(C.green, "#fff"), marginTop: 8, fontSize: 16 }}>🏁 Close Job</button>}
        </>})()}
      </div>}

      {/* Parts Tracker */}
      {hasReplaceParts && <div style={{ ...card, padding: "14px 16px", border: allPartsArrived ? `2px solid ${C.green}30` : `1px solid ${C.border}` }}>
        <SectionHead title="Parts Tracker" icon="📦" sectionKey="parts_tracker" badge={<span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: allPartsArrived ? C.green : C.orange }}>{arrivedCount}/{replaceParts.length}</span>} />
        {isSectionOpen("parts_tracker") && <>
        {!partsOrdered ? <button onClick={() => {
          if (isInsurance && pqStatus !== "approved") {
            if (!confirm("⚠️ Parts prices not yet approved by insurance. Order anyway?")) return
          }
          setPartsOrdered(true); tt("🛒 Parts ordered")
        }} style={{ ...btnSm(C.purple, "#fff"), marginBottom: 10 }}>🛒 Mark Parts Ordered</button>
          : <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 10 }}>✓ Parts ordered</div>}
        {replaceParts.map(p => {
          const arrived = !!partsArrived[p.id]
          return <div key={p.id} onClick={() => setPartsArrived(prev => ({ ...prev, [p.id]: !prev[p.id] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${arrived ? C.green : C.border}`, background: arrived ? C.green + "12" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {arrived && <span style={{ color: C.green, fontSize: 20, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: arrived ? 400 : 600, color: arrived ? C.sub : C.text, textDecoration: arrived ? "line-through" : "none" }}>{p.partName}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{p.estLabel}{p.remarks ? ` · ${p.remarks}` : ""}</div>
            </div>
            {arrived && <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>Arrived</span>}
          </div>
        })}
        {allPartsArrived && <div style={{ textAlign: "center", color: C.green, fontSize: 14, fontWeight: 600, marginTop: 10 }}>✓ All parts received</div>}
        </>}
      </div>}

      {/* Parts Quotation (insurance) / PO (direct) */}
      {partsQuotation.length > 0 && <div style={{ ...card, padding: "14px 16px", border: `1px solid ${pqStatus === "approved" ? C.green : isInsurance ? C.purple : C.accent}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>{isInsurance ? "📄 Parts Quotation" : "📋 Purchase Order"}</span>
          <span style={pill(pqStatus === "approved" ? C.green : pqStatus === "submitted" ? C.orange : C.muted)}>{pqStatus === "approved" ? "✓ Approved" : pqStatus === "submitted" ? "Submitted" : "Draft"}</span>
        </div>
        {isInsurance && pqStatus === "draft" && !pqAllFilled && <div style={{ background: C.orange + "10", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 13, color: C.orange, fontWeight: 500 }}>⚠️ Fill supplier names & prices before submitting</div>}
        {isInsurance && pqStatus === "submitted" && <div style={{ background: C.orange + "10", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 13, color: C.orange, fontWeight: 500 }}>⏳ Awaiting insurance price approval</div>}
        {partsQuotation.slice(0, 3).map(p => <div key={p.id} style={{ fontSize: 15, color: C.sub, padding: "4px 0", display: "flex", justifyContent: "space-between" }}>
          <span>{p.partName} <span style={{ fontSize: 12, color: C.muted }}>({p.remarks})</span></span>
          {isInsurance && <span style={{ fontFamily: MONO, fontSize: 14, color: pqStatus === "approved" ? C.green : p.quotedPrice ? C.text : C.muted }}>{pqStatus === "approved" ? `Rs.${(pqLumpMode ? "--" : (p.approvedPrice?.toLocaleString() || "--"))}` : (p.quotedPrice ? `Rs.${p.quotedPrice.toLocaleString()}` : "--")}</span>}
        </div>)}
        {partsQuotation.length > 3 && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>+{partsQuotation.length - 3} more</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => { setShowPQScreen(true); setPqTab(pqStatus === "submitted" || pqStatus === "approved" ? "approve" : "quote") }} style={{ ...btnSm(isInsurance ? C.purple : C.accent, "#fff"), flex: 1 }}>{pqStatus === "approved" ? "View" : isInsurance ? (pqStatus === "submitted" ? "Record Approval" : "Edit Prices") : "View PO"}</button>
          {isInsurance && pqStatus === "approved" && <button onClick={() => { setShowPQScreen(true); setPqTab("cost") }} style={{ ...btnSm(C.accent + "12", C.accent), flex: 1 }}>💰 Costs</button>}
          <button onClick={() => sharePQ("whatsapp")} style={{ ...btnSm(C.green + "12", C.green), flex: 1 }}>WhatsApp</button>
          <button onClick={() => sharePQ("copy")} style={{ ...btnSm(C.bg, C.sub), flex: 0 }}>📋</button>
        </div>
        {pqStatus === "approved" && (() => {
          const filled = partsQuotation.filter(p => p.suppliedBy)
          const supplierP = partsQuotation.filter(p => p.suppliedBy === "supplier" && p.actualCost > 0)
          const totalMargin = supplierP.reduce((s, p) => s + ((p.approvedPrice || 0) - (p.actualCost || 0)), 0)
          return <div style={{ marginTop: 8, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: C.green, fontWeight: 600 }}>✓ Approved -- Rs.{pqApprovedTotal.toLocaleString()}{pqApprovalPhoto ? " · 📷" : ""}</div>
            {filled.length === partsQuotation.length && supplierP.length > 0 && <div style={{ fontSize: 13, color: totalMargin > 0 ? C.green : C.red, fontWeight: 600, marginTop: 2 }}>Parts margin: Rs.{totalMargin.toLocaleString()}</div>}
            {filled.length < partsQuotation.length && <div style={{ fontSize: 13, color: C.orange, marginTop: 2 }}>⚠️ {partsQuotation.length - filled.length} parts need cost info</div>}
            {supplierP.length > 0 && supplierInvoices.length === 0 && <div style={{ fontSize: 13, color: C.orange, marginTop: 2 }}>⚠️ No supplier invoice attached</div>}
          </div>
        })()}
      </div>}

      {/* Customer Confirmation (direct jobs) */}
      {isDirectJob && estimates.length > 0 && !customerConfirmed && <div style={{ ...card, padding: "14px 16px", border: `2px dashed ${C.orange}40`, background: C.orange + "04" }}>
        <div style={{ fontSize: 15, color: C.sub, marginBottom: 8 }}>Customer hasn't confirmed yet. Share quotation then mark confirmed to create PO.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => sharePQ("whatsapp")} style={{ ...btnSm(C.green + "12", C.green), flex: 1 }}>📱 Send Quotation</button>
          <button onClick={confirmCustomer} style={{ ...btnSm(C.accent, "#fff"), flex: 1 }}>✓ Customer Confirmed</button>
        </div>
      </div>}
      {isDirectJob && customerConfirmed && <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 8 }}>✓ Customer confirmed</div>}

      {/* Estimates */}
      {!isMinorJob && <>
      <SectionHead title="Estimates" icon="📝" sectionKey="estimates" badge={estimates.filter(e => e.status !== "archived").length > 0 ? <span style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>{estimates.filter(e => e.status !== "archived").length}</span> : null} />
      {isSectionOpen("estimates") && <>
      {estimates.filter(e => e.status !== "archived").map(est => (
        <div key={est.id} style={{ ...card, position: "relative", padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO }}>{est.number}</span>
                <span style={pill(est.status === "approved" ? C.green : C.orange)}>{est.status}</span>
              </div>
              <div style={{ fontSize: 16, color: C.sub }}>{est.label} · {est.entries.length} items{(est.sundries || []).length > 0 ? ` + ${est.sundries.length} sundries` : ""}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                <span onClick={() => { setSelEst(est); setEstParts([...est.parts]); setEstEntries([...est.entries]); setSundryItems([...(est.sundries || [])]); setActiveCat(0); setScreen("est_review") }} style={{ fontSize: 16, fontWeight: 500, color: C.accent, cursor: "pointer" }}>View →</span>
                {est.status === "draft" && isInsurance && <span onClick={() => startApproval(est)} style={{ fontSize: 16, fontWeight: 500, color: C.green, cursor: "pointer" }}>Approve →</span>}
                <span onClick={() => generateEstimatePDF(est)} style={{ fontSize: 15, fontWeight: 500, color: C.purple, cursor: "pointer" }}>📄 PDF</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>{(est.status === "approved" ? est.approved_total : est.total).toLocaleString()}</div>
              <span onClick={(e) => { e.stopPropagation(); deleteEstimate(est.id) }} style={{ fontSize: confirmDelEst === est.id ? 13 : 22, color: C.red, cursor: "pointer", opacity: confirmDelEst === est.id ? 1 : 0.35, background: confirmDelEst === est.id ? C.red + "15" : "none", padding: confirmDelEst === est.id ? "8px 12px" : "8px 12px", borderRadius: 8, fontWeight: confirmDelEst === est.id ? 700 : 400, lineHeight: 1, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>{confirmDelEst === est.id ? (est.status === "approved" ? "Archive?" : "Delete?") : "×"}</span>
            </div>
          </div>
        </div>
      ))}
      {estimates.some(e => e.status === "archived") && <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 8, cursor: "pointer" }} onClick={() => setShowArchived(!showArchived)}>{showArchived ? "▲ Hide" : "▼ Show"} {estimates.filter(e => e.status === "archived").length} archived</div>}
      {showArchived && estimates.filter(e => e.status === "archived").map(est => (
        <div key={est.id} style={{ ...card, opacity: 0.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontFamily: MONO }}>{est.number}</span>
              <span style={pill(C.sub)}>archived</span>
            </div>
            <div style={{ fontSize: 14, color: C.muted }}>{est.label} · Rs.{(est.approved_total || est.total).toLocaleString()}</div>
          </div>
          <span onClick={() => { setEstimates(prev => prev.map(e => e.id === est.id ? { ...e, status: "approved" } : e)); tt("Restored") }} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 500 }}>Restore</span>
        </div>
      ))}

      <button onClick={() => { setSelEst(null); setEstParts([]); setEstEntries([]); setSundryItems([]); setSundryInput(""); setActiveCat(0); setScreen("est_parts") }} style={{ ...btn(C.card, C.accent), border: `2px dashed ${C.border}`, marginBottom: 16, background: C.card }}>
        + {estimates.length === 0 ? (isDirectJob ? "Create Quotation" : "Create Estimate") : "Add Supplementary"}
      </button>

      {estimates.some(e => e.status === "approved") && !invoices.length && <button onClick={generateInvoice} style={{ ...btn(C.accent, "#fff"), marginBottom: 12 }}>Generate Invoice ({estimates.filter(e => e.status === "approved").length} approved)</button>}
      </>}
      </>}

      {/* Invoices -- visible for all job types */}
      {invoices.map(inv => { const st = INV_STATUS[inv.status]; return <div key={inv.id} onClick={() => { setSelInv(inv); setScreen("inv_detail") }} style={{ ...card, cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO }}>{inv.invoice_number}</span><span style={pill(st.c)}>{st.l}</span></div><span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>Rs.{fmt(invTotal(inv))}</span></div>{isDirectJob ? <div style={{ fontSize: 14, color: C.sub, marginTop: 6 }}>Balance: Rs.{fmt(invCustBalance(inv))}</div> : invInsTotal(inv) > 0 && <div style={{ fontSize: 14, color: C.sub, marginTop: 6 }}>Ins: Rs.{fmt(invInsTotal(inv))} {invInsPayments(inv).some(p => p.ins_status !== "received") ? "⏳" : "✓"} · Cust bal: Rs.{fmt(invCustBalance(inv))}</div>}</div> })}

      {/* On Hold / Reactivate / Delete */}
      <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        {activeJob?.onHold
          ? <button onClick={toggleHold} style={{ ...btn(C.green + "12", C.green) }}>▶ Reactivate Job</button>
          : <button onClick={toggleHold} style={{ ...btn(C.bg, C.orange), border: `1px solid ${C.orange}30` }}>📌 Put On Hold</button>}
        {estimates.length === 0 && <button onClick={deleteJob} style={{ ...btn(confirmDelJob ? C.red : "transparent", confirmDelJob ? "#fff" : C.red), marginTop: 8, fontSize: 15, padding: "12px 20px", border: confirmDelJob ? "none" : `1px solid ${C.red}30` }}>{confirmDelJob ? "Tap again to confirm delete" : "🗑 Delete Job"}</button>}
      </div>
    </>
  )
}
