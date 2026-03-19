"use client"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, card, NavBar, fmt } from "../WorkshopContext"

export default function ApprovalUpload() {
  const {
    screen, setScreen,
    selEst,
    approvalItems,
    jobDocs, setJobDocs,
    showImage, setShowImage,
    showUploadMenu, setShowUploadMenu,
    approveAsIs,
    tt,
  } = useWorkshop()

  if (!selEst) return null

  const estDocs = jobDocs.filter(d => d.estId === selEst.id)

  return (
    <>
      <NavBar
        title="Assessor Approval"
        subtitle={`${selEst.number} · ${selEst.type === "supplementary" ? selEst.label : "Estimate"} · Rs.${fmt(selEst.total)}`}
        onBack={() => setScreen("job")}
      />
      <div onClick={() => setShowUploadMenu("approval")} style={{ ...card, cursor: "pointer", border: `2px ${estDocs.length > 0 ? "solid " + C.green + "30" : "dashed " + C.orange + "50"}`, textAlign: estDocs.length ? "left" : "center", padding: estDocs.length ? 18 : 32 }}>
        {estDocs.length > 0 ? <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: C.green }}>✓ {estDocs.length} photo{estDocs.length > 1 ? "s" : ""} · {selEst.type === "supplementary" ? selEst.label : "Estimate"}</span>
            <span style={{ fontSize: 17, color: C.accent, fontWeight: 500 }}>+ Add</span>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>{estDocs.map(d => <img key={d.id} src={d.dataUrl} onClick={e => { e.stopPropagation(); setShowImage(d.id) }} style={{ width: 90, height: 68, objectFit: "cover", borderRadius: 12, flexShrink: 0 }} alt="" />)}</div>
        </> : <>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Approved Copy</div>
          <div style={{ fontSize: 16, color: C.sub, marginTop: 4 }}>{selEst.type === "supplementary" ? selEst.label : "Estimate"}</div>
          <div style={{ fontSize: 16, color: C.red, marginTop: 6, fontWeight: 500 }}>Required before entering prices</div>
        </>}
      </div>
      {estDocs.length > 0 ? <>
        <button onClick={() => { setScreen("approve_entry") }} style={{ ...btn(C.accent, "#fff"), marginBottom: 10 }}>Enter Approved Prices</button>
        <button onClick={() => { approvalItems.forEach(i => { if (i.approved_rate === null && i.approval_status !== "use_same") approveAsIs(i.id) }); setScreen("approve_summary") }} style={{ ...btn(C.green + "12", C.green) }}>Approve All As-Is</button>
      </> : <div style={{ ...card, textAlign: "center", opacity: 0.35, padding: 22 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: C.sub }}>Enter Approved Prices</div>
        <div style={{ fontSize: 16, color: C.sub, marginTop: 6 }}>Upload the approved copy first</div>
      </div>}
    </>
  )
}
