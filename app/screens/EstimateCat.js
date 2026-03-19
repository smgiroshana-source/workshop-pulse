"use client"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, card, NavBar, fmt } from "../WorkshopContext"

export default function EstimateCat() {
  const {
    screen, setScreen,
    selEst,
    estParts,
    estEntries,
    activeCat, setActiveCat,
    jobCats,
    cat,
    rateRefs,
    hasEntry, getEntry, catTotal,
    toggleCheck, setRate, toggleRemarks, handleRateEnter,
  } = useWorkshop()

  return (
    <>
      <NavBar
        title={`${cat.icon} ${cat.label}`}
        subtitle="Check, rate, enter, next"
        onBack={() => { if (activeCat === 0) { if (selEst) setScreen("est_review"); else setScreen("est_parts") } else setActiveCat(activeCat - 1) }}
      />
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.card, borderRadius: 14, padding: 5, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {jobCats.map((c, i) => { const cnt = estEntries.filter(e => e.category === c.key).length; return <div key={c.key} onClick={() => setActiveCat(i)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: i === activeCat ? c.color + "12" : "transparent" }}>
          <div style={{ fontSize: 22 }}>{c.icon}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: i === activeCat ? c.color : C.muted, marginTop: 2 }}>{c.short}</div>
          {cnt > 0 && <div style={{ fontSize: 12, fontFamily: MONO, color: c.color, fontWeight: 700 }}>{cnt}</div>}
        </div> })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>{cat.icon} {cat.label}</span>
        <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: cat.color }}>Rs. {fmt(catTotal(cat.key))}</span>
      </div>
      {estParts.map(p => { const entry = getEntry(p.id, cat.key); const checked = !!entry; const isReplace = cat.key === "replace";
        return <div key={p.id} style={{ ...card, padding: "14px 16px", marginBottom: 6, borderLeft: `4px solid ${checked ? cat.color : "transparent"}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => toggleCheck(p)} style={{ width: 44, height: 44, borderRadius: 12, border: `2px solid ${checked ? cat.color : C.border}`, background: checked ? cat.color + "12" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            {checked && <span style={{ color: cat.color, fontSize: 22, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ flex: 1, fontSize: 17, fontWeight: checked ? 600 : 400 }}>{p.name}</span>
          {checked && !isReplace && <input ref={el => rateRefs.current[p.id] = el} type="number" value={entry.rate || ""} onChange={e => setRate(p.id, e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleRateEnter(p.id) } }} placeholder="Rate" style={{ width: 110, padding: "10px 12px", background: C.bg, border: `2px solid ${cat.color}40`, borderRadius: 12, color: C.text, fontSize: 20, fontFamily: MONO, fontWeight: 700, textAlign: "right", outline: "none" }} />}
          {checked && isReplace && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input ref={el => rateRefs.current[p.id] = el} type="number" value={entry.rate || ""} onChange={e => setRate(p.id, e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleRateEnter(p.id) } }} placeholder="Rate" style={{ width: 80, padding: "10px", background: C.bg, border: `2px solid ${cat.color}40`, borderRadius: 12, color: C.text, fontSize: 18, fontFamily: MONO, fontWeight: 700, textAlign: "right", outline: "none" }} />
            <div onClick={() => toggleRemarks(p.id)} style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <div style={{ padding: "9px 10px", fontSize: 14, fontWeight: 700, background: entry.remarks === "S/H" ? C.orange + "20" : "transparent", color: entry.remarks === "S/H" ? C.orange : C.muted }}>S/H</div>
              <div style={{ padding: "9px 10px", fontSize: 14, fontWeight: 700, background: entry.remarks === "M/R" ? C.green + "20" : "transparent", color: entry.remarks === "M/R" ? C.green : C.muted }}>M/R</div>
            </div>
          </div>}
        </div>
      })}
      <div style={{ marginTop: 16 }}>
        {activeCat < jobCats.length - 1 ? <button onClick={() => setActiveCat(activeCat + 1)} style={{ ...btn(jobCats[activeCat + 1].color, "#fff") }}>Next → {jobCats[activeCat + 1].icon} {jobCats[activeCat + 1].label}</button>
          : <button onClick={() => setScreen("est_review")} style={{ ...btn(C.accent, "#fff") }}>Review Estimate</button>}
      </div>
    </>
  )
}
