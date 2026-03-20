"use client"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, btnSm, card, NavBar, VEHICLE_MAKES, INSURANCE_COMPANIES, normalizeReg, normalizePhone, regSearchKey, phoneSearchKey } from "../WorkshopContext"
import { uploadPhoto } from "../supabase"

export default function NewJobScreen() {
  const {
    setScreen,
    newJobInfo, setNewJobInfo,
    newJobMakeSugg, setNewJobMakeSugg,
    newJobInsDD, setNewJobInsDD,
    insSearch, setInsSearch,
    newJobErrors, setNewJobErrors,
    customerMatch, setCustomerMatch,
    newJobPhoto, setNewJobPhoto,
    customerRegistry,
    validateAndCreateJob,
    tt,
  } = useWorkshop()

  const nj = newJobInfo
  const er = newJobErrors
  const set = (k, v) => { setNewJobInfo(p => ({ ...p, [k]: v })); setNewJobErrors(p => { const n = { ...p }; delete n[k]; return n }) }
  const errBorder = k => er[k] ? `2px solid ${C.red}` : "none"

  return (
    <>
      <NavBar title="New Job" subtitle="Fill all details to create job" onBack={() => setScreen("home")} />
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Vehicle</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: er.vehicle_reg ? C.red : C.sub, marginBottom: 5, fontWeight: 500 }}>Vehicle Reg <span style={{ color: C.red }}>*</span></div>
          <input value={nj.vehicle_reg} onChange={e => {
            // Only allow letters then digits, auto-format: "XXX 1234"
            const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
            // Split into letters prefix and digits suffix
            const letters = raw.replace(/[0-9]/g, "").slice(0, 3)
            const digits = raw.replace(/[A-Z]/g, "").slice(0, 4)
            const formatted = digits ? `${letters} ${digits}` : letters
            set("vehicle_reg", formatted)
            // Lookup in registry
            const key = regSearchKey(formatted)
            if (key.length >= 5) {
              const match = customerRegistry.byReg[key]
              if (match) {
                setCustomerMatch(match)
                // Auto-fill make & model from registry
                if (match.vehicle_make && !nj.vehicle_make) set("vehicle_make", match.vehicle_make)
                if (match.vehicle_model && !nj.vehicle_model) set("vehicle_model", match.vehicle_model)
              } else { setCustomerMatch(null) }
            } else { setCustomerMatch(null) }
          }} placeholder="e.g. CBB 9636" autoComplete="off" style={{ ...inp, fontFamily: MONO, fontWeight: 700, fontSize: 22, border: errBorder("vehicle_reg") }} />
          {nj.vehicle_reg && !/^[A-Z]{2,3} \d{4}$/.test(nj.vehicle_reg.trim()) && nj.vehicle_reg.length > 2 && <div style={{ fontSize: 12, color: C.orange, marginTop: 4 }}>Format: 2-3 letters + 4 digits (e.g. CBB 5949)</div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 14, color: er.vehicle_make ? C.red : C.sub, marginBottom: 5, fontWeight: 500 }}>Make <span style={{ color: C.red }}>*</span></div>
            <input value={nj.vehicle_make} onChange={e => { set("vehicle_make", e.target.value); const q = e.target.value.toLowerCase(); setNewJobMakeSugg(q.length >= 1 ? VEHICLE_MAKES.filter(m => m.toLowerCase().includes(q)) : []) }} onFocus={() => { if (!nj.vehicle_make) setNewJobMakeSugg(VEHICLE_MAKES) }} onBlur={() => setTimeout(() => setNewJobMakeSugg([]), 200)} placeholder="e.g. Toyota" autoComplete="off" style={{ ...inp, border: errBorder("vehicle_make") }} />
            {newJobMakeSugg.length > 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, zIndex: 20, maxHeight: 200, overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", marginTop: 4 }}>
              {newJobMakeSugg.map(m => <div key={m} onMouseDown={() => { set("vehicle_make", m); setNewJobMakeSugg([]) }} style={{ padding: "14px 18px", fontSize: 17, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>{m}</div>)}
            </div>}
          </div>
          <div>
            <div style={{ fontSize: 14, color: er.vehicle_model ? C.red : C.sub, marginBottom: 5, fontWeight: 500 }}>Model <span style={{ color: C.red }}>*</span></div>
            <input value={nj.vehicle_model} onChange={e => set("vehicle_model", e.target.value)} placeholder="e.g. Aqua" autoComplete="off" style={{ ...inp, border: errBorder("vehicle_model") }} />
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Customer</div>
        {/* Customer match banner — auto-fills, user can change */}
        {customerMatch && <div style={{ padding: "12px 14px", background: C.green + "08", borderRadius: 12, border: `1px solid ${C.green}30`, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.green }}>✓ Returning vehicle found</span>
            <span onClick={() => {
              setNewJobInfo(p => ({ ...p, customer_name: customerMatch.customer_name, customer_phone: customerMatch.customer_phone, vehicle_make: customerMatch.vehicle_make, vehicle_model: customerMatch.vehicle_model }))
              setCustomerMatch(null); tt("✓ Customer details filled")
            }} style={{ fontSize: 14, fontWeight: 700, color: C.accent, cursor: "pointer", padding: "6px 14px", background: C.accent + "15", borderRadius: 8, minHeight: 36, display: "inline-flex", alignItems: "center" }}>Use Details</span>
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>{customerMatch.customer_name} · {customerMatch.customer_phone} · {customerMatch.vehicle_make} {customerMatch.vehicle_model}</div>
        </div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: er.customer_name ? C.red : C.sub, marginBottom: 5, fontWeight: 500 }}>Name <span style={{ color: C.red }}>*</span></div>
          <input value={nj.customer_name} onChange={e => set("customer_name", e.target.value)} placeholder="Customer name" autoComplete="off" style={{ ...inp, border: errBorder("customer_name") }} />
        </div>
        <div>
          <div style={{ fontSize: 14, color: er.customer_phone ? C.red : C.sub, marginBottom: 5, fontWeight: 500 }}>Phone <span style={{ color: C.red }}>*</span></div>
          <input value={nj.customer_phone} onChange={e => {
            const val = e.target.value.replace(/[^0-9\s\-]/g, "")
            set("customer_phone", val)
            // Lookup by phone
            const key = phoneSearchKey(val)
            if (key.length >= 9) {
              const match = customerRegistry.byPhone[key]
              if (match && !customerMatch) { setCustomerMatch(match) }
            }
          }} onBlur={() => {
            // Show normalized preview
            const ph = normalizePhone(nj.customer_phone)
            if (ph.valid && ph.normalized !== nj.customer_phone) set("customer_phone", ph.normalized)
          }} placeholder="07X XXXX XXX" autoComplete="off" style={{ ...inp, fontFamily: MONO, border: errBorder("customer_phone") }} />
          {er.phone_msg && <div style={{ fontSize: 12, color: C.red, marginTop: 4, fontWeight: 600 }}>⚠️ {er.phone_msg}</div>}
          {nj.customer_phone && !er.customer_phone && (() => { const ph = normalizePhone(nj.customer_phone); return ph.valid && ph.normalized !== nj.customer_phone ? <div style={{ fontSize: 12, color: C.accent, marginTop: 4 }}>→ {ph.normalized}</div> : null })()}
        </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: er.job_type ? C.red : C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Job Type <span style={{ color: C.red }}>*</span></div>
        {/* Toggle: Insurance / Non-Insurance / Quick */}
        <div style={{ display: "flex", gap: 0, marginBottom: 14, background: C.bg, borderRadius: 14, padding: 4 }}>
          {[{k:"insurance",l:"🛡️ Insurance",c:C.accent},{k:"direct",l:"💰 Non-Insurance",c:C.green},{k:"quick",l:"⚡ Quick",c:C.orange}].map(jt => <div key={jt.k} onClick={() => { setNewJobInfo(p => ({...p, job_type: jt.k, insurance_name: jt.k === "insurance" ? p.insurance_name || null : ""})); setNewJobErrors(p => { const n = { ...p }; delete n.job_type; delete n.insurance; if (jt.k === "quick") delete n.photo; return n }) }} style={{ flex: 1, textAlign: "center", padding: "12px 4px", borderRadius: 12, cursor: "pointer", background: nj.job_type === jt.k ? jt.c + "12" : "transparent", color: nj.job_type === jt.k ? jt.c : C.muted, fontSize: 15, fontWeight: 600, transition: "all 0.15s" }}>{jt.l}</div>)}
        </div>
        {/* Insurance company dropdown */}
        {nj.job_type === "insurance" && <div>
          <div style={{ fontSize: 14, color: er.insurance ? C.red : C.sub, marginBottom: 5, fontWeight: 500 }}>Insurance Company <span style={{ color: C.red }}>*</span></div>
          {nj.insurance_name && !newJobInsDD ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, ...inp, display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 600, color: C.accent }}>🛡️ {nj.insurance_name}</div>
            <button onClick={() => { setNewJobInsDD(true); setInsSearch("") }} style={{ ...btnSm(C.bg, C.accent), width: "auto", padding: "14px 16px" }}>Change</button>
          </div> : <div>
            <input value={insSearch} onChange={e => { setInsSearch(e.target.value); setNewJobInsDD(true) }} onFocus={() => setNewJobInsDD(true)} placeholder="Type to search... (e.g. Cey, SL)" style={{ ...inp, border: er.insurance ? `2px solid ${C.red}` : `2px solid ${C.accent}40`, background: C.card, fontSize: 18 }} autoFocus />
            {newJobInsDD && (() => { const q = insSearch.toLowerCase(); const filtered = INSURANCE_COMPANIES.filter(c => !q || c.toLowerCase().includes(q)); return filtered.length > 0 ? <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, maxHeight: 200, overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", marginTop: 6 }}>
              {filtered.map(c => <div key={c} onClick={() => { set("insurance_name", c); setNewJobInsDD(false); setInsSearch(""); setNewJobErrors(p => { const n = { ...p }; delete n.insurance; return n }) }} style={{ padding: "14px 18px", fontSize: 17, cursor: "pointer", borderBottom: `1px solid ${C.border}`, fontWeight: nj.insurance_name === c ? 600 : 400, color: nj.insurance_name === c ? C.accent : C.text }}>{c}</div>)}
            </div> : <div style={{ padding: "14px 18px", fontSize: 15, color: C.muted, textAlign: "center" }}>No match</div> })()}
          </div>}
        </div>}
        {nj.job_type === "direct" && <div style={{ padding: "12px 16px", background: C.green + "08", borderRadius: 12, border: `1px solid ${C.green}30` }}>
          <span style={{ fontSize: 15, color: C.green, fontWeight: 600 }}>💰 Non-insurance — estimate + full pipeline</span>
        </div>}
        {nj.job_type === "quick" && <div style={{ padding: "12px 16px", background: C.orange + "08", borderRadius: 12, border: `1px solid ${C.orange}30` }}>
          <span style={{ fontSize: 15, color: C.orange, fontWeight: 600 }}>⚡ Quick job — no estimate, no pipeline, no photo needed</span>
        </div>}
      </div>

      {/* Work Type */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Work Type</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[{k:"paint",l:"🎨 Paint & Body",c:C.orange},{k:"mechanical",l:"🔧 Mechanical",c:C.accent},{k:"both",l:"🎨+🔧 Both",c:C.purple}].map(w => <div key={w.k} onClick={() => setNewJobInfo(p => ({...p, work_type: w.k}))} style={{ flex: 1, padding: "14px 8px", textAlign: "center", borderRadius: 12, cursor: "pointer", background: nj.work_type === w.k ? w.c + "15" : C.bg, border: `2px solid ${nj.work_type === w.k ? w.c : C.border}`, color: nj.work_type === w.k ? w.c : C.muted, fontWeight: nj.work_type === w.k ? 700 : 500, fontSize: 14, transition: "all 0.15s" }}>{w.l}</div>)}
        </div>
      </div>

      {/* Vehicle Photo (mandatory for insurance + direct, optional for quick) */}
      {nj.job_type !== "quick" && <div style={{ ...card, border: er.photo ? `2px solid ${C.red}` : `1px solid ${C.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, marginBottom: 10 }}>📷 Vehicle Photo <span style={{ color: C.red }}>*</span></div>
        {newJobPhoto ? <div style={{ position: "relative" }}>
          <img src={newJobPhoto} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 14 }} alt="Vehicle" />
          <span onClick={() => setNewJobPhoto(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 20, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 }}>×</span>
          <div style={{ textAlign: "center", marginTop: 6, fontSize: 13, color: C.green, fontWeight: 600 }}>✓ Photo added</div>
        </div> : <div style={{ display: "flex", gap: 10 }}>
          <div onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment"; inp.onchange = async e => { const f = e.target.files?.[0]; if (f) { tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `new-job/${Date.now()}/vehicle.jpg`); setNewJobPhoto(url); setNewJobErrors(p => { const n = {...p}; delete n.photo; return n }); tt("📸 Photo added") } catch { tt("❌ Upload failed") } } }; inp.click() }} style={{ flex: 1, padding: "28px 0", textAlign: "center", border: `2px dashed ${er.photo ? C.red : C.border}`, borderRadius: 14, cursor: "pointer", color: er.photo ? C.red : C.muted }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>📷</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Camera</div>
          </div>
          <div onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = async e => { const f = e.target.files?.[0]; if (f) { tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `new-job/${Date.now()}/vehicle.jpg`); setNewJobPhoto(url); setNewJobErrors(p => { const n = {...p}; delete n.photo; return n }); tt("📸 Photo added") } catch { tt("❌ Upload failed") } } }; inp.click() }} style={{ flex: 1, padding: "28px 0", textAlign: "center", border: `2px dashed ${er.photo ? C.red : C.border}`, borderRadius: 14, cursor: "pointer", color: er.photo ? C.red : C.muted }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>🖼️</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Gallery</div>
          </div>
        </div>}
      </div>}

      <button onClick={validateAndCreateJob} style={{ ...btn(C.accent, "#fff"), marginTop: 8 }}>Create Job</button>
    </>
  )
}
