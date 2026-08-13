"use client"
import { useState, useEffect } from "react"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, card, NavBar, fmt } from "../WorkshopContext"

// Contractor running accounts: balance = work billed (job cost entries with a
// contractor) − payments made. Payments here are the ONLY place money to
// contractors is recorded — weekly bulk settlements just reduce the balance,
// nobody ever splits them across jobs.
export default function ContractorsScreen({ onBack }) {
  const { jobs, loadClosedJobs, contractorPayments, addContractorPayment, deleteContractorPayment, openPDF, esc, tt } = useWorkshop()
  useEffect(() => { if (loadClosedJobs) loadClosedJobs() }, [loadClosedJobs])

  const [sel, setSel] = useState(null)
  const [payAmt, setPayAmt] = useState("")
  const [payMethod, setPayMethod] = useState("cash")
  const [payNote, setPayNote] = useState("")
  const [confirmDel, setConfirmDel] = useState(null)

  // ── Build the ledger ──
  const workEntries = []
  ;(jobs || []).forEach(j => (j.jobCosts || []).forEach(c => {
    if (c.type === "outsource" && c.contractor) {
      workEntries.push({ id: c.id, contractor: c.contractor, amount: Number(c.cost) || 0, date: c.date || (j.created_at || "").slice(0, 10), jobNumber: j.jobNumber, category: c.category || "Work", kind: "work" })
    }
  }))
  const payEntries = (contractorPayments || []).map(p => ({ ...p, amount: Number(p.amount) || 0, kind: "pay" }))
  const names = [...new Set([...workEntries.map(w => w.contractor), ...payEntries.map(p => p.contractor)])].sort()
  const summary = names.map(n => {
    const work = workEntries.filter(x => x.contractor === n).reduce((s, x) => s + x.amount, 0)
    const paid = payEntries.filter(x => x.contractor === n).reduce((s, x) => s + x.amount, 0)
    return { name: n, work, paid, balance: work - paid }
  })
  const totalOwed = summary.reduce((s, x) => s + Math.max(0, x.balance), 0)

  const ledgerFor = (name) => [...workEntries.filter(x => x.contractor === name), ...payEntries.filter(x => x.contractor === name)]
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.kind === "work" ? -1 : 1))

  const recordPayment = () => {
    if (addContractorPayment({ contractor: sel, amount: payAmt, method: payMethod, note: payNote })) {
      setPayAmt(""); setPayNote("")
    }
  }

  const printStatement = (name) => {
    const rows = ledgerFor(name)
    let run = 0
    let html = ""
    rows.forEach(r => {
      run += r.kind === "work" ? r.amount : -r.amount
      html += "<tr><td>" + (r.date || "—") + "</td><td>" + (r.kind === "work"
        ? esc(`${r.jobNumber || ""} ${r.category}`.trim())
        : esc(`Payment (${r.method})${r.note ? " — " + r.note : ""}`)) + "</td><td class=\"text-right mono\">" + (r.kind === "work" ? "+" : "−") + "Rs." + r.amount.toLocaleString() + "</td><td class=\"text-right mono bold\">Rs." + run.toLocaleString() + "</td></tr>"
    })
    const bal = summary.find(x => x.name === name)?.balance || 0
    html += "<tr class=\"total-row\"><td colspan=\"3\" class=\"text-right\" style=\"font-size:15px\">" + (bal >= 0 ? "BALANCE WE OWE" : "ADVANCE HELD BY CONTRACTOR") + "</td><td class=\"text-right mono\" style=\"font-size:15px\">Rs." + Math.abs(bal).toLocaleString() + "</td></tr>"
    const doc = "<div class=\"header\"><div><div class=\"shop-name\">MacForce Auto Engineering</div><div class=\"shop-detail\">Workshop — Contractor Statement</div></div><div><div class=\"doc-title\">STATEMENT</div><div class=\"doc-sub\">" + esc(name) + "</div><div class=\"doc-sub\">" + new Date().toLocaleDateString() + "</div></div></div><table><thead><tr><th>Date</th><th>Description</th><th class=\"text-right\">Amount</th><th class=\"text-right\">Balance</th></tr></thead><tbody>" + html + "</tbody></table><div class=\"stamp\"><div class=\"stamp-box\"><div class=\"stamp-line\">MacForce Auto Engineering</div></div><div class=\"stamp-box\"><div class=\"stamp-line\">" + esc(name) + "</div></div></div>"
    openPDF("Statement - " + name, doc)
  }

  // ── Detail view ──
  if (sel) {
    const s = summary.find(x => x.name === sel) || { work: 0, paid: 0, balance: 0 }
    const rows = ledgerFor(sel)
    let run = 0
    return (
      <div>
        <NavBar title={sel} subtitle="Contractor account" onBack={() => setSel(null)} right={<button onClick={() => printStatement(sel)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: C.purple, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>📄 Statement</button>} />
        <div style={{ ...card, display: "flex", justifyContent: "space-between", textAlign: "center" }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>WORK BILLED</div><div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700 }}>Rs.{fmt(s.work)}</div></div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>PAID</div><div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: C.green }}>Rs.{fmt(s.paid)}</div></div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{s.balance >= 0 ? "WE OWE" : "ADVANCE HELD"}</div><div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 800, color: s.balance > 0 ? C.orange : C.accent }}>Rs.{fmt(Math.abs(s.balance))}</div></div>
        </div>

        {/* Record payment / advance */}
        <div style={{ ...card, padding: "14px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>💸 Record Payment / Advance</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input type="number" inputMode="numeric" min="0" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="Amount Rs." style={{ ...inp, flex: 1, fontFamily: MONO, fontWeight: 700 }} />
            {["cash", "bank"].map(m => <div key={m} onClick={() => setPayMethod(m)} style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, background: payMethod === m ? (m === "cash" ? C.green : C.accent) : "#fff", color: payMethod === m ? "#fff" : C.sub, border: `2px solid ${payMethod === m ? (m === "cash" ? C.green : C.accent) : C.border}` }}>{m === "cash" ? "💵 Cash" : "🏦 Bank"}</div>)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note (e.g. weekly settlement, advance for JOB-014)" style={{ ...inp, flex: 1 }} />
            <button onClick={recordPayment} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Pay</button>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Cash payments appear in that day's Cash Book automatically. An advance simply makes the balance negative until work catches up.</div>
        </div>

        {/* Ledger */}
        <div style={{ ...card, padding: "14px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Ledger</div>
          {rows.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>Nothing recorded yet</div> : rows.map(r => {
            run += r.kind === "work" ? r.amount : -r.amount
            return (
              <div key={r.kind + r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{r.kind === "work" ? `${r.jobNumber || "Job"} · ${r.category}` : `Payment (${r.method})${r.note ? " — " + r.note : ""}`}</span>
                  <div style={{ fontSize: 12, color: C.muted }}>{r.date || "—"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: r.kind === "work" ? C.orange : C.green }}>{r.kind === "work" ? "+" : "−"}Rs.{fmt(r.amount)}</span>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: MONO }}>bal {run < 0 ? "−" : ""}Rs.{fmt(Math.abs(run))}</div>
                  </div>
                  {r.kind === "pay" && <span onClick={() => { if (confirmDel !== r.id) { setConfirmDel(r.id); setTimeout(() => setConfirmDel(c => c === r.id ? null : c), 3000); return } deleteContractorPayment(r.id); setConfirmDel(null); tt("Payment removed") }} style={{ fontSize: confirmDel === r.id ? 12 : 16, color: C.red, cursor: "pointer", opacity: confirmDel === r.id ? 1 : 0.4, fontWeight: confirmDel === r.id ? 700 : 400, minWidth: 30, textAlign: "center" }}>{confirmDel === r.id ? "Del?" : "×"}</span>}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 4 }}>Work entries are added on each job (Costs &amp; Profit). Delete them there if wrong.</div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div>
      <NavBar title="Contractors" subtitle={totalOwed > 0 ? `Rs.${fmt(totalOwed)} owed in total` : "All settled"} onBack={onBack} />
      {summary.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: C.muted, fontSize: 14, padding: 30 }}>
          No contractors yet.<br /><span style={{ fontSize: 12 }}>Add a Sub-contract cost on any job (Costs &amp; Profit section) and the contractor appears here.</span>
        </div>
      ) : summary.map(s => (
        <div key={s.name} onClick={() => setSel(s.name)} style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: C.muted }}>Work Rs.{fmt(s.work)} · Paid Rs.{fmt(s.paid)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 800, color: s.balance > 0 ? C.orange : s.balance < 0 ? C.accent : C.green }}>{s.balance < 0 ? "−" : ""}Rs.{fmt(Math.abs(s.balance))}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{s.balance > 0 ? "we owe" : s.balance < 0 ? "advance held" : "settled"}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
