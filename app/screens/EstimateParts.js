"use client"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, btnSm, card, NavBar, COMMON_PARTS } from "../WorkshopContext"

export default function EstimateParts() {
  const {
    screen, setScreen,
    selEst,
    estParts, setEstParts,
    estEntries, setEstEntries,
    partInput, setPartInput,
    suggestions, setSuggestions,
    partInputRef,
    jobCats,
    addPart, removePart, handlePartInput,
    tt,
  } = useWorkshop()

  return (
    <>
      <NavBar
        title={selEst ? "Edit Parts" : "Add Parts"}
        subtitle={selEst ? `${selEst.number} · ${estParts.length} parts` : "Enter part names -- prices come next"}
        onBack={() => { if (selEst) setScreen("est_review"); else setScreen("job") }}
      />
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input ref={partInputRef} value={partInput} onChange={e => handlePartInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && partInput.trim()) addPart(partInput) }} placeholder="Type part name..." style={{ ...inp, background: C.card, fontSize: 18, fontWeight: 500, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", paddingRight: 70 }} autoFocus />
        {partInput.trim() && <button onClick={() => addPart(partInput)} style={{ position: "absolute", right: 8, top: 10, ...btnSm(C.accent, "#fff"), width: "auto", padding: "10px 16px" }}>Add</button>}
      </div>
      {suggestions.length > 0 && <div style={{ background: C.card, borderRadius: 14, marginBottom: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        {suggestions.map((s, i) => <div key={i} onClick={() => addPart(s)} style={{ padding: "14px 18px", borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", fontSize: 17, display: "flex", justifyContent: "space-between" }}><span>{s}</span><span style={{ color: C.accent, fontWeight: 600, fontSize: 18 }}>+</span></div>)}
      </div>}
      {estParts.map((p, idx) => <div key={p.id} style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 15, color: C.muted, width: 24 }}>{idx + 1}</span>
        <span style={{ flex: 1, fontSize: 17 }}>{p.name}</span>
        <span onClick={() => removePart(p.id)} style={{ color: C.red, fontSize: 18, cursor: "pointer", padding: 6 }}>✕</span>
      </div>)}
      {estParts.length > 0 && <button onClick={() => { setScreen("est_cat") }} style={{ ...btn(C.accent, "#fff"), marginTop: 10 }}>Next → {jobCats[0].icon} {jobCats[0].label}</button>}
      {selEst && estParts.length > 0 && <button onClick={() => setScreen("est_review")} style={{ ...btn(C.bg, C.accent), marginTop: 8 }}>Back to Review</button>}
    </>
  )
}
