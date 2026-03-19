"use client"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, card, NavBar, fmt, CATS_ALL } from "../WorkshopContext"

export default function ApprovalSummary() {
  const {
    screen, setScreen,
    selEst,
    approvalItems,
    aOrigT, aApprT,
    finalizeApproval,
    tt,
  } = useWorkshop()

  return (
    <>
      <NavBar title="Summary" onBack={() => setScreen("approve_entry")} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ ...card, textAlign: "center", marginBottom: 0, padding: 16 }}><div style={{ fontSize: 14, color: C.sub, marginBottom: 4 }}>Your Estimate</div><div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700 }}>Rs.{aOrigT.toLocaleString()}</div></div>
        <div style={{ ...card, textAlign: "center", marginBottom: 0, padding: 16, border: `2px solid ${aApprT < aOrigT ? C.red + "30" : C.green + "30"}` }}><div style={{ fontSize: 14, color: C.sub, marginBottom: 4 }}>Approved</div><div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: aApprT < aOrigT ? C.red : C.green }}>Rs.{aApprT.toLocaleString()}</div></div>
      </div>
      {aApprT < aOrigT && <div style={{ ...card, textAlign: "center", padding: 16, background: C.red + "06", border: `1px solid ${C.red}20`, marginBottom: 14 }}>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>Total Cut</div>
        <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.red }}>-Rs.{(aOrigT - aApprT).toLocaleString()} ({Math.round(((aOrigT - aApprT) / aOrigT) * 100)}%)</div>
      </div>}
      {approvalItems.filter(i => i.approval_status === "use_same").length > 0 && <>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.accent, marginBottom: 6, marginTop: 8 }}>U/S -- USE SAME</div>
        {approvalItems.filter(i => i.approval_status === "use_same").map(item => (<div key={item.id} style={{ ...card, padding: "12px 16px", marginBottom: 6, borderLeft: `4px solid ${C.accent}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><span style={{ fontSize: 17 }}>{item.part_name}</span> <span style={{ fontSize: 14, color: C.sub }}>(Replace)</span></div><span style={{ fontWeight: 700, color: C.accent, fontSize: 15 }}>Use Same</span></div>))}
      </>}
      {approvalItems.filter(i => i.approval_status !== "use_same" && i.approved_rate !== null && i.approved_rate < i.original_rate).length > 0 && <>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.red, marginBottom: 6, marginTop: 8 }}>CUTS</div>
        {approvalItems.filter(i => i.approval_status !== "use_same" && i.approved_rate !== null && i.approved_rate < i.original_rate).map(item => (<div key={item.id} style={{ ...card, padding: "12px 16px", marginBottom: 6, borderLeft: `4px solid ${C.red}30`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><span style={{ fontSize: 17 }}>{item.part_name}</span> <span style={{ fontSize: 14, color: C.sub }}>({CATS_ALL.find(c => c.key === item.category)?.short})</span></div><div><span style={{ fontFamily: MONO, color: C.muted, textDecoration: "line-through", marginRight: 8, fontSize: 15 }}>{item.original_rate.toLocaleString()}</span><span style={{ fontFamily: MONO, fontWeight: 700, color: C.red, fontSize: 17 }}>{item.approved_rate?.toLocaleString()}</span></div></div>))}
      </>}
      <button onClick={finalizeApproval} style={{ ...btn(C.accent, "#fff"), marginTop: 14 }}>Confirm Approved Prices</button>
    </>
  )
}
