"use client"
import { useState } from "react"
import { C, MONO, inp, card, genId, fmt } from "../WorkshopContext"

export const SUB_CATEGORIES = ["Painting", "Denting", "Glass", "Electrical", "Seat", "Calibration", "Other"]

// Per-job costs (parts bought + sub-contracted work) and live job profit.
// Work entries with a contractor feed the contractor ledger (balance =
// work billed − payments made); payments are recorded on the Contractors
// screen, never here — so weekly bulk settlements can't distort job profit.
export default function JobCostsCard({ jobCosts, setJobCosts, revenue, contractorNames, tt }) {
  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState("outsource") // outsource | part
  const [addCat, setAddCat] = useState("Painting")
  const [addContractor, setAddContractor] = useState("")
  const [addName, setAddName] = useState("")
  const [addAmt, setAddAmt] = useState("")
  const [confirmDel, setConfirmDel] = useState(null)
  const [suggOpen, setSuggOpen] = useState(false)

  const costEntries = (jobCosts || []).filter(c => c.type !== "labour")
  const totalCost = costEntries.reduce((s, c) => s + (Number(c.cost) || 0), 0)
  const profit = revenue - totalCost
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : null

  const add = () => {
    const amt = Math.round(Number(addAmt))
    if (!isFinite(amt) || amt <= 0) { tt("⚠️ Enter a valid amount"); return }
    if (addType === "outsource" && !addContractor.trim()) { tt("⚠️ Enter the contractor name"); return }
    if (addType === "part" && !addName.trim()) { tt("⚠️ Enter the part/material name"); return }
    const entry = addType === "outsource"
      ? { id: genId("jc"), type: "outsource", category: addCat, contractor: addContractor.trim(), name: `${addCat} (${addContractor.trim()})`, cost: amt, date: new Date().toLocaleDateString("en-CA") }
      : { id: genId("jc"), type: "part", source: "purchased", name: addName.trim(), cost: amt, date: new Date().toLocaleDateString("en-CA") }
    setJobCosts(prev => [...prev, entry])
    setAddAmt(""); setAddName(""); setShowAdd(false)
    tt("✓ Cost recorded")
  }

  const del = (id) => {
    if (confirmDel !== id) { setConfirmDel(id); setTimeout(() => setConfirmDel(c => c === id ? null : c), 3000); return }
    setJobCosts(prev => prev.filter(c => c.id !== id))
    setConfirmDel(null)
  }

  const sugg = addContractor.trim()
    ? contractorNames.filter(n => n.toLowerCase().includes(addContractor.trim().toLowerCase()) && n.toLowerCase() !== addContractor.trim().toLowerCase()).slice(0, 5)
    : []

  return (
    <div style={{ ...card, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: costEntries.length || showAdd ? 10 : 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>Costs & Profit</span>
        {!showAdd && <span onClick={() => setShowAdd(true)} style={{ fontSize: 14, fontWeight: 600, color: C.accent, cursor: "pointer", padding: "6px 12px", background: C.accent + "10", borderRadius: 8 }}>+ Add Cost</span>}
      </div>

      {costEntries.map(c => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
            <div style={{ fontSize: 12, color: C.muted }}>
              {c.type === "outsource" ? `Sub-contract${c.category ? " · " + c.category : ""}${c.contractor ? " · " + c.contractor : ""}` : "Part / material"}
              {c.date ? ` · ${c.date}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700 }}>Rs.{fmt(c.cost)}</span>
            <span onClick={() => del(c.id)} style={{ fontSize: confirmDel === c.id ? 12 : 16, color: C.red, cursor: "pointer", opacity: confirmDel === c.id ? 1 : 0.4, background: confirmDel === c.id ? C.red + "15" : "none", padding: confirmDel === c.id ? "2px 8px" : "0 4px", borderRadius: 6, fontWeight: confirmDel === c.id ? 700 : 400, minWidth: 32, textAlign: "center" }}>{confirmDel === c.id ? "Del?" : "×"}</span>
          </div>
        </div>
      ))}

      {showAdd && (
        <div style={{ background: C.bg, borderRadius: 12, padding: 12, marginTop: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <div onClick={() => setAddType("outsource")} style={{ flex: 1, padding: "9px 6px", borderRadius: 8, textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: 700, background: addType === "outsource" ? C.purple : "#fff", color: addType === "outsource" ? "#fff" : C.sub, border: `2px solid ${addType === "outsource" ? C.purple : C.border}` }}>Sub-contract</div>
            <div onClick={() => setAddType("part")} style={{ flex: 1, padding: "9px 6px", borderRadius: 8, textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: 700, background: addType === "part" ? C.green : "#fff", color: addType === "part" ? "#fff" : C.sub, border: `2px solid ${addType === "part" ? C.green : C.border}` }}>Part / Material</div>
          </div>
          {addType === "outsource" ? (
            <>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                {SUB_CATEGORIES.map(k => (
                  <span key={k} onClick={() => setAddCat(k)} style={{ padding: "6px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: addCat === k ? C.purple : "#fff", color: addCat === k ? "#fff" : C.sub, border: `1.5px solid ${addCat === k ? C.purple : C.border}` }}>{k}</span>
                ))}
              </div>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <input value={addContractor} onChange={e => { setAddContractor(e.target.value); setSuggOpen(true) }} placeholder="Contractor name / company" style={inp} autoComplete="off" />
                {suggOpen && sugg.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, zIndex: 20, boxShadow: "0 6px 20px rgba(0,0,0,0.1)" }}>
                    {sugg.map(n => <div key={n} onClick={() => { setAddContractor(n); setSuggOpen(false) }} style={{ padding: "10px 12px", fontSize: 14, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>{n}</div>)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Part / material name" style={{ ...inp, marginBottom: 8 }} autoComplete="off" />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" inputMode="numeric" min="0" value={addAmt} onChange={e => setAddAmt(e.target.value)} placeholder="Amount Rs." style={{ ...inp, flex: 1, fontFamily: MONO, fontWeight: 700 }} />
            <button onClick={add} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Add</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fff", color: C.sub, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>✕</button>
          </div>
        </div>
      )}

      {(costEntries.length > 0 || revenue > 0) && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1.5px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub }}>
            <span>Revenue (excl. VAT, after discounts)</span><span style={{ fontFamily: MONO, fontWeight: 700 }}>Rs.{fmt(revenue)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub, marginTop: 3 }}>
            <span>Direct costs (parts + sub-contracts)</span><span style={{ fontFamily: MONO, fontWeight: 700 }}>−Rs.{fmt(totalCost)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 15, fontWeight: 800 }}>
            <span>Job profit{margin !== null ? ` (${margin}%)` : ""}</span>
            <span style={{ fontFamily: MONO, color: profit >= 0 ? C.green : C.red }}>Rs.{fmt(profit)}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Before shop overheads (consumables, wages, rent) — see the Monthly Summary for those.</div>
        </div>
      )}
    </div>
  )
}
