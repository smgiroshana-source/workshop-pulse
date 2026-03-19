"use client"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, card, NavBar, fmt } from "../WorkshopContext"

export default function ApprovalEntry() {
  const {
    screen, setScreen,
    approvalItems, setApprovalItems,
    approvalCat, setApprovalCat,
    approvalRefs,
    jobCats,
    aCat,
    aEntCnt, aApprT,
    isTablet,
    setApproved, approveAsIs, markUseSame, approveAllCatAsIs, handleApprovalEnter,
    tt,
  } = useWorkshop()

  return (
    <>
      <NavBar
        title={`${aCat.icon} ${aCat.label}`}
        subtitle="Your price vs Approved price"
        onBack={() => setScreen("approve")}
      />
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.card, borderRadius: 14, padding: 5, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {jobCats.map((c, i) => { const ci = approvalItems.filter(x => x.category === c.key); const done = ci.filter(x => x.approved_rate !== null || x.approval_status === "use_same").length; return ci.length ? <div key={c.key} onClick={() => setApprovalCat(i)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: i === approvalCat ? c.color + "12" : "transparent" }}>
          <div style={{ fontSize: 22 }}>{c.icon}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: i === approvalCat ? c.color : C.muted }}>{done}/{ci.length}</div>
        </div> : null })}
      </div>
      {approvalItems.filter(i => i.category === aCat.key).some(i => i.approved_rate === null && i.approval_status !== "use_same") && <button onClick={approveAllCatAsIs} style={{ ...btn(C.green + "12", C.green), marginBottom: 12 }}>✓ Approve all {aCat.label} as-is</button>}
      {approvalItems.filter(i => i.category === aCat.key).map(item => { const isUS = item.approval_status === "use_same"; const done = item.approved_rate !== null || isUS; const wasCut = done && !isUS && item.approved_rate < item.original_rate;
        return <div key={item.id} style={{ ...card, padding: "14px 16px", marginBottom: 6, borderLeft: `4px solid ${isUS ? C.accent : done ? (wasCut ? C.red : C.green) : "transparent"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 500 }}>{item.part_name}</span>
            <span style={{ fontFamily: MONO, fontSize: 17, color: C.sub, textDecoration: wasCut || isUS ? "line-through" : "none" }}>Rs.{item.original_rate.toLocaleString()}</span>
          </div>
          {isUS ? <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.accent, background: C.accent + "12", padding: "6px 14px", borderRadius: 10 }}>U/S -- Use Same</span>
            <span onClick={() => { setApprovalItems(prev => prev.map(i => i.id === item.id ? { ...i, approved_rate: null, approval_status: "pending", remarks: item.category === "replace" ? "S/H" : "" } : i)) }} style={{ fontSize: 14, color: C.muted, cursor: "pointer" }}>Undo</span>
          </div> : <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15, color: C.sub, width: 70 }}>Approved</span>
              <input ref={el => approvalRefs.current[item.id] = el} type="number" value={item.approved_rate === null ? "" : item.approved_rate} onChange={e => setApproved(item.id, e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleApprovalEnter(item.id) } }} placeholder={item.original_rate.toString()} style={{ flex: 1, padding: "12px 14px", background: C.bg, border: `2px solid ${done ? (wasCut ? C.red + "40" : C.green + "40") : C.border}`, borderRadius: 12, color: wasCut ? C.red : C.text, fontSize: 22, fontFamily: MONO, fontWeight: 700, textAlign: "right", outline: "none" }} />
              <button onClick={() => approveAsIs(item.id)} style={{ padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer", background: done && !wasCut ? C.green + "12" : C.bg, color: done && !wasCut ? C.green : C.muted, fontWeight: 700, fontSize: 18 }}>✓</button>
            </div>
            {item.category === "replace" && <button onClick={() => markUseSame(item.id)} style={{ marginTop: 8, padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.accent}30`, background: C.accent + "06", color: C.accent, fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%" }}>U/S -- Use Same Part</button>}
            {wasCut && <div style={{ fontSize: 15, color: C.red, marginTop: 6, fontWeight: 500 }}>Cut Rs.{(item.original_rate - item.approved_rate).toLocaleString()} ({Math.round(((item.original_rate - item.approved_rate) / item.original_rate) * 100)}%)</div>}
          </>}
        </div>
      })}
      <div style={{ marginTop: 16 }}>
        {approvalCat < jobCats.length - 1 && approvalItems.some(i => i.category === jobCats[approvalCat + 1]?.key) ? <button onClick={() => setApprovalCat(approvalCat + 1)} style={{ ...btn(jobCats[approvalCat + 1].color, "#fff") }}>Next → {jobCats[approvalCat + 1].icon} {jobCats[approvalCat + 1].label}</button>
          : <button onClick={() => setScreen("approve_summary")} style={{ ...btn(C.accent, "#fff") }}>View Summary</button>}
      </div>
      <div style={{ position: "fixed", bottom: 0, left: isTablet ? 380 : 0, right: 0, background: C.card, borderTop: `1px solid ${C.border}`, padding: "14px 24px", maxWidth: isTablet ? undefined : 480, margin: isTablet ? undefined : "0 auto", zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 16, color: C.sub }}>{aEntCnt}/{approvalItems.length}</span>
        <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700 }}>Approved: Rs.{fmt(aApprT)}</span>
      </div>
    </>
  )
}
