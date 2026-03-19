"use client"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, btnSm, card, NavBar, fmt } from "../WorkshopContext"

export default function EstimateReview() {
  const {
    screen, setScreen,
    selEst, setSelEst,
    estimates,
    estParts, setEstParts,
    estEntries, setEstEntries,
    sundryItems, setSundryItems,
    sundryInput, setSundryInput,
    activeCat, setActiveCat,
    jobCats,
    getEntry, catTotal,
    sundryTotal, grandTotal,
    saveEstimate,
    tt,
  } = useWorkshop()

  return (
    <>
      <NavBar
        title={selEst ? `${selEst.number}` : "Review"}
        subtitle={`${estParts.length} parts · ${estEntries.length} entries${sundryItems.length ? ` + ${sundryItems.length} sundries` : ""}`}
        onBack={() => { if (selEst && estimates.find(e => e.id === selEst.id)) { setSelEst(null); setScreen("job") } else { setActiveCat(0); setScreen("est_cat") } }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {jobCats.map((c, i) => { const ct = catTotal(c.key); const entries = estEntries.filter(e => e.category === c.key); const hasRemarks = entries.filter(e => !e.rate && e.remarks); const hasEntries = entries.length > 0; return <div key={c.key} onClick={() => { setActiveCat(i); setScreen("est_cat") }} style={{ ...card, textAlign: "center", padding: "12px 4px", marginBottom: 0, cursor: "pointer", border: (ct > 0 || hasEntries) ? `2px solid ${c.color}20` : `1px solid ${C.border}` }}>
          <div style={{ fontSize: 22 }}>{c.icon}</div>
          {ct > 0 ? <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: c.color, marginTop: 4 }}>{ct.toLocaleString()}</div>
            : hasRemarks.length > 0 ? <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginTop: 4 }}>{hasRemarks.map(e => e.remarks).join(", ")}</div>
              : <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: c.color, marginTop: 4 }}>0</div>}
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, marginTop: 2 }}>{c.short}</div>
          <div style={{ fontSize: 10, color: C.accent, marginTop: 4 }}>tap to edit</div>
        </div> })}
      </div>
      <div style={{ ...card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16 }}>
          <thead><tr style={{ borderBottom: `2px solid ${C.border}` }}><th style={{ textAlign: "left", padding: "10px 6px", color: C.sub, fontSize: 14 }}>Part</th>{jobCats.map(c => <th key={c.key} style={{ textAlign: "right", padding: "10px 6px", color: c.color, fontSize: 15 }}>{c.icon}</th>)}</tr></thead>
          <tbody>
            {estParts.map(p => <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: "8px 6px", fontSize: 16 }}>{p.name}</td>{jobCats.map(c => { const e = getEntry(p.id, c.key); return <td key={c.key} style={{ textAlign: "right", padding: "8px 6px", fontFamily: MONO, fontSize: 15, color: e ? (e.rate > 0 ? c.color : (e.remarks ? C.accent : C.muted)) : C.muted, fontWeight: e && e.remarks && !e.rate ? 600 : 400 }}>{e ? (e.rate > 0 ? e.rate.toLocaleString() : (e.remarks || "0")) : "--"}</td> })}</tr>)}
            <tr style={{ borderTop: `2px solid ${C.border}` }}><td style={{ padding: "10px 6px", fontWeight: 700, color: C.sub, fontSize: 14 }}>TOTAL</td>{jobCats.map(c => <td key={c.key} style={{ textAlign: "right", padding: "10px 6px", fontFamily: MONO, fontWeight: 700, fontSize: 16, color: c.color }}>{catTotal(c.key).toLocaleString()}</td>)}</tr>
          </tbody>
        </table>
      </div>

      {/* Sundries */}
      <div style={{ ...card, padding: "14px 16px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, marginBottom: 10 }}>🧴 OTHER ITEMS / SUNDRIES</div>
        <div style={{ display: "flex", gap: 8, marginBottom: sundryItems.length ? 10 : 0 }}>
          <input value={sundryInput} onChange={e => setSundryInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && sundryInput.trim()) { setSundryItems(p => [...p, { id: "sun_" + Date.now(), name: sundryInput.trim(), rate: 0, qty: 1, remarks: "" }]); setSundryInput("") } }} placeholder="Type item name..." style={{ ...inp, flex: 1, padding: "12px 14px" }} />
          {sundryInput.trim() && <button onClick={() => { setSundryItems(p => [...p, { id: "sun_" + Date.now(), name: sundryInput.trim(), rate: 0, qty: 1, remarks: "" }]); setSundryInput("") }} style={{ ...btnSm(C.accent, "#fff"), width: "auto", padding: "10px 16px" }}>Add</button>}
        </div>
        {sundryItems.map(si => <div key={si.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
          <input value={si.name} onChange={e => setSundryItems(p => p.map(x => x.id === si.id ? { ...x, name: e.target.value } : x))} style={{ flex: 1, padding: "8px 10px", background: C.bg, border: "none", borderRadius: 8, color: C.text, fontSize: 16, fontFamily: FONT, outline: "none" }} />
          {si.remarks === "M/R" ? <span onClick={() => setSundryItems(p => p.map(x => x.id === si.id ? { ...x, remarks: "", rate: 0 } : x))} style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.accent, background: C.accent + "12", padding: "4px 12px", borderRadius: 8, cursor: "pointer" }}>M/R</span>
            : <><input type="number" value={si.rate || ""} onChange={e => setSundryItems(p => p.map(x => x.id === si.id ? { ...x, rate: Number(e.target.value) || 0 } : x))} placeholder="0" style={{ width: 80, padding: "8px 10px", background: C.bg, border: "none", borderRadius: 8, color: C.text, fontSize: 16, fontFamily: MONO, fontWeight: 700, textAlign: "right", outline: "none" }} />
              <span onClick={() => setSundryItems(p => p.map(x => x.id === si.id ? { ...x, remarks: "M/R", rate: 0 } : x))} style={{ fontSize: 12, color: C.accent, cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: C.accent + "12", fontWeight: 700, flexShrink: 0 }}>M/R</span></>}
          <span onClick={() => setSundryItems(p => p.filter(x => x.id !== si.id))} style={{ color: C.red, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</span>
        </div>)}
      </div>

      {/* Grand Total */}
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20 }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Grand Total</span>
          {sundryTotal > 0 && <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>Parts & Labour: {(grandTotal - sundryTotal).toLocaleString()} + Sundries: {sundryTotal.toLocaleString()}</div>}
        </div>
        <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700 }}>Rs. {fmt(grandTotal)}</span>
      </div>
      <button onClick={() => { setSelEst(null); setEstParts([]); setEstEntries([]); setScreen("est_parts") }} style={{ ...btn(C.bg, C.accent), marginBottom: 8 }}>✏️ Edit Parts List</button>
      <button onClick={saveEstimate} style={{ ...btn(C.accent, "#fff"), marginTop: 4 }}>{selEst ? "Update Estimate" : "Save Estimate"}</button>
    </>
  )
}
