"use client"
import { useState, useRef, useEffect } from "react"
import { WorkshopProvider, useWorkshop, C, FONT, MONO, btn, btnSm, inp, card, pill, Sheet, NavBar, ALL_STAGES, fmt, regSearchKey, phoneSearchKey, phoneIntl, SP, Icon, IconBadge } from "./WorkshopContext"
import { useAuth } from "./AuthGate"
import { uploadPhoto, deletePhoto, compressForPreview } from "./supabase"
import SecureImg from "./SecureImg"
import UserManagement from "./screens/UserManagement"
import ContractorsScreen from "./screens/ContractorsScreen"
import { ClosedHistory, ClosedJobDetail } from "./screens/HomeScreen"
import NewJobScreen from "./screens/NewJobScreen"
import JobScreen from "./screens/JobScreen"
import EstimateParts from "./screens/EstimateParts"
import EstimateCat from "./screens/EstimateCat"
import EstimateReview from "./screens/EstimateReview"
import ApprovalUpload from "./screens/ApprovalUpload"
import ApprovalEntry from "./screens/ApprovalEntry"
import ApprovalSummary from "./screens/ApprovalSummary"
import InvoiceDetail from "./screens/InvoiceDetail"
import StoreScreen from "./screens/StoreScreen"

// ── Local date helper (avoids UTC timezone bug) ──
function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Convert any date/ISO string to local date-only string
function toLocalDate(iso) {
  if (!iso) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso // already date-only
  try { return localDateStr(new Date(iso)) } catch { return "" }
}

function num(v) { const n = Number(v); return isFinite(n) ? n : 0 }
function entryId() { return "exp_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6) }

// ── Money moved vs money spent ───────────────────────────────────────────────
// Three buttons, three meanings, and the app never blurs them:
//
//   Money In    owner puts cash in · cash drawn from the bank   drawer ↑  profit —
//   Money Out   the day's cash banked · handed to the owner     drawer ↓  profit —
//   Expense     money actually spent running the workshop       drawer ↓  profit ↓
//
// Moving money between the owner's pocket, the till and the bank earns nothing
// and spends nothing, so it must never reach profit. Owner drawings used to be
// reachable BOTH as an expense category and as a transfer — the same act, with
// opposite effects on the month's figure depending on which door was used. It
// is a movement, and only a movement.
const MOVE_TYPES = [
  { v: "o2c", dir: "in",  icon: "👤", l: "From owner", d: "Owner's own money into the till" },
  { v: "b2c", dir: "in",  icon: "🏦", l: "From bank",  d: "Cash drawn from the business account" },
  { v: "c2b", dir: "out", icon: "🏦", l: "To bank",    d: "Banking the day's takings" },
  { v: "c2o", dir: "out", icon: "👤", l: "To owner",   d: "Drawings / excess cash handed over" },
]
const MOVE_LABEL = { o2c: "Owner put money in", b2c: "Drawn from bank", c2b: "Banked to account", c2o: "Given to owner" }
const MOVE_ICON = { o2c: "👤→💵", b2c: "🏦→💵", c2b: "💵→🏦", c2o: "💵→👤" }
const isMovementEntry = (e) => e.category === "transfer" || e.category === "capital"
const isMoveIn = (e) => e.direction === "o2c" || e.direction === "b2c"

// What the operator picks for a real expense. "Owner Drawings" is deliberately
// absent — it is Money Out → To owner. Legacy rows keep their label below.
const EXP_CATEGORIES = [
  { key: "food", label: "🍽 Food" },
  { key: "utility", label: "💡 Utility" },
  { key: "transport", label: "🚗 Transport" },
  { key: "salary", label: "👷 Salary" },
  { key: "advance", label: "🤝 Staff Advance" },
  { key: "other", label: "📦 Other" },
]
const EXP_LABEL = {
  ...Object.fromEntries(EXP_CATEGORIES.map(c => [c.key, c.label])),
  drawings: "💼 Owner Drawings",
}

// Shared shell so all three money forms look and behave identically. A bottom
// sheet, not a centered dialog — thumbs live at the bottom of the phone.
function MoneySheet({ title, sub, accent, onClose, onSave, saveLabel, saveDisabled, children }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <style>{`@keyframes wpSheetUp { from { transform: translateY(48px); opacity: .4 } to { transform: translateY(0); opacity: 1 } }`}</style>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "22px 22px 0 0", padding: "10px 20px 24px", maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", animation: "wpSheetUp .22s ease-out", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: "0 auto 14px" }} />
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.3px" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.muted, margin: "3px 0 16px", lineHeight: 1.45 }}>{sub}</div>
        {children}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", color: C.sub, fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: FONT }}>Cancel</button>
          <button onClick={onSave} disabled={saveDisabled} style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: saveDisabled ? C.border : accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: saveDisabled ? "not-allowed" : "pointer", fontFamily: FONT, boxShadow: saveDisabled ? "none" : `0 4px 14px ${accent}50`, transition: "all .15s ease" }}>{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}

// Big money field with the Rs. prefix — the centrepiece of every sheet.
function AmountField({ value, onChange, autoFocus }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 17, fontWeight: 700, color: C.muted }}>Rs.</span>
      <input type="number" inputMode="numeric" min="0" value={value} autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)} placeholder="0"
        style={{ ...inp, paddingLeft: 52, fontSize: 24, fontFamily: MONO, fontWeight: 700, padding: "14px 16px 14px 52px" }} />
    </div>
  )
}

// Money in / money out of the till. Never income, never an expense.
function MoneyModal({ dir, viewDate, today, drawerExpected, movements, onClose, onSave, tt }) {
  const opts = MOVE_TYPES.filter(t => t.dir === dir)
  const [type, setType] = useState(opts[0].v)
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(viewDate)
  const [note, setNote] = useState("")
  const amt = num(amount)
  const accent = dir === "in" ? C.green : C.orange

  const save = () => {
    if (amt <= 0) { tt("⚠️ Enter the amount"); return }
    // Guardrail 1 — taking out more than the drawer holds is nearly always a
    // typo. Checked against the day's CALCULATED balance, not the opening float.
    if (dir === "out" && date === today && drawerExpected != null && amt > drawerExpected) {
      if (!confirm(`The drawer only holds Rs.${drawerExpected.toLocaleString()} right now — taking out Rs.${amt.toLocaleString()} would leave it negative.\n\nRecord anyway?`)) return
    }
    // Guardrail 2 — the same movement twice on one day is nearly always a
    // double entry (two people recording the same deposit).
    if ((movements || []).some(m => m.direction === type && num(m.amount) === amt && m.date === date)) {
      if (!confirm(`${MOVE_LABEL[type]} of Rs.${amt.toLocaleString()} is already recorded on this day.\n\nRecord it a second time?`)) return
    }
    onSave({ direction: type, amount: amt, date, note: note.trim() })
  }

  return (
    <MoneySheet
      title={dir === "in" ? "⬆ Money into the till" : "⬇ Money out of the till"}
      sub={(dir === "in" ? "Not a sale — " : "Not an expense — ") + "the drawer count follows it, profit never sees it."}
      accent={accent} onClose={onClose} onSave={save}
      saveLabel="✓ Record" saveDisabled={amt <= 0}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {opts.map(t => (
          <div key={t.v} onClick={() => setType(t.v)} style={{
            padding: "12px 10px", borderRadius: 12, cursor: "pointer",
            background: type === t.v ? accent + "12" : C.bg,
            border: `1.5px solid ${type === t.v ? accent : C.border}`,
          }}>
            <div style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: type === t.v ? accent : C.sub }}>{t.l}</div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.3, marginTop: 2 }}>{t.d}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Amount</div>
      <AmountField value={amount} onChange={setAmount} autoFocus />
      {amt > 0 && (
        <div style={{ fontSize: 12, fontWeight: 600, color: accent, marginTop: 8, lineHeight: 1.4 }}>
          {MOVE_LABEL[type]} — the drawer will expect Rs.{amt.toLocaleString()} {dir === "in" ? "more" : "less"}. Profit is untouched.
        </div>
      )}

      <div style={{ fontSize: 12, color: C.muted, margin: "12px 0 4px" }}>Date</div>
      <input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, fontSize: 14 }} />
      <div style={{ fontSize: 12, color: C.muted, margin: "12px 0 4px" }}>Note (optional)</div>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. daily deposit" style={{ ...inp, fontSize: 14 }} />
    </MoneySheet>
  )
}

// A real cost — this one DOES reduce profit.
function ExpenseModal({ viewDate, today, drawerExpected, onClose, onSave, tt }) {
  const [cat, setCat] = useState("food")
  const [desc, setDesc] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(viewDate)
  const amt = num(amount)

  const save = () => {
    if (!desc.trim()) { tt("⚠️ What was the money spent on?"); return }
    if (amt <= 0) { tt("⚠️ Enter the amount"); return }
    if (date === today && drawerExpected != null && amt > drawerExpected) {
      if (!confirm(`This expense (Rs.${amt.toLocaleString()}) is more than the drawer holds (Rs.${drawerExpected.toLocaleString()}).\n\nNew balance would be Rs.${(drawerExpected - amt).toLocaleString()}.\n\nRecord anyway?`)) return
    }
    onSave({ description: desc.trim(), amount: amt, category: cat, date })
  }

  return (
    <MoneySheet
      title="🧾 Expense"
      sub="Money actually spent running the workshop — food, fuel, bills, wages. This reduces profit."
      accent={C.red} onClose={onClose} onSave={save}
      saveLabel="✓ Add expense" saveDisabled={!desc.trim() || amt <= 0}
    >
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>What was it for?</div>
      <input value={desc} autoFocus onChange={e => setDesc(e.target.value)} placeholder="e.g. lunch for the crew"
        style={{ ...inp, fontSize: 15, padding: "12px 14px", marginBottom: 12 }} />

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Category</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
        {EXP_CATEGORIES.map(c => (
          <div key={c.key} onClick={() => setCat(c.key)} style={{
            padding: "10px 4px", borderRadius: 10, textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: cat === c.key ? C.red + "12" : C.bg,
            color: cat === c.key ? C.red : C.sub,
            border: `1.5px solid ${cat === c.key ? C.red : C.border}`,
          }}>{c.label}</div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Amount</div>
      <AmountField value={amount} onChange={setAmount} />

      <div style={{ fontSize: 12, color: C.muted, margin: "12px 0 4px" }}>Date</div>
      <input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, fontSize: 14 }} />
    </MoneySheet>
  )
}

function CashBookScreen({ cashBook, setCashBook, grns, setGrns, jobs, loadClosedJobs, tt, onBack }) {
  const { contractorPayments, openPDF, esc } = useWorkshop()
  const [tab, setTab] = useState("cash") // cash | bank | history
  // Load closed jobs on mount so late payments on closed jobs appear in cashbook
  useEffect(() => { if (loadClosedJobs) loadClosedJobs() }, [loadClosedJobs])
  const [viewDate, setViewDate] = useState(localDateStr()) // the date being viewed
  // One piece of state for all three money forms: "in" | "out" | "expense" | null
  const [moneyModal, setMoneyModal] = useState(null)
  const [countAmt, setCountAmt] = useState("")
  const [countNote, setCountNote] = useState("")
  const [editingBank, setEditingBank] = useState(false)
  const [bankBal, setBankBal] = useState(String(num(cashBook.bankBalance)))
  const [openingCash, setOpeningCash] = useState(String(num(cashBook.openingCash)))
  const [editingOpening, setEditingOpening] = useState(false)
  const [editingCount, setEditingCount] = useState(false)

  // Refresh "today" every minute to catch midnight rollover
  const [today, setTodayState] = useState(localDateStr())
  useEffect(() => {
    const timer = setInterval(() => {
      const d = localDateStr()
      if (d !== today) setTodayState(d)
    }, 60000)
    return () => clearInterval(timer)
  }, [today])

  const isToday = viewDate === today
  const isPast = viewDate < today

  // ── Compute cash income for a given date ──
  function computeIncome(date) {
    const items = []
    const seen = new Set() // dedupe by payment id
    ;(jobs || []).forEach(j => {
      ;(j.invoices || []).forEach(inv => {
        // Use payments[] first; fall back to split arrays if payments[] empty
        const pays = (inv.payments?.length ? inv.payments : [...(inv.insurance_payments || []), ...(inv.customer_payments || [])])
        pays.forEach(p => {
          if (!p || !p.date) return
          if (p.advance_id) return // advance applied to invoice — already counted as income on the day it was taken
          const pid = p.id || `${p.date}_${p.amount}_${p.type}`
          if (seen.has(pid)) return
          if (toLocalDate(p.date) !== date) return
          if (p.method === "cash") {
            items.push({ id: pid, desc: `${j.jobInfo?.vehicle_reg || "Job"} — ${p.type || "payment"}`, amount: num(p.amount), method: "cash" })
            seen.add(pid)
          } else if (p.method === "bank_transfer" || p.method === "bank" || p.method === "online") {
            items.push({ id: pid, desc: `${j.jobInfo?.vehicle_reg || "Job"} — ${p.type || "payment"}${p.method === "online" ? " (online)" : ""}`, amount: num(p.amount), method: "bank" })
            seen.add(pid)
          } else if (p.method === "cheque") {
            items.push({ id: pid, desc: `${j.jobInfo?.vehicle_reg || "Job"} — ${p.type || "payment"}`, amount: num(p.amount), method: "cheque", chequeNo: p.reference })
            seen.add(pid)
          }
        })
      })
      // Advance payments taken before invoicing
      ;(j.advances || []).forEach(a => {
        if (!a || !a.date || seen.has(a.id)) return
        if (toLocalDate(a.date) !== date) return
        const m = a.method === "cash" ? "cash" : a.method === "cheque" ? "cheque" : "bank"
        items.push({ id: a.id, desc: `${j.jobInfo?.vehicle_reg || "Job"} — advance`, amount: num(a.amount), method: m, chequeNo: a.note })
        seen.add(a.id)
      })
    })
    return items
  }

  // ── Compute expenses for a given date ──
  function computeExpenses(date) {
    const items = []
    grns.forEach(g => {
      if (!g.paid || !g.paymentDate) return
      if (toLocalDate(g.paymentDate) !== date) return
      items.push({
        id: g.id, desc: `${g.grnNumber} — ${g.supplier}`,
        amount: num(g.paymentAmount || g.totalAmount),
        method: g.paymentMethod, grnId: g.id,
        chequeDate: g.chequeDate
      })
    })
    // Contractor payments (sub-contract settlements/advances) hit the drawer/bank
    ;(contractorPayments || []).forEach(p => {
      if (p.date !== date) return
      items.push({
        id: p.id, desc: `Contractor — ${p.contractor}${p.note ? ` (${p.note})` : ""}`,
        amount: num(p.amount), method: p.method === "bank" ? "bank" : "cash",
      })
    })
    return items
  }

  const dayIncome = computeIncome(viewDate)
  const dayExpenses = computeExpenses(viewDate)
  const dayMisc = (cashBook.miscExpenses || []).filter(e => e.date === viewDate)

  const cashIn = dayIncome.filter(i => i.method === "cash")
  const cashOut = dayExpenses.filter(e => e.method === "cash")
  const bankIn = dayIncome.filter(i => i.method === "bank")
  const bankOut = dayExpenses.filter(e => e.method === "bank")

  const totalCashIn = cashIn.reduce((s, i) => s + i.amount, 0)
  const totalCashOut = cashOut.reduce((s, e) => s + e.amount, 0)
  // Cash↔bank and owner movements are MOVEMENTS, not expenses: a cash→bank
  // deposit is cash out of the drawer, a bank→cash withdrawal is cash into it.
  // They change what the drawer should hold and nothing else — so they get
  // their own list on screen and never sit inside the Expenses total.
  const plainMisc = dayMisc.filter(e => !isMovementEntry(e))
  const dayMovements = dayMisc.filter(isMovementEntry)
  const transferOut = dayMovements.filter(e => !isMoveIn(e)).reduce((s, e) => s + num(e.amount), 0)
  const transferIn = dayMovements.filter(isMoveIn).reduce((s, e) => s + num(e.amount), 0)
  const totalMisc = plainMisc.reduce((s, e) => s + num(e.amount), 0)
  // What the workshop actually spent — the figure that reduces profit.
  const totalSpent = totalCashOut + totalMisc
  // Everything that left the drawer, spending and movements alike. Drawer
  // arithmetic only; it is not a cost figure.
  const totalExpenses = totalSpent + transferOut
  const allMovements = (cashBook.miscExpenses || []).filter(isMovementEntry)

  // Opening cash: openingCash in cashBook is always for TODAY at start
  // For historical dates, we use the stored dailyCounts to reconstruct
  const prevCount = (cashBook.dailyCounts || []).filter(c => c.date < viewDate).sort((a, b) => b.date.localeCompare(a.date))[0]
  const prevBalance = isToday ? num(cashBook.openingCash) : (prevCount ? num(prevCount.actualCash) : 0)
  const calculatedBalance = prevBalance + totalCashIn + transferIn - totalExpenses

  // Today's cash count
  const dayCount = (cashBook.dailyCounts || []).find(c => c.date === viewDate)
  const cashDiff = dayCount ? num(dayCount.actualCash) - calculatedBalance : null

  // Cheques count as paid the day they're written (owner decision) — no
  // pending/cleared tracking, and the app does not mirror the bank account.

  // ── Writing to the book ──
  // One append for both kinds of entry; what separates them is the category,
  // and that single field is what every report keys off.
  const addEntry = (entry) => {
    setCashBook(prev => ({ ...prev, miscExpenses: [...(prev.miscExpenses || []), { id: entryId(), ...entry }] }))
    setMoneyModal(null)
  }

  const saveExpense = ({ description, amount, category, date }) => {
    addEntry({ date, description, amount, category })
    tt(`✓ Expense added — Rs.${amount.toLocaleString()}`)
  }

  const saveMovement = ({ direction, amount, date, note }) => {
    const isOwner = direction === "o2c" || direction === "c2o"
    addEntry({
      date, amount,
      description: `${MOVE_LABEL[direction]}${note ? ": " + note : ""}`,
      // "capital" is the owner's own money; "transfer" is the bank. Both are
      // movements — the drawer follows them, profit never sees them.
      category: isOwner ? "capital" : "transfer",
      direction,
    })
    tt(`✓ ${MOVE_LABEL[direction]} — Rs.${amount.toLocaleString()}`)
  }

  const deleteMisc = (id, desc) => {
    const entry = (cashBook.miscExpenses || []).find(e => e.id === id)
    const movement = entry ? isMovementEntry(entry) : false
    if (!confirm(`Delete ${movement ? "movement" : "expense"} "${desc}"?`)) return
    setCashBook(prev => ({ ...prev, miscExpenses: (prev.miscExpenses || []).filter(e => e.id !== id) }))
    tt(movement ? "Movement removed" : "Expense removed")
  }

  // ── Save cash count (does NOT overwrite openingCash) ──
  const saveCashCount = () => {
    if (countAmt === "" || countAmt == null) { tt("⚠️ Enter actual cash"); return }
    const amt = num(countAmt)
    if (amt < 0) { tt("⚠️ Cash cannot be negative"); return }
    const count = { date: viewDate, actualCash: amt, note: countNote, timestamp: new Date().toISOString() }
    setCashBook(prev => ({
      ...prev,
      dailyCounts: [...(prev.dailyCounts || []).filter(c => c.date !== viewDate), count],
    }))
    setCountAmt(""); setCountNote(""); setEditingCount(false)
    tt("✓ Cash count saved")
  }

  // ── Close Day: carries today's calculated balance to tomorrow's opening ──
  const closeDay = () => {
    if (!dayCount) { tt("⚠️ Save cash count first"); return }
    if (cashDiff !== 0 && !confirm(`Cash is ${cashDiff > 0 ? "+" : ""}${cashDiff.toLocaleString()} off. Close day anyway?`)) return
    setCashBook(prev => ({ ...prev, openingCash: num(dayCount.actualCash), lastClosedDate: viewDate }))
    tt("✓ Day closed. Opening balance updated for tomorrow.")
  }
  // Days since the last close (Colombo dates): stale opening cash makes every
  // count look "off" — tell the user instead of letting them distrust the numbers
  const staleClose = (() => {
    if (!isToday || !cashBook.lastClosedDate) return null
    const yesterday = localDateStr(new Date(Date.now() - 86400000))
    return cashBook.lastClosedDate < yesterday ? cashBook.lastClosedDate : null
  })()

  // ── Report PDFs (owner downloads → attaches on WhatsApp) ──
  const officialsWhere = (pred) => {
    const out = []
    ;(jobs || []).forEach(j => (j.invoices || []).forEach(inv => {
      const o = inv.official
      if (o && o.issuedAt && pred(toLocalDate(o.issuedAt))) out.push({ o, j })
    }))
    return out
  }

  const generateDailyPDF = () => {
    const expAll = [
      ...dayExpenses.map(e => ({ desc: e.desc, method: e.method || "cash", amount: e.amount })),
      ...plainMisc.map(e => ({ desc: e.description, method: "cash", amount: num(e.amount) })),
    ]
    const offs = officialsWhere(d => d === viewDate)
    const totalInc = dayIncome.reduce((s, i) => s + i.amount, 0)
    const totalExp = expAll.reduce((s, e) => s + e.amount, 0)
    const newJobs = (jobs || []).filter(j => toLocalDate(j.created_at) === viewDate).length
    const activeJobs = (jobs || []).filter(j => !j.onHold && j.stage !== "closed" && j.stage !== "cancelled").length
    const sec = (title) => `<tr><td colspan="3" style="background:#f4f4f4;font-weight:700;padding:8px 12px">${title}</td></tr>`
    let rows = ""
    rows += sec("💰 Income — Rs." + totalInc.toLocaleString())
    rows += dayIncome.length ? dayIncome.map(i => `<tr><td>${esc(i.desc)}</td><td class="text-center">${esc(i.method)}</td><td class="text-right mono">Rs.${i.amount.toLocaleString()}</td></tr>`).join("") : `<tr><td colspan="3" style="color:#999">No income recorded</td></tr>`
    rows += sec("🧾 Official documents issued — " + offs.length)
    rows += offs.length ? offs.map(({ o, j }) => `<tr><td class="mono">${esc(o.serial)}</td><td>${esc((j.jobNumber || "") + " " + (j.jobInfo?.vehicle_reg || ""))}</td><td class="text-right mono">Rs.${num(o.total).toLocaleString()}</td></tr>`).join("") : `<tr><td colspan="3" style="color:#999">None</td></tr>`
    rows += sec("📤 Expenses — Rs." + totalExp.toLocaleString())
    rows += expAll.length ? expAll.map(e => `<tr><td>${esc(e.desc)}</td><td class="text-center">${esc(e.method)}</td><td class="text-right mono">Rs.${e.amount.toLocaleString()}</td></tr>`).join("") : `<tr><td colspan="3" style="color:#999">No expenses</td></tr>`
    // Movements are listed in full, not just totalled. The owner reads this
    // report — an entry claiming cash was handed over has to be visible here.
    if (dayMovements.length) {
      rows += sec("🔁 Money moved — not income, not an expense")
      rows += dayMovements.map(m => `<tr><td>${esc(m.description)}</td><td class="text-center">${esc(MOVE_ICON[m.direction] || "")}</td><td class="text-right mono">${isMoveIn(m) ? "+" : "−"}Rs.${num(m.amount).toLocaleString()}</td></tr>`).join("")
    }
    rows += sec("💵 Cash Drawer")
    rows += `<tr><td colspan="2">Opening cash</td><td class="text-right mono">Rs.${prevBalance.toLocaleString()}</td></tr>`
    rows += `<tr><td colspan="2">+ Cash income</td><td class="text-right mono">Rs.${totalCashIn.toLocaleString()}</td></tr>`
    if (transferIn > 0) rows += `<tr><td colspan="2">+ Bank → cash transfers</td><td class="text-right mono">Rs.${transferIn.toLocaleString()}</td></tr>`
    rows += `<tr><td colspan="2">− Cash out (expenses${transferOut > 0 ? " + deposits" : ""})</td><td class="text-right mono">Rs.${(totalExpenses).toLocaleString()}</td></tr>`
    rows += `<tr class="total-row"><td colspan="2">EXPECTED IN DRAWER</td><td class="text-right mono">Rs.${calculatedBalance.toLocaleString()}</td></tr>`
    rows += `<tr><td colspan="2">Counted</td><td class="text-right mono">${dayCount ? "Rs." + num(dayCount.actualCash).toLocaleString() : "— not counted —"}</td></tr>`
    if (dayCount) rows += `<tr><td colspan="2" style="font-weight:700;color:${cashDiff === 0 ? "#2e7d32" : "#e53935"}">Variance</td><td class="text-right mono" style="font-weight:700;color:${cashDiff === 0 ? "#2e7d32" : "#e53935"}">${cashDiff > 0 ? "+" : ""}Rs.${cashDiff.toLocaleString()}</td></tr>`
    rows += sec("🚗 Jobs")
    rows += `<tr><td colspan="2">New jobs today</td><td class="text-right mono">${newJobs}</td></tr>`
    rows += `<tr><td colspan="2">Currently active</td><td class="text-right mono">${activeJobs}</td></tr>`
    const dateLabel = new Date(viewDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    const html = `<div class="header"><div><div class="shop-name">MacForce Auto Engineering</div><div class="shop-detail">Workshop Daily Report</div></div><div><div class="doc-title">DAILY REPORT</div><div class="doc-sub">${dateLabel}</div></div></div><table><tbody>${rows}</tbody></table><div class="footer"><span>Workshop Pulse</span><span>Generated ${new Date().toLocaleString()}</span></div>`
    openPDF("Workshop Daily " + viewDate, html)
  }

  const generateMonthlyPDF = () => {
    const month = viewDate.slice(0, 7)
    const monthLabel = new Date(month + "-01T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    // Revenue: official documents issued this month (tax invoices at NET — the
    // VAT belongs to IRD, not profit) + internal invoices with no official doc
    const offs = officialsWhere(d => d.slice(0, 7) === month)
    let revTax = 0, revRcp = 0
    const offRows = offs.map(({ o, j }) => {
      const val = o.docType === "tax_invoice" ? num(o.net) : num(o.total)
      if (o.docType === "tax_invoice") revTax += val; else revRcp += val
      return `<tr><td class="mono">${esc(o.serial)}</td><td>${esc(j.jobNumber || "")}</td><td class="text-center">${o.docType === "tax_invoice" ? "Tax Invoice (net)" : "Receipt"}</td><td class="text-right mono">Rs.${val.toLocaleString()}</td></tr>`
    }).join("")
    let revInternal = 0
    ;(jobs || []).forEach(j => (j.invoices || []).forEach(inv => {
      if (inv.official) return
      if (toLocalDate(inv.created_at).slice(0, 7) !== month) return
      const t = (inv.items || []).reduce((s, i) => s + i.qty * i.unit_price, 0) - num(inv.discount) - num(inv.customer_discount)
      revInternal += Math.max(0, t)
    }))
    const revenue = revTax + revRcp + revInternal
    // Collected: actual money in across the month
    const days = []
    { const d = new Date(month + "-01T00:00:00"); while (localDateStr(d).slice(0, 7) === month) { days.push(localDateStr(d)); d.setDate(d.getDate() + 1) } }
    const collected = days.reduce((s, day) => s + computeIncome(day).reduce((x, i) => x + i.amount, 0), 0)
    // Costs
    let costParts = 0, costSub = 0
    ;(jobs || []).forEach(j => (j.jobCosts || []).forEach(c => {
      if (c.type === "labour") return
      const d = c.date || toLocalDate(j.created_at)
      if ((d || "").slice(0, 7) !== month) return
      if (c.type === "outsource") costSub += num(c.cost); else costParts += num(c.cost)
    }))
    const costGrn = grns.filter(g => toLocalDate(g.receivedDate).slice(0, 7) === month).reduce((s, g) => s + num(g.totalAmount), 0)
    // Transfers move money between pockets; capital is the owner's money in or
    // out. Neither is a cost, so the monthly profit never sees them.
    const costMisc = (cashBook.miscExpenses || []).filter(e => e.category !== "transfer" && e.category !== "capital" && (e.date || "").slice(0, 7) === month).reduce((s, e) => s + num(e.amount), 0)
    const totalCosts = costParts + costSub + costGrn + costMisc
    const profit = revenue - totalCosts
    let rows = ""
    const sec = (t) => `<tr><td colspan="4" style="background:#f4f4f4;font-weight:700;padding:8px 12px">${t}</td></tr>`
    rows += sec("Revenue — Rs." + revenue.toLocaleString())
    rows += offRows || ""
    if (revInternal > 0) rows += `<tr><td colspan="3">Internal invoices (no official document yet)</td><td class="text-right mono">Rs.${revInternal.toLocaleString()}</td></tr>`
    if (!offRows && revInternal === 0) rows += `<tr><td colspan="4" style="color:#999">No invoices this month</td></tr>`
    rows += `<tr><td colspan="3" style="color:#666">Money actually collected this month (all methods)</td><td class="text-right mono" style="color:#666">Rs.${collected.toLocaleString()}</td></tr>`
    rows += sec("Costs — Rs." + totalCosts.toLocaleString())
    rows += `<tr><td colspan="3">Sub-contracted work (painting, denting, glass…)</td><td class="text-right mono">Rs.${costSub.toLocaleString()}</td></tr>`
    rows += `<tr><td colspan="3">Parts &amp; materials bought for jobs</td><td class="text-right mono">Rs.${costParts.toLocaleString()}</td></tr>`
    rows += `<tr><td colspan="3">Store purchases (paint, consumables — GRNs)</td><td class="text-right mono">Rs.${costGrn.toLocaleString()}</td></tr>`
    rows += `<tr><td colspan="3">Other expenses (cash book)</td><td class="text-right mono">Rs.${costMisc.toLocaleString()}</td></tr>`
    rows += `<tr class="total-row"><td colspan="3" style="font-size:16px">OPERATING PROFIT</td><td class="text-right mono" style="font-size:16px;color:${profit >= 0 ? "#2e7d32" : "#e53935"}">Rs.${profit.toLocaleString()}</td></tr>`
    // Money MOVED this month — owner in/out and cash↔bank. Shown for the
    // record, deliberately OUTSIDE revenue/costs/profit: moving money between
    // the owner's pocket, the till and the bank earns and spends nothing.
    const monthMovs = (cashBook.miscExpenses || []).filter(e => (e.category === "transfer" || e.category === "capital") && (e.date || "").slice(0, 7) === month)
    if (monthMovs.length > 0) {
      const mSum = (pred) => monthMovs.filter(pred).reduce((s, e) => s + num(e.amount), 0)
      const ownerIn = mSum(e => e.direction === "o2c"), ownerOut = mSum(e => e.direction === "c2o")
      const dep = mSum(e => e.direction === "c2b"), wdr = mSum(e => e.direction === "b2c")
      const ownerNet = ownerIn - ownerOut
      rows += sec("Money moved — not in profit above")
      if (ownerIn > 0)  rows += `<tr><td colspan="3">Owner put money in</td><td class="text-right mono">Rs.${ownerIn.toLocaleString()}</td></tr>`
      if (ownerOut > 0) rows += `<tr><td colspan="3">Given to owner</td><td class="text-right mono">Rs.${ownerOut.toLocaleString()}</td></tr>`
      if (dep > 0)      rows += `<tr><td colspan="3">Cash banked</td><td class="text-right mono">Rs.${dep.toLocaleString()}</td></tr>`
      if (wdr > 0)      rows += `<tr><td colspan="3">Drawn from bank</td><td class="text-right mono">Rs.${wdr.toLocaleString()}</td></tr>`
      rows += `<tr><td colspan="3" style="color:#666">Owner this month</td><td class="text-right mono" style="color:#666">${ownerNet === 0 ? "even" : (ownerNet > 0 ? "put in Rs." + ownerNet.toLocaleString() + " net" : "took Rs." + (-ownerNet).toLocaleString() + " net")}</td></tr>`
    }
    const html = `<div class="header"><div><div class="shop-name">MacForce Auto Engineering</div><div class="shop-detail">Workshop Monthly Summary</div></div><div><div class="doc-title">MONTHLY SUMMARY</div><div class="doc-sub">${monthLabel}</div></div></div><table><tbody>${rows}</tbody></table><div style="margin-top:14px;font-size:12px;color:#666;line-height:1.6">Notes: Tax-invoice revenue is shown NET of VAT (the 18% is payable to IRD, not profit). Contractor <em>payments</em> are settlements of the work costs above and are not counted again. Wages, rent and utilities are included only if entered as cash-book expenses.</div><div class="footer"><span>Workshop Pulse</span><span>Generated ${new Date().toLocaleString()}</span></div>`
    openPDF("Workshop Monthly " + month, html)
  }

  const saveOpening = () => {
    const amt = num(openingCash)
    if (amt < 0) { tt("⚠️ Balance cannot be negative"); return }
    setCashBook(prev => ({ ...prev, openingCash: amt }))
    setEditingOpening(false)
    tt("✓ Opening balance updated")
  }

  const saveBankBal = () => {
    const amt = num(bankBal)
    setCashBook(prev => ({ ...prev, bankBalance: amt }))
    setEditingBank(false)
    tt("✓ Bank balance updated")
  }

  // ── Historical days with any activity ──
  const activeDays = [...new Set([
    ...(cashBook.miscExpenses || []).map(e => e.date),
    ...(cashBook.dailyCounts || []).map(c => c.date),
    ...grns.filter(g => g.paid && g.paymentDate).map(g => toLocalDate(g.paymentDate)),
  ].filter(Boolean))].sort((a, b) => b.localeCompare(a))

  const shiftDate = (delta) => {
    const d = new Date(viewDate + "T00:00:00")
    d.setDate(d.getDate() + delta)
    setViewDate(localDateStr(d))
  }

  const dateLabel = new Date(viewDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })

  const rs = (n) => "Rs." + Math.round(num(n)).toLocaleString()
  const movedNet = transferIn - transferOut
  const bookEmpty = cashIn.length === 0 && cashOut.length === 0 && plainMisc.length === 0 && dayMovements.length === 0

  // One row of the day's book — dot, description, signed mono amount.
  const BookRow = ({ color, desc, chip, amount, sign, onDelete }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderTop: `1px solid ${C.border}50` }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 14, color: C.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {desc}
        {chip && <span style={{ fontSize: 10.5, color: C.muted, marginLeft: 6, fontWeight: 600 }}>{chip}</span>}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color, flexShrink: 0 }}>{sign}{Math.round(num(amount)).toLocaleString()}</span>
      {onDelete && <span onClick={onDelete} style={{ fontSize: 16, color: C.muted, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}>×</span>}
    </div>
  )

  const BookHeader = ({ label, total, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "11px 16px 5px" }}>
      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase", color: C.muted }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color }}>{total}</span>
    </div>
  )

  return (
    <div>
      {/* Header — reports live up here, out of the working area */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span onClick={onBack} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>← Back</span>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px" }}>Cash Book</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <span onClick={generateDailyPDF} style={{ fontSize: 12, fontWeight: 600, color: C.accent, background: C.accentLight, padding: "7px 11px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap" }}>📄 Daily</span>
          <span onClick={generateMonthlyPDF} style={{ fontSize: 12, fontWeight: 600, color: C.purple, background: C.purple + "12", padding: "7px 11px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap" }}>📊 Month</span>
        </div>
      </div>

      {/* The three money forms — one door each, no overlap */}
      {moneyModal === "expense" && (
        <ExpenseModal
          viewDate={viewDate} today={today}
          drawerExpected={calculatedBalance}
          onClose={() => setMoneyModal(null)} onSave={saveExpense} tt={tt}
        />
      )}
      {(moneyModal === "in" || moneyModal === "out") && (
        <MoneyModal
          dir={moneyModal} viewDate={viewDate} today={today}
          drawerExpected={calculatedBalance} movements={allMovements}
          onClose={() => setMoneyModal(null)} onSave={saveMovement} tt={tt}
        />
      )}

      {/* Segmented tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 12, borderRadius: 12, background: "#E3E3E8", padding: 3 }}>
        {[{ key: "cash", label: "💵 Cash" }, { key: "bank", label: "🏦 Bank" }, { key: "history", label: "📅 History" }].map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "10px 4px", textAlign: "center", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            borderRadius: 10, transition: "all .15s ease",
            background: tab === t.key ? "#fff" : "transparent",
            color: tab === t.key ? C.text : C.sub,
            boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
          }}>{t.label}</div>
        ))}
      </div>

      {/* ═══ CASH TAB ═══ */}
      {tab === "cash" && (
        <>
          {/* Hero — the drawer. The only dark card in the app, so the eye lands
              on the one number that matters at the counter. */}
          <div style={{ background: "#1D1D1F", borderRadius: 20, padding: "16px 16px 14px", marginBottom: 12, color: "#fff", boxShadow: "0 10px 28px rgba(0,0,0,0.16)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span onClick={() => shiftDate(-1)} style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(255,255,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>‹</span>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{isToday ? "Today" : dateLabel}</div>
                {isToday
                  ? <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{dateLabel}</div>
                  : <div onClick={() => setViewDate(today)} style={{ fontSize: 11.5, color: "#7CC7FF", fontWeight: 700, cursor: "pointer", marginTop: 1 }}>Back to today →</div>}
              </div>
              <span onClick={() => !isToday && shiftDate(1)} style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(255,255,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center", cursor: isToday ? "default" : "pointer", fontSize: 18, fontWeight: 700, opacity: isToday ? 0.25 : 1 }}>›</span>
            </div>

            <div style={{ textAlign: "center", marginBottom: 13 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
                {isToday ? "Cash in the drawer" : "Drawer at end of day"}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 37, fontWeight: 700, letterSpacing: "-1.2px", lineHeight: 1.15, color: calculatedBalance < 0 ? "#FF7B72" : "#fff" }}>
                {rs(calculatedBalance)}
              </div>
              {dayCount && (
                <div style={{ display: "inline-block", marginTop: 6, fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 999, background: cashDiff === 0 ? "rgba(52,199,89,0.18)" : "rgba(255,59,48,0.20)", color: cashDiff === 0 ? "#5BD97C" : "#FF9C94" }}>
                  {cashDiff === 0 ? "✓ Counted — balanced" : `Counted ${rs(dayCount.actualCash)} · ${Math.abs(cashDiff).toLocaleString()} ${cashDiff > 0 ? "over" : "short"}`}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 13, padding: "9px 4px" }}>
              {[
                { l: "Opening", v: prevBalance.toLocaleString(), c: "rgba(255,255,255,0.85)" },
                { l: "In", v: "+" + totalCashIn.toLocaleString(), c: "#5BD97C" },
                { l: "Spent", v: "−" + totalSpent.toLocaleString(), c: "#FF9F8A" },
                { l: "Moved", v: (movedNet >= 0 ? "+" : "−") + Math.abs(movedNet).toLocaleString(), c: movedNet === 0 ? "rgba(255,255,255,0.38)" : "#7CC7FF" },
              ].map(s => (
                <div key={s.l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.9, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* The three doors — solid, unmissable, thumb-sized */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
            {[
              { k: "in", icon: "⬆", label: "Money In", sub: "owner · bank", color: C.green },
              { k: "out", icon: "⬇", label: "Money Out", sub: "bank · owner", color: C.orange },
              { k: "expense", icon: "🧾", label: "Expense", sub: "shop spending", color: C.red },
            ].map(b => (
              <div key={b.k} onClick={() => setMoneyModal(b.k)} style={{
                padding: "13px 4px 11px", borderRadius: 15, textAlign: "center", cursor: "pointer",
                background: b.color, color: "#fff", boxShadow: `0 5px 15px ${b.color}40`,
              }}>
                <div style={{ fontSize: 19, lineHeight: 1 }}>{b.icon}</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 4, letterSpacing: "-0.2px" }}>{b.label}</div>
                <div style={{ fontSize: 9.5, opacity: 0.85, marginTop: 1, fontWeight: 600 }}>{b.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", marginBottom: 12 }}>
            Moved money never touches profit — only the Expense button does.
            {!isToday && <span style={{ color: C.orange, fontWeight: 700 }}> Entries will be dated {dateLabel}.</span>}
          </div>

          {staleClose && (
            <div style={{ ...card, background: C.warningBg, border: `1.5px solid ${C.orange}40`, padding: "10px 14px" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.orange }}>⚠️ Day not closed since {new Date(staleClose + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — count &amp; close each business day so the opening stays true.</span>
            </div>
          )}

          {/* The day's book — one ledger, three sections */}
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "13px 16px 11px", borderBottom: `1px solid ${C.border}60` }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>📖 The day&apos;s book</span>
            </div>
            {bookEmpty ? (
              <div style={{ textAlign: "center", padding: "28px 20px 30px", color: C.muted }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>🗒</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.sub }}>Nothing in the book for this day</div>
                <div style={{ fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>Cash job payments appear here on their own.<br />Use the buttons above for everything else.</div>
              </div>
            ) : (
              <div style={{ paddingBottom: 6 }}>
                {cashIn.length > 0 && (
                  <>
                    <BookHeader label="Came in" total={"+" + totalCashIn.toLocaleString()} color={C.green} />
                    {cashIn.map(i => <BookRow key={i.id} color={C.green} desc={i.desc} amount={i.amount} sign="+" />)}
                  </>
                )}
                {(cashOut.length > 0 || plainMisc.length > 0) && (
                  <>
                    <BookHeader label="Spent" total={"−" + totalSpent.toLocaleString()} color={C.red} />
                    {cashOut.map(e => <BookRow key={e.id} color={C.red} desc={e.desc} amount={e.amount} sign="−" />)}
                    {plainMisc.map(e => (
                      <BookRow key={e.id} color={C.red} desc={e.description} chip={EXP_LABEL[e.category] || e.category}
                        amount={e.amount} sign="−" onDelete={() => deleteMisc(e.id, e.description)} />
                    ))}
                  </>
                )}
                {dayMovements.length > 0 && (
                  <>
                    <BookHeader label="Moved — not in profit" total={(movedNet >= 0 ? "+" : "−") + Math.abs(movedNet).toLocaleString()} color={C.accent} />
                    {dayMovements.map(m => (
                      <BookRow key={m.id} color={isMoveIn(m) ? C.green : C.orange} desc={m.description}
                        chip={MOVE_ICON[m.direction]} amount={m.amount} sign={isMoveIn(m) ? "+" : "−"}
                        onDelete={() => deleteMisc(m.id, m.description)} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* End of day — count the drawer, see the variance live, close */}
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "13px 16px 11px", borderBottom: `1px solid ${C.border}60`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>🔒 End of day</span>
              {dayCount && !editingCount && (
                <span onClick={() => { setEditingCount(true); setCountAmt(String(dayCount.actualCash)); setCountNote(dayCount.note || "") }}
                  style={{ fontSize: 12, color: C.accent, fontWeight: 600, cursor: "pointer" }}>Edit count</span>
              )}
            </div>
            <div style={{ padding: "12px 16px 16px" }}>
              {/* Opening float, editable only for today */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: C.sub }}>Opening float</span>
                {editingOpening && isToday ? (
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" value={openingCash} autoFocus
                      onChange={e => setOpeningCash(e.target.value)}
                      style={{ ...inp, width: 120, fontSize: 15, fontFamily: MONO, fontWeight: 700, padding: "7px 10px" }} />
                    <span onClick={saveOpening} style={{ fontSize: 13, color: C.green, fontWeight: 700, cursor: "pointer" }}>Save</span>
                    <span onClick={() => { setEditingOpening(false); setOpeningCash(String(num(cashBook.openingCash))) }} style={{ fontSize: 13, color: C.muted, cursor: "pointer" }}>✕</span>
                  </span>
                ) : (
                  <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700 }}>{rs(prevBalance)}</span>
                    {isToday && <span onClick={() => { setEditingOpening(true); setOpeningCash(String(num(cashBook.openingCash))) }} style={{ fontSize: 12, color: C.accent, fontWeight: 600, cursor: "pointer" }}>edit</span>}
                  </span>
                )}
              </div>

              {dayCount && !editingCount ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: C.sub }}>Book says</span>
                    <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700 }}>{rs(calculatedBalance)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: C.sub }}>Counted in the drawer</span>
                    <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700 }}>{rs(dayCount.actualCash)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 11, background: cashDiff === 0 ? C.successBg : C.errorBg, marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cashDiff === 0 ? C.green : C.red }}>{cashDiff === 0 ? "Balanced" : cashDiff > 0 ? "Over" : "Short"}</span>
                    <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: cashDiff === 0 ? C.green : C.red }}>
                      {cashDiff === 0 ? "✓" : (cashDiff > 0 ? "+" : "−") + "Rs." + Math.abs(cashDiff).toLocaleString()}
                    </span>
                  </div>
                  {dayCount.note && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Note: {dayCount.note}</div>}
                  {isToday && (
                    <button onClick={closeDay} style={{ ...btn(C.green), marginTop: 12, fontSize: 15 }}>
                      🔒 Close the day
                    </button>
                  )}
                  {isToday && <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 6 }}>The counted amount becomes tomorrow&apos;s opening float.</div>}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>Count the notes and coins, then type the total:</div>
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 700, color: C.muted }}>Rs.</span>
                    <input type="number" inputMode="numeric" value={countAmt} min="0"
                      onChange={e => setCountAmt(e.target.value)} placeholder="0"
                      style={{ ...inp, paddingLeft: 46, fontSize: 20, fontFamily: MONO, fontWeight: 700 }} />
                  </div>
                  {countAmt !== "" && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, marginBottom: 8, background: num(countAmt) - calculatedBalance === 0 ? C.successBg : C.errorBg }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: num(countAmt) - calculatedBalance === 0 ? C.green : C.red }}>
                        {num(countAmt) - calculatedBalance === 0 ? "Matches the book" : num(countAmt) - calculatedBalance > 0 ? "Over the book" : "Short of the book"}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 13.5, fontWeight: 800, color: num(countAmt) - calculatedBalance === 0 ? C.green : C.red }}>
                        {num(countAmt) - calculatedBalance === 0 ? "✓" : (num(countAmt) - calculatedBalance > 0 ? "+" : "−") + Math.abs(num(countAmt) - calculatedBalance).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <input value={countNote} onChange={e => setCountNote(e.target.value)} placeholder="Note (optional)" style={{ ...inp, fontSize: 13.5, padding: "10px 14px", marginBottom: 10 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    {editingCount && <button onClick={() => { setEditingCount(false); setCountAmt(""); setCountNote("") }} style={{ flex: 1, padding: "13px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "#fff", fontSize: 14, fontWeight: 600, color: C.sub, cursor: "pointer", fontFamily: FONT }}>Cancel</button>}
                    <button onClick={saveCashCount} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: C.text, fontSize: 14.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: FONT }}>✓ Save count</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ BANK TAB ═══ */}
      {tab === "bank" && (
        <>
          <div style={{ ...card, background: C.accent + "08" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.muted }}>Bank balance</div>
                {editingBank ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input type="number" value={bankBal} autoFocus
                      onChange={e => setBankBal(e.target.value)}
                      style={{ ...inp, width: 160, fontSize: 16, fontFamily: MONO, fontWeight: 700, padding: "8px 10px" }} />
                    <span onClick={saveBankBal} style={{ fontSize: 13, color: C.green, fontWeight: 700, cursor: "pointer" }}>Save</span>
                    <span onClick={() => { setEditingBank(false); setBankBal(String(num(cashBook.bankBalance))) }} style={{ fontSize: 13, color: C.muted, cursor: "pointer" }}>✕</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.accent, marginTop: 2 }}>{rs(cashBook.bankBalance)}</div>
                )}
              </div>
              {!editingBank && <span onClick={() => setEditingBank(true)} style={{ fontSize: 12, color: C.accent, fontWeight: 600, cursor: "pointer" }}>✏️ Reconcile</span>}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>A manual note only — the app does not mirror your bank account.</div>
          </div>

          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "13px 16px 11px", borderBottom: `1px solid ${C.border}60` }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>🏦 Through the bank {isToday ? "today" : "this day"}</span>
            </div>
            {bankIn.length === 0 && bankOut.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted, padding: "18px 16px 22px", textAlign: "center" }}>No bank payments on this day</div>
            ) : (
              <div style={{ paddingBottom: 6 }}>
                {bankIn.map(t => <BookRow key={t.id} color={C.green} desc={t.desc} amount={t.amount} sign="+" />)}
                {bankOut.map(t => <BookRow key={t.id} color={C.red} desc={t.desc} amount={t.amount} sign="−" />)}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === "history" && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "13px 16px 11px", borderBottom: `1px solid ${C.border}60` }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>📅 Past days</span>
          </div>
          {activeDays.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted, padding: "18px 16px 22px", textAlign: "center" }}>Nothing recorded yet</div>
          ) : activeDays.map(d => {
            const inc = computeIncome(d).filter(i => i.method === "cash").reduce((s, i) => s + i.amount, 0)
            const exp = computeExpenses(d).filter(e => e.method === "cash").reduce((s, e) => s + e.amount, 0)
            const misc = (cashBook.miscExpenses || []).filter(e => e.date === d && !isMovementEntry(e)).reduce((s, e) => s + num(e.amount), 0)
            const count = (cashBook.dailyCounts || []).find(c => c.date === d)
            return (
              <div key={d} onClick={() => { setViewDate(d); setTab("cash") }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderTop: `1px solid ${C.border}50`, cursor: "pointer" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1, fontFamily: MONO }}>
                    <span style={{ color: C.green, fontWeight: 700 }}>+{inc.toLocaleString()}</span>
                    <span style={{ margin: "0 5px" }}>·</span>
                    <span style={{ color: C.red, fontWeight: 700 }}>−{(exp + misc).toLocaleString()}</span>
                  </div>
                </div>
                {count && <span style={{ fontSize: 10.5, color: C.green, fontWeight: 700, background: C.successBg, padding: "3px 8px", borderRadius: 999 }}>✓ Counted</span>}
                <span style={{ fontSize: 16, color: C.muted }}>›</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PayableScreen({ unpaidPOs, setPurchaseOrders, setGrns, cashBook, setCashBook, tt, onBack }) {
  const [payingId, setPayingId] = useState(null)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("cash")
  const [chequeNo, setChequeNo] = useState("")
  const [chequeBank, setChequeBank] = useState("")
  const [chequeDate, setChequeDate] = useState("")
  const [discount, setDiscount] = useState("")
  const [bankSlip, setBankSlip] = useState(null)
  const [bankSlipPreview, setBankSlipPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const slipInputRef = useRef(null)
  // Cheque confirmation slip overlay: {no, supplier, amount, chequeNo, chequeDate}
  const [confirmSlip, setConfirmSlip] = useState(null)

  const totalPayable = unpaidPOs.reduce((s, p) => s + (p.totalAmount || 0), 0)

  const startPay = (item) => {
    setPayingId(item.id)
    setPayAmount(String(item.totalAmount || 0))
    setPayMethod("cash")
    setChequeNo(""); setChequeBank(""); setChequeDate("")
    setDiscount("")
    setBankSlip(null); setBankSlipPreview(null)
  }

  const confirmPay = async (item) => {
    const paymentData = {
      paid: true,
      paymentMethod: payMethod,
      paymentAmount: Number(payAmount) || 0,
      paymentDiscount: Number(discount) || 0,
      paymentDate: new Date().toISOString(),
    }
    if (payMethod === "cheque") {
      // Cheque control: the cheque number is mandatory, and the system issues an
      // 8-digit confirmation number the operator writes on the cheque book slip.
      // House rule: the owner signs a cheque ONLY if its slip carries this number
      // — so a cheque can't exist without being recorded here first.
      if (!chequeNo.trim()) { tt("⚠️ Enter the cheque number first"); return }
      paymentData.chequeNo = chequeNo
      paymentData.chequeBank = chequeBank
      paymentData.chequeDate = chequeDate
      paymentData.paymentConfirmNo = String(Math.floor(10000000 + Math.random() * 90000000))
    }
    if (payMethod === "bank" && bankSlip) {
      try {
        setUploading(true)
        const path = `store/payment-slips/${Date.now()}_${bankSlip.name}`
        const url = await uploadPhoto(bankSlip, path)
        paymentData.bankSlipUrl = url
      } catch (err) {
        console.error("Slip upload failed:", err)
        // Save locally as data URL fallback
        if (bankSlipPreview) paymentData.bankSlipUrl = bankSlipPreview
      } finally {
        setUploading(false)
      }
    }
    setGrns(prev => prev.map(g => g.id === item.id ? { ...g, ...paymentData } : g))
    if (paymentData.paymentConfirmNo) {
      setConfirmSlip({ no: paymentData.paymentConfirmNo, supplier: item.supplier, amount: paymentData.paymentAmount, chequeNo, chequeDate })
    } else {
      tt("✓ Payment recorded")
    }
    setPayingId(null)
  }

  const handleSlipSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBankSlip(file)
    const preview = await compressForPreview(file)
    setBankSlipPreview(preview)
  }

  return (
    <div>
      {/* Cheque payment confirmation — operator copies this number onto the
          cheque book slip; the owner signs only slips that carry a number */}
      {confirmSlip && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 420, width: "100%", textAlign: "center", fontFamily: FONT }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>✓ Cheque payment recorded</div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 12 }}>Payment Confirmation Number</div>
            <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 800, letterSpacing: 4, margin: "6px 0 14px", color: C.accent }}>{confirmSlip.no}</div>
            <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6, background: C.bg, borderRadius: 12, padding: "12px 14px", textAlign: "left" }}>
              ✍️ Write this number on the cheque book slip for cheque <strong>{confirmSlip.chequeNo || "—"}</strong> along with:<br />
              • Supplier: <strong>{confirmSlip.supplier}</strong><br />
              • Amount: <strong>Rs.{num(confirmSlip.amount).toLocaleString()}</strong><br />
              • Date: <strong>{confirmSlip.chequeDate || localDateStr()}</strong>
            </div>
            <div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginTop: 10 }}>The owner signs ONLY cheques whose slip carries a confirmation number.</div>
            <button onClick={() => setConfirmSlip(null)} style={{ ...btn(C.accent, "#fff"), marginTop: 16 }}>Done — number written on slip</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span onClick={onBack} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Back</span>
        <span style={{ fontSize: 20, fontWeight: 700 }}>Payable</span>
      </div>
      {totalPayable > 0 && (
        <div style={{ ...card, background: C.red + "08", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.sub }}>Total Payable</span>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: C.red }}>Rs.{totalPayable.toLocaleString()}</span>
        </div>
      )}
      {unpaidPOs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><IconBadge name="checkCircle" color={C.green} size={56} /></div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>All purchases paid</div>
        </div>
      ) : unpaidPOs.map(item => {
        const isPO = !!item.poNumber
        const isPayingThis = payingId === item.id
        return (
          <div key={item.id} style={{ ...card, padding: "12px 16px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{item.grnNumber}</span>
                  {item.poId && <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, background: C.accent + "12", padding: "2px 8px", borderRadius: 6 }}>{item.poNumber || "PO"}</span>}
                </div>
                <div style={{ fontSize: 14, color: C.sub }}>{item.supplier}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{item.items?.length || 0} items · {new Date(item.created_at || item.receivedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: C.red }}>Rs.{(item.totalAmount || 0).toLocaleString()}</div>
              </div>
            </div>
            {!isPayingThis && (
              <div onClick={() => startPay(item)} style={{ marginTop: 10, padding: "10px 16px", borderRadius: 10, background: C.green, color: "#fff", fontSize: 14, fontWeight: 600, textAlign: "center", cursor: "pointer" }}>💰 Pay Now</div>
            )}

            {/* Payment form */}
            {isPayingThis && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                {/* Payment method */}
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Payment Method</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {[
                    { key: "cash", label: "💵 Cash", color: C.green },
                    { key: "bank", label: "🏦 Bank", color: C.accent },
                    { key: "cheque", label: "📝 Cheque", color: C.orange },
                  ].map(m => (
                    <div key={m.key} onClick={() => setPayMethod(m.key)} style={{
                      flex: 1, padding: "10px 6px", borderRadius: 10, textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: 600,
                      background: payMethod === m.key ? m.color : "#fff",
                      color: payMethod === m.key ? "#fff" : C.sub,
                      border: `2px solid ${payMethod === m.key ? m.color : C.border}`,
                    }}>{m.label}</div>
                  ))}
                </div>

                {/* Cheque details */}
                {payMethod === "cheque" && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Cheque No</div>
                        <input value={chequeNo} onChange={e => setChequeNo(e.target.value)} placeholder="Cheque number" style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Bank</div>
                        <input value={chequeBank} onChange={e => setChequeBank(e.target.value)} placeholder="Bank name" style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Cheque Date</div>
                      <input type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
                    </div>
                  </div>
                )}

                {/* Bank slip upload */}
                {payMethod === "bank" && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Payment Slip</div>
                    <input type="file" accept="image/*" ref={slipInputRef} onChange={handleSlipSelect} style={{ display: "none" }} />
                    {bankSlipPreview ? (
                      <div style={{ position: "relative" }}>
                        <img src={bankSlipPreview} alt="Payment slip" style={{ width: "100%", borderRadius: 10, border: `1px solid ${C.border}` }} />
                        <div onClick={() => { setBankSlip(null); setBankSlipPreview(null); if (slipInputRef.current) slipInputRef.current.value = "" }}
                          style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, background: C.red, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer" }}>×</div>
                      </div>
                    ) : (
                      <div onClick={() => slipInputRef.current?.click()}
                        style={{ padding: "20px", textAlign: "center", borderRadius: 10, border: `2px dashed ${C.border}`, cursor: "pointer", color: C.muted, background: C.bg }}>
                        📷 Tap to add payment slip
                      </div>
                    )}
                  </div>
                )}

                {/* Amount & Discount */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Payment Amount</div>
                    <input type="number" value={payAmount}
                      onFocus={e => { e.target._orig = payAmount; e.target.value = ""; setPayAmount("") }}
                      onBlur={e => { if (!payAmount) setPayAmount(e.target._orig || String(item.totalAmount || 0)) }}
                      onChange={e => setPayAmount(e.target.value)}
                      style={{ ...inp, fontSize: 16, fontFamily: MONO, fontWeight: 700, padding: "10px 12px" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Discount</div>
                    <input type="number" value={discount}
                      onFocus={e => { if (discount === "0") setDiscount("") }}
                      onChange={e => setDiscount(e.target.value)}
                      placeholder="0" style={{ ...inp, fontSize: 16, fontFamily: MONO, fontWeight: 700, padding: "10px 12px" }} />
                  </div>
                </div>

                {Number(discount) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: C.green, fontWeight: 600 }}>Discount: Rs.{Number(discount).toLocaleString()}</span>
                    <span style={{ fontFamily: MONO, fontWeight: 700 }}>Net: Rs.{((Number(payAmount) || 0) - (Number(discount) || 0)).toLocaleString()}</span>
                  </div>
                )}

                {/* Confirm / Cancel */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setPayingId(null)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fff", fontSize: 14, fontWeight: 600, color: C.sub, cursor: "pointer", fontFamily: FONT }}>Cancel</button>
                  <button onClick={() => confirmPay(item)} disabled={uploading} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: uploading ? C.muted : C.green, fontSize: 14, fontWeight: 600, color: "#fff", cursor: uploading ? "wait" : "pointer", fontFamily: FONT }}>{uploading ? "Uploading..." : "✓ Confirm Payment"}</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AppInner() {
  const {
    screen, setScreen,
    toast,
    isTablet,
    sidebarCollapsed, sidebarExpanded, setSidebarExpanded,
    activeJobId,
    jobs,
    homeTab,
    jobDocs, setJobDocs,
    showImage, setShowImage,
    showUploadMenu, setShowUploadMenu,
    photoTag, setPhotoTag,
    estimates,
    selEst,
    showSubFlowPrompt, setShowSubFlowPrompt,
    setJobPaused,
    showPQScreen, setShowPQScreen,
    isInsurance, isDirectJob,
    partsQuotation, setPartsQuotation,
    pqTab, setPqTab,
    pqStatus, setPqStatus,
    pqApprovalPhoto, setPqApprovalPhoto,
    pqLumpMode, setPqLumpMode,
    pqLumpSum, setPqLumpSum,
    pqTotalPrice, pqFilled, pqTotal, pqAllFilled, pqApprovedTotal, pqHasApproval,
    supplierInvoices, setSupplierInvoices,
    showSupplierInvForm, setShowSupplierInvForm,
    customerConfirmed, confirmCustomer,
    generatePQPDF, sharePQ,
    jobInfo,
    openJob,
    hoverJobId, setHoverJobId,
    hoverY, setHoverY,
    tt,
    isDetailScreen,
    APP_VERSION,
    searchQuery, setSearchQuery,
    filterStage, setFilterStage,
    setHomeTab,
    sortBy, setSortBy,
    startNewJob,
    setNewJobInfo,
    newJobInfo,
    pqPhotoRef,
    uploadRef,
    closedCount,
    purchaseOrders, setPurchaseOrders,
    grns, setGrns,
    cashBook, setCashBook,
    contractorPayments,
    customerRegistry,
    loadClosedJobs,
    startWarrantyJob,
    assessors,
    jobOutstandingTotal,
  } = useWorkshop()
  const { signOut, isSuperAdmin, role } = useAuth()
  const [showUserMgmt, setShowUserMgmt] = useState(false)
  const [selectedClosedJob, setSelectedClosedJob] = useState(null)
  const [rightTab, setRightTab] = useState(null) // null | "store" | "registry" | "payments"
  const [storeInitial, setStoreInitial] = useState({ tab: "pos", screen: "list", key: 0 })
  const [regSearch, setRegSearch] = useState("")
  const [regSelectedVehicle, setRegSelectedVehicle] = useState(null) // vehicle reg key for expanded view
  const [mobileView, setMobileView] = useState("jobs") // jobs | hub (mobile only)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Don't trigger if typing in an input/textarea
      if (e.target.matches?.("input, textarea, select, [contenteditable]")) return
      if (e.key === "n" || e.key === "N") { e.preventDefault(); startNewJob() }
      else if (e.key === "Escape") { setRightTab(null); setSelectedClosedJob(null); setRegSelectedVehicle(null) }
      else if (e.key === "/") {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]')
        if (searchInput) searchInput.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [startNewJob])

  // Job list panel (shared between phone home + tablet sidebar)
  function jobListPanel() {
    return (
      <div>
        <div style={{ paddingTop: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.accent, letterSpacing: 1.5, textTransform: "uppercase" }}>Workshop Pulse <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, letterSpacing: 0 }}>v{APP_VERSION}</span></div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {isSuperAdmin && <div onClick={() => setShowUserMgmt(true)} style={{ fontSize: 12, color: C.accent, cursor: "pointer", padding: "4px 10px", borderRadius: 8, background: C.accent + "10", border: `1px solid ${C.accent}30` }}>👥 Users</div>}
              <div onClick={signOut} style={{ fontSize: 13, color: C.sub, cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, minHeight: 36, display: "flex", alignItems: "center" }}>Logout</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: isTablet ? 28 : 36, fontWeight: 700, color: C.text, letterSpacing: "-1px" }}>Jobs</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div onClick={() => setSortBy(s => s === "newest" ? "oldest" : s === "oldest" ? "highest_value" : s === "highest_value" ? "stage_order" : "newest")} style={{ fontSize: 12, color: C.accent, cursor: "pointer", padding: "4px 10px", borderRadius: 8, background: C.accent + "08" }}>
                {sortBy === "newest" ? "↓ New" : sortBy === "oldest" ? "↑ Old" : sortBy === "highest_value" ? "💰 Value" : "📊 Stage"}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 15, color: C.sub }}>{jobs.filter(j => !j.onHold && j.stage !== "closed" && j.stage !== "cancelled").length}</div>
            </div>
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search vehicles..." style={{ ...inp, background: C.card, fontSize: isTablet ? 15 : 17, paddingLeft: 42, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }} />
          {searchQuery && <span onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, cursor: "pointer", color: C.muted, padding: 4 }}>✕</span>}
        </div>

        {/* Dashboard summary cards */}
        {homeTab === "active" && (() => {
          const active = jobs.filter(j => !j.onHold && j.stage !== "closed" && j.stage !== "cancelled")
          const pendingEst = active.filter(j => j.stage === "est_pending").length
          const partsWaiting = active.filter(j => (j.estimates || []).flatMap(e => (e.approved_entries || e.entries || []).filter(en => en.category === "replace")).some(p => !j.partsArrived?.[p.id])).length
          const overdue = jobs.filter(j => j.onHold && j.holdUntil && new Date(j.holdUntil) < new Date()).length
          const metrics = [
            { label: "Active", value: active.length, color: C.accent, action: () => { setSearchQuery(""); setHomeTab("active"); setFilterStage("all") } },
            { label: "Est. Pending", value: pendingEst, color: C.orange, action: () => { setSearchQuery(""); setHomeTab("active"); setFilterStage("est_pending") } },
            { label: "Parts Wait", value: partsWaiting, color: C.purple, action: () => { setSearchQuery(""); setHomeTab("active"); setFilterStage("parts_waiting") } },
            { label: "Overdue", value: overdue, color: C.red, action: () => { setSearchQuery(""); setHomeTab("on_hold") } },
          ].filter(m => m.value > 0 || m.label === "Active")
          return <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
            {metrics.map(m => <div key={m.label} onClick={m.action} style={{ flex: "0 0 auto", minWidth: 100, background: C.card, borderRadius: 14, padding: "10px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer", borderBottom: `3px solid ${m.color}`, minHeight: 72 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: m.color, fontFamily: MONO }}>{m.value}</div>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, marginTop: 2 }}>{m.label}</div>
            </div>)}
          </div>
        })()}

        {/* Active / On Hold / Closed tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 12, background: C.card, borderRadius: 14, padding: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {[["active", "Active", jobs.filter(j => !j.onHold && j.stage !== "closed" && j.stage !== "cancelled").length], ["on_hold", "📌 On Hold", jobs.filter(j => j.onHold).length], ["closed", "🏁 Closed", jobs.filter(j => j.stage === "closed").length || closedCount || 0]].map(([k, l, cnt]) => (
            <div key={k} onClick={() => { setHomeTab(k); setFilterStage("all"); setSelectedClosedJob(null) }} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, minHeight: 44, cursor: "pointer", background: homeTab === k ? (k === "on_hold" ? C.orange + "12" : k === "closed" ? C.sub + "12" : C.accent + "12") : "transparent", color: homeTab === k ? (k === "on_hold" ? C.orange : k === "closed" ? C.sub : C.accent) : C.muted, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>{l} ({cnt})</div>
          ))}
        </div>

        {/* Stage filter pills -- active tab only */}
        {homeTab === "active" && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, marginBottom: 4 }}>
            {filterStage === "parts_waiting" && <div onClick={() => setFilterStage("all")} style={{ padding: "12px 18px", borderRadius: 20, minHeight: 44, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", background: C.purple + "15", color: C.purple, border: `1px solid ${C.purple}50` }}>{"\uD83D\uDCE6"} Parts Waiting ×</div>}
            <div onClick={() => setFilterStage("all")} style={{ padding: "12px 18px", borderRadius: 20, minHeight: 44, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, background: filterStage === "all" ? C.accent : C.card, color: filterStage === "all" ? "#fff" : C.sub, border: `1px solid ${filterStage === "all" ? C.accent : C.border}` }}>All ({jobs.filter(j => !j.onHold && j.stage !== "closed" && j.stage !== "cancelled").length})</div>
            {Object.entries(ALL_STAGES).filter(([, s]) => s.label !== "Closed").map(([key, s]) => { const cnt = jobs.filter(j => j.stage === key && !j.onHold).length; return cnt > 0 ? <div key={key} onClick={() => setFilterStage(filterStage === key ? "all" : key)} style={{ padding: "12px 18px", borderRadius: 20, minHeight: 44, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", background: filterStage === key ? s.color + "15" : C.card, color: filterStage === key ? s.color : C.sub, border: `1px solid ${filterStage === key ? s.color + "50" : C.border}` }}>{s.icon} {s.label} ({cnt})</div> : null })}
          </div>
        )}

        {/* Job cards */}
        {homeTab === "closed" && <ClosedHistory jobs={jobs} searchQuery={searchQuery} openJob={openJob} isTablet={isTablet} activeJobId={activeJobId} onSelectJob={isTablet ? (j) => setSelectedClosedJob(j) : null} selectedJobId={selectedClosedJob?.id} />}
        {homeTab !== "closed" && (() => {
          let filtered = homeTab === "on_hold" ? jobs.filter(j => j.onHold) : jobs.filter(j => !j.onHold && j.stage !== "closed" && j.stage !== "cancelled")
          if (homeTab === "active" && filterStage !== "all") {
            if (filterStage === "parts_waiting") {
              filtered = filtered.filter(j => (j.estimates || []).flatMap(e => (e.approved_entries || e.entries || []).filter(en => en.category === "replace")).some(p => !j.partsArrived?.[p.id]))
            } else {
              filtered = filtered.filter(j => j.stage === filterStage)
            }
          }
          if (searchQuery.trim()) { const q = searchQuery.toLowerCase().replace(/[\s\-]/g, ""); filtered = filtered.filter(j => { const reg = regSearchKey(j.jobInfo.vehicle_reg); const phone = phoneSearchKey(j.jobInfo.customer_phone); const name = (j.jobInfo.customer_name || "").toLowerCase(); const make = (j.jobInfo.vehicle_make || "").toLowerCase(); const num = (j.jobNumber || "").toLowerCase(); return reg.includes(q) || phone.includes(q) || name.includes(q) || make.includes(q) || num.includes(q) }) }
          // Sort
          const stageKeys = Object.keys(ALL_STAGES)
          if (sortBy === "oldest") filtered = [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          else if (sortBy === "highest_value") filtered = [...filtered].sort((a, b) => (b.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0) - (a.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0))
          else if (sortBy === "stage_order") filtered = [...filtered].sort((a, b) => stageKeys.indexOf(a.stage) - stageKeys.indexOf(b.stage))
          return filtered.length ? filtered.map(j => {
            const stage = ALL_STAGES[j.stage] || ALL_STAGES.job_received
            const estTotal = (j.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0)
            const jobReplaceCnt = (j.estimates || []).flatMap(est => (est.approved_entries || est.entries || []).filter(e => e.category === "replace")).length
            const jobArrivedCnt = Object.values(j.partsArrived || {}).filter(Boolean).length
            const isSelected = isTablet && activeJobId === j.id
            const thumb = (j.jobDocs || [])[0]?.dataUrl
            return (
              <div key={j.id} onClick={() => openJob(j)} onMouseEnter={e => { if (isTablet) { setHoverJobId(j.id); setHoverY(e.clientY) } }} onMouseLeave={() => setHoverJobId(null)} style={{ ...card, cursor: "pointer", padding: isTablet ? "10px 12px" : "12px 14px", background: isSelected ? C.accent + "08" : C.card, border: isSelected ? `1px solid ${C.accent}40` : `1px solid ${C.border}`, borderLeft: `4px solid ${stage.color}`, display: "flex", gap: 10, alignItems: "center" }}>
                {thumb ? <SecureImg src={thumb} style={{ width: isTablet ? 48 : 52, height: isTablet ? 48 : 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} alt="" /> : <div style={{ width: isTablet ? 48 : 52, height: isTablet ? 48 : 52, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="car" size={22} color={C.muted} /></div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontFamily: MONO, fontSize: isTablet ? 16 : 18, fontWeight: 700 }}>{j.jobInfo.vehicle_reg || "New Job"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                      {j.paused && <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, background: C.orange + "15", padding: "3px 8px", borderRadius: 6 }}>⏸</span>}
                      {j.onHold && <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, background: C.orange + "15", padding: "3px 8px", borderRadius: 6 }}>📌</span>}
                      <span style={{ fontSize: isTablet ? 11 : 12, fontWeight: 700, color: stage.color, background: stage.color + "12", padding: "3px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>{stage.icon} {stage.label}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: isTablet ? 14 : 15, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.jobInfo.customer_name || "--"}{j.jobInfo.vehicle_make ? ` · ${j.jobInfo.vehicle_make} ${j.jobInfo.vehicle_model || ""}` : ""}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                    {j.jobInfo.insurance_name ? <span style={{ fontSize: 12, color: C.accent }}>🛡️ {j.jobInfo.insurance_name}</span> : j.jobInfo.job_type === "quick" ? <span style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>⚡ Quick</span> : <span style={{ fontSize: 12, color: C.green }}>💰 Direct</span>}
                    {jobReplaceCnt > 0 && <span style={{ fontSize: 12, color: jobArrivedCnt >= jobReplaceCnt ? C.green : C.orange }}>📦 {jobArrivedCnt}/{jobReplaceCnt}</span>}
                    {estTotal > 0 && <span style={{ fontSize: 12, fontFamily: MONO, color: C.sub }}>Rs.{Number(estTotal).toLocaleString()}</span>}
                  </div>
                  {j.onHold && j.holdUntil && (() => {
                    const ms = new Date(j.holdUntil) - new Date()
                    const hours = Math.ceil(ms / (1000 * 60 * 60))
                    const days = Math.ceil(ms / (1000 * 60 * 60 * 24))
                    if (ms <= 0) return j.stage === "delivered" ? <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginTop: 4 }}>🔔 Follow-up due!</div> : <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginTop: 4 }}>🔔 Retry call now!</div>
                    if (j.stage === "follow_up") return <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginTop: 4 }}>📵 No answer ({j.followUpAttempts}/3) · retry in {hours}h</div>
                    return <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginTop: 4 }}>⏰ Follow-up in {days} day{days !== 1 ? "s" : ""}</div>
                  })()}
                  {j.stage === "closed" && j.followUpNote && <div style={{ fontSize: 12, color: C.sub, marginTop: 4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.followUpNote}</div>}
                </div>
              </div>
            )
          }) : (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><IconBadge name={homeTab === "on_hold" ? "bookmark" : homeTab === "closed" ? "flag" : "wrench"} color={C.muted} size={56} /></div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{homeTab === "on_hold" ? "No jobs on hold" : homeTab === "closed" ? "No closed jobs" : `No jobs${filterStage !== "all" ? " in this stage" : ""}`}</div>
              <div style={{ fontSize: 16, marginTop: 6 }}>{homeTab === "on_hold" ? "Delivered jobs wait here for 2-week follow-up" : homeTab === "closed" ? "Completed jobs will appear here" : "Tap + to create a new job"}</div>
            </div>
          )
        })()}

        <button onClick={startNewJob} style={{ ...btn(C.accent, "#fff"), marginTop: 8, position: "sticky", bottom: "max(20px, calc(20px + env(safe-area-inset-bottom)))", boxShadow: "0 4px 20px rgba(0,122,255,0.3)" }}>+ New Job</button>
      </div>
    )
  }

  // Right panel hub — shows when no job is selected on tablet
  // Helper: invoice total from items (correct field) with fallback to entries (legacy)
  const calcInvoiceTotal = (inv) => {
    if (inv.items?.length) return inv.items.reduce((s, i) => s + ((Number(i.qty) || 1) * (Number(i.unit_price) || 0)), 0)
    return (inv.entries || []).reduce((s, e) => s + ((e.approved || e.amount || 0) * (e.qty || 1)), 0)
  }
  // Helper: paid total — only RECEIVED insurance payments + all customer payments
  const calcInvoicePaid = (inv) => {
    // Use unified payments[] if present
    const pays = inv.payments?.length ? inv.payments : [...(inv.insurance_payments || []), ...(inv.customer_payments || [])]
    return pays.reduce((s, p) => {
      // Insurance payments only count if received
      if (p.type === "insurance" && p.ins_status !== "received") return s
      return s + (Number(p.amount) || 0)
    }, 0)
  }

  function rightPanelHub() {
    // Pending payments: jobs with invoices that aren't fully paid.
    // Closed jobs ARE included — closing a job doesn't write off the receivable
    // (insurance often pays weeks after delivery/closure).
    const pendingPaymentJobs = jobs.filter(j => {
      if (j.stage === "cancelled") return false
      const invs = j.invoices || []
      return invs.some(inv => {
        const total = calcInvoiceTotal(inv) - (Number(inv.discount) || 0) - (Number(inv.customer_discount) || 0)
        const paid = calcInvoicePaid(inv)
        return total > 0 && paid < total
      })
    })

    // Unpaid POs/GRNs (ordered, partial, received but not marked paid)
    const unpaidPOs = grns.filter(g => !g.paid)

    // Contractor balances: work billed on jobs − payments in the ledger
    const contractorWork = jobs.reduce((s, j) => s + (j.jobCosts || []).filter(c => c.type === "outsource" && c.contractor).reduce((x, c) => x + (Number(c.cost) || 0), 0), 0)
    const contractorPaid = (contractorPayments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const contractorOwed = Math.max(0, contractorWork - contractorPaid)

    // Job type counts
    const insCount = jobs.filter(j => j.jobInfo?.job_type === "insurance" && j.stage !== "closed").length
    const directCount = jobs.filter(j => j.jobInfo?.job_type === "direct" && j.stage !== "closed").length
    const quickCount = jobs.filter(j => j.jobInfo?.job_type === "quick" && j.stage !== "closed").length

    // Customer registry entries
    const regEntries = Object.values(customerRegistry.byReg || {})

    // If a right tab is selected, show that content
    if (rightTab === "store") {
      return <div className="screen-fade">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span onClick={() => setRightTab(null)} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Back</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Store</span>
        </div>
        <StoreScreen purchaseOrders={purchaseOrders} grns={grns} setPurchaseOrders={setPurchaseOrders} setGrns={setGrns} cashBook={cashBook} setCashBook={setCashBook} tt={tt} initialTab={storeInitial.tab} initialScreen={storeInitial.screen} key={storeInitial.key} />
      </div>
    }

    if (rightTab === "registry") {
      // If a vehicle is selected, show its job history detail
      if (regSelectedVehicle) {
        const vehicleJobs = jobs.filter(j => regSearchKey(j.jobInfo.vehicle_reg) === regSelectedVehicle).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        const firstJob = vehicleJobs[0]
        return <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span onClick={() => setRegSelectedVehicle(null)} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Back</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{firstJob?.jobInfo.vehicle_reg || regSelectedVehicle}</span>
            <span style={{ fontSize: 14, color: C.muted }}>{firstJob?.jobInfo.vehicle_make} {firstJob?.jobInfo.vehicle_model}</span>
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>{firstJob?.jobInfo.customer_name} · {vehicleJobs.length} job{vehicleJobs.length !== 1 ? "s" : ""}</div>
          {vehicleJobs.map(j => <ClosedJobDetail key={j.id} job={j} openJob={openJob} startWarrantyJob={startWarrantyJob} />)}
        </div>
      }

      // Search filter
      const q = regSearch.toLowerCase().replace(/[\s\-]/g, "")
      const filteredEntries = q ? regEntries.filter(r =>
        regSearchKey(r.vehicle_reg).includes(q) ||
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.vehicle_make || "").toLowerCase().includes(q) ||
        (r.vehicle_model || "").toLowerCase().includes(q) ||
        (r.customer_phone || "").replace(/[\s\-]/g, "").includes(q)
      ) : regEntries

      return <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span onClick={() => { setRightTab(null); setRegSearch("") }} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Back</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Customer Registry</span>
        </div>
        <input value={regSearch} onChange={e => setRegSearch(e.target.value)} placeholder="Search vehicle, customer, phone..." style={{ ...inp, marginBottom: 12, width: "100%", boxSizing: "border-box" }} />
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{filteredEntries.length} vehicle{filteredEntries.length !== 1 ? "s" : ""}{q ? " found" : " registered"}</div>
        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><IconBadge name={q ? "search" : "users"} color={C.muted} size={56} /></div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{q ? "No matching vehicles" : "No vehicles registered yet"}</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>{q ? "Try a different search term" : "Vehicles are registered when jobs are created"}</div>
          </div>
        ) : filteredEntries.map(r => {
          const vehicleJobCount = jobs.filter(j => regSearchKey(j.jobInfo.vehicle_reg) === regSearchKey(r.vehicle_reg)).length
          return (
            <div key={r.vehicle_reg} onClick={() => setRegSelectedVehicle(regSearchKey(r.vehicle_reg))} style={{ ...card, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{r.vehicle_reg}</div>
                <div style={{ fontSize: 14, color: C.sub }}>{r.customer_name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{r.vehicle_make} {r.vehicle_model}{r.customer_phone ? ` · ${r.customer_phone}` : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{vehicleJobCount} job{vehicleJobCount !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 18, color: C.muted }}>›</div>
              </div>
            </div>
          )
        })}
      </div>
    }

    if (rightTab === "receivable") {
      const jobBalance = (j) => (j.invoices || []).reduce((s, inv) => {
        const t = calcInvoiceTotal(inv) - (Number(inv.discount) || 0) - (Number(inv.customer_discount) || 0)
        return s + Math.max(0, t - calcInvoicePaid(inv))
      }, 0)
      const totalReceivable = pendingPaymentJobs.reduce((sum, j) => sum + jobBalance(j), 0)
      // Group outstanding by insurer — the number you take to the insurer's office
      const byInsurer = {}
      pendingPaymentJobs.forEach(j => {
        const bal = jobBalance(j)
        if (bal <= 0) return
        const key = j.jobInfo?.insurance_name || (j.jobInfo?.job_type === "quick" ? "Walk-in / Quick" : "Direct Customers")
        if (!byInsurer[key]) byInsurer[key] = { total: 0, count: 0 }
        byInsurer[key].total += bal; byInsurer[key].count += 1
      })
      const insurerRows = Object.entries(byInsurer).sort((a, b) => b[1].total - a[1].total)
      return <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span onClick={() => setRightTab(null)} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Back</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Receivable</span>
        </div>
        {totalReceivable > 0 && (
          <div style={{ ...card, background: C.orange + "08", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.sub }}>Total Outstanding</span>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: C.orange }}>Rs.{totalReceivable.toLocaleString()}</span>
          </div>
        )}
        {insurerRows.length > 1 && (
          <div style={{ ...card, padding: "12px 16px", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>By Insurer</div>
            {insurerRows.map(([name, v]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{name} <span style={{ fontSize: 12, color: C.muted }}>· {v.count} job{v.count > 1 ? "s" : ""}</span></span>
                <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: C.orange }}>Rs.{v.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
        {pendingPaymentJobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><IconBadge name="checkCircle" color={C.green} size={56} /></div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>All payments received</div>
          </div>
        ) : pendingPaymentJobs.map(j => {
          const jobTotal = (j.invoices || []).reduce((s, inv) => {
            return s + (calcInvoiceTotal(inv) - (Number(inv.discount) || 0) - (Number(inv.customer_discount) || 0))
          }, 0)
          const jobBalance = (j.invoices || []).reduce((s, inv) => {
            const t = calcInvoiceTotal(inv) - (Number(inv.discount) || 0) - (Number(inv.customer_discount) || 0)
            return s + Math.max(0, t - calcInvoicePaid(inv))
          }, 0)
          if (jobBalance <= 0) return null
          const balance = jobBalance
          const total = jobTotal
          const stage = ALL_STAGES[j.stage] || ALL_STAGES.job_received
          return (
            <div key={j.id} onClick={() => openJob(j)} style={{ ...card, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{j.jobInfo.vehicle_reg}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, background: stage.color + "12", padding: "2px 8px", borderRadius: 6 }}>{stage.icon} {stage.label}</span>
                </div>
                <div style={{ fontSize: 14, color: C.sub }}>{j.jobInfo.customer_name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{j.jobInfo.insurance_name || (j.jobInfo.job_type === "quick" ? "Quick" : "Direct")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: C.orange }}>Rs.{balance.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: C.muted }}>of Rs.{total.toLocaleString()}</div>
              </div>
            </div>
          )
        })}
      </div>
    }

    if (rightTab === "cashbook") {
      return <CashBookScreen cashBook={cashBook} setCashBook={setCashBook} grns={grns} setGrns={setGrns} jobs={jobs} loadClosedJobs={loadClosedJobs} tt={tt} onBack={() => setRightTab(null)} />
    }

    if (rightTab === "contractors") {
      return <ContractorsScreen onBack={() => setRightTab(null)} />
    }

    if (rightTab === "assessors") {
      // Reference list of insurance assessors — built up from jobs as they're recorded
      const activeByAssessor = {}
      jobs.forEach(j => {
        const n = (j.jobInfo?.assessor_name || "").trim().toLowerCase()
        if (!n || j.stage === "closed" || j.stage === "cancelled") return
        activeByAssessor[n] = (activeByAssessor[n] || 0) + 1
      })
      return <div className="screen-fade">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span onClick={() => setRightTab(null)} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 600 }}>← Back</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Assessors</span>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Reference list — assessors are added automatically when you record them on a job.</div>
        {assessors.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><IconBadge name="userCheck" color={C.muted} size={56} /></div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No assessors recorded yet</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>Add an assessor name on an insurance job — it will appear here.</div>
          </div>
        ) : [...assessors].sort((a, b) => a.name.localeCompare(b.name)).map(a => (
          <div key={a.id} style={{ ...card, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{a.name}{activeByAssessor[a.name.toLowerCase()] ? <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, marginLeft: 8 }}>{activeByAssessor[a.name.toLowerCase()]} active job{activeByAssessor[a.name.toLowerCase()] > 1 ? "s" : ""}</span> : null}</div>
              <div style={{ fontSize: 13, color: C.sub }}>{a.phone || "No phone"}{a.insurance ? ` · ${a.insurance}` : ""}</div>
            </div>
            {a.phone && <div style={{ display: "flex", gap: 8 }}>
              <a href={`tel:+${phoneIntl(a.phone)}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: C.green + "10", border: `1px solid ${C.green}30`, textDecoration: "none" }}><Icon name="phone" size={18} color={C.green} /></a>
              <a href={`https://wa.me/${phoneIntl(a.phone)}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#25d36610", border: "1px solid #25d36630", textDecoration: "none" }}><Icon name="message" size={18} color="#25d366" /></a>
            </div>}
          </div>
        ))}
      </div>
    }

    if (rightTab === "payable") {
      return <PayableScreen unpaidPOs={unpaidPOs} setPurchaseOrders={setPurchaseOrders} setGrns={setGrns} cashBook={cashBook} setCashBook={setCashBook} tt={tt} onBack={() => setRightTab(null)} />
    }

    // Today's quick stats for hub summary
    const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
    const isTodayPay = (p) => { try { const d = new Date(p.date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` === todayStr } catch { return false } }
    const todayIncomeTotal = jobs.reduce((sum, j) =>
      sum
      + (j.invoices || []).reduce((s2, inv) => s2 + (inv.payments || []).filter(p => !p.advance_id && isTodayPay(p)).reduce((s3, p) => s3 + (p.amount || 0), 0), 0)
      + (j.advances || []).filter(isTodayPay).reduce((s2, a) => s2 + (a.amount || 0), 0)
    , 0)
    const activeCount = jobs.filter(j => !j.onHold && j.stage !== "closed" && j.stage !== "cancelled").length
    const hour = new Date().getHours()
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

    // Default: show hub cards
    return (
      <div className="screen-fade">
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>{greeting}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.text, letterSpacing: "-0.5px", marginTop: 2 }}>Workshop Hub</div>
        </div>

        {/* Quick action bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setRightTab("cashbook")} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: `1.5px solid ${C.red}30`, background: C.red + "08", color: C.red, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="plus" size={15} /> Petty Cash
          </button>
          <button onClick={startNewJob} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="plus" size={15} /> New Job
          </button>
        </div>

        {/* Today summary strip */}
        <div data-today-strip style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 110, ...card, padding: "10px 12px", background: C.accent + "08", border: `1px solid ${C.accent}20` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Active</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: MONO, color: C.accent, marginTop: 2 }}>{activeCount}</div>
          </div>
          <div style={{ flex: 1, minWidth: 110, ...card, padding: "10px 12px", background: C.green + "08", border: `1px solid ${C.green}20` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Today In</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO, color: C.green, marginTop: 2 }}>Rs.{todayIncomeTotal.toLocaleString()}</div>
          </div>
          <div onClick={() => setRightTab("cashbook")} style={{ flex: 1, minWidth: 110, ...card, padding: "10px 12px", background: C.orange + "08", border: `1px solid ${C.orange}20`, cursor: "pointer" }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Petty Cash</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO, color: C.orange, marginTop: 2 }}>Add</div>
          </div>
        </div>

        {/* ═══ ACTION QUEUE — what to work on today ═══ */}
        {(() => {
          const active = jobs.filter(j => !j.onHold && j.stage !== "closed" && j.stage !== "cancelled")
          const newJobsNoEst = active.filter(j => j.stage === "job_received" && (j.estimates || []).length === 0).length
          const estToSubmit = active.filter(j => j.stage === "est_pending").length
          const partsToOrder = active.filter(j => j.stage === "approved_dismantle").length
          const partsWaiting = active.filter(j => (j.estimates || []).flatMap(e => (e.approved_entries || e.entries || []).filter(en => en.category === "replace")).some(p => !j.partsArrived?.[p.id])).length
          const inQc = active.filter(j => j.stage === "qc").length
          const readyForDelivery = active.filter(j => j.stage === "ready").length
          const followUpsDue = jobs.filter(j => j.onHold && j.stage === "follow_up" && j.holdUntil && new Date(j.holdUntil) < new Date()).length

          const goToStage = (s) => { setSearchQuery(""); setHomeTab("active"); setFilterStage(s) }
          const goToOnHold = () => { setSearchQuery(""); setHomeTab("on_hold") }

          const items = [
            { count: newJobsNoEst,    icon: "edit",      label: "Estimates to create",      color: C.accent, onClick: () => goToStage("job_received") },
            { count: estToSubmit,     icon: "send",      label: "Estimates to submit",      color: C.orange, onClick: () => goToStage("est_pending") },
            { count: partsToOrder,    icon: "package",   label: "Parts to order",           color: C.orange, onClick: () => goToStage("approved_dismantle") },
            { count: partsWaiting,    icon: "clock",     label: "Parts not yet arrived",    color: C.purple, onClick: () => goToStage("parts_waiting") },
            { count: inQc,            icon: "search",    label: "Jobs in QC",               color: C.green,  onClick: () => goToStage("qc") },
            { count: readyForDelivery,icon: "car",       label: "Ready for delivery",       color: C.green,  onClick: () => goToStage("ready") },
            { count: followUpsDue,    icon: "phone",     label: "Follow-ups due",           color: C.red,    onClick: goToOnHold },
          ].filter(i => i.count > 0)

          if (items.length === 0) return null
          return (
            <div style={{ ...card, padding: "12px 14px", marginBottom: 16, border: `1px solid ${C.accent}25` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
                Needs Your Attention
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map(it => (
                  <div key={it.label} onClick={it.onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, cursor: "pointer", background: it.color + "08", border: `1px solid ${it.color}20`, transition: "all 0.15s" }}>
                    <Icon name={it.icon} size={18} color={it.color} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text, flex: 1 }}>{it.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: it.color, minWidth: 28, textAlign: "right" }}>{it.count}</span>
                    <span style={{ fontSize: 16, color: it.color, opacity: 0.6 }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        <div data-hub-grid style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Store — 2x2 grid */}
          <div style={{ ...card, padding: "14px 12px", border: `1px solid ${C.purple}20` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Store</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { tab: "pos", screen: "list", icon: "fileText", label: "POs", color: C.accent, count: purchaseOrders.filter(p => p.status !== "received").length },
                { tab: "grns", screen: "list", icon: "inbox", label: "GRNs", color: C.green, count: grns.length },
                { tab: "grns", screen: "direct_grn", icon: "bag", label: "Direct Purchase", color: C.orange },
                { tab: "suppliers", screen: "list", icon: "users", label: "Suppliers", color: C.purple, count: [...new Set([...purchaseOrders.map(p=>p.supplier),...grns.map(g=>g.supplier)].filter(Boolean))].length },
              ].map(s => (
                <div key={s.label} onClick={() => { setStoreInitial(prev => ({ tab: s.tab, screen: s.screen, key: prev.key + 1 })); setRightTab("store") }}
                  style={{ textAlign: "center", padding: "10px 4px", borderRadius: 10, cursor: "pointer", background: s.color + "08", border: `1px solid ${s.color}15`, transition: "all 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 5 }}><Icon name={s.icon} size={20} color={s.color} /></div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{s.label}</div>
                  {s.count != null && <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.count}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* New Job Buttons */}
          <div style={{ ...card, padding: "16px", border: `1px solid ${C.accent}20`, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>New Job</div>
            {[
              { key: "insurance", label: "Insurance", icon: "shield", color: C.accent, count: insCount },
              { key: "direct", label: "Non-Insurance", icon: "banknote", color: C.green, count: directCount },
              { key: "quick", label: "Quick Job", icon: "zap", color: C.orange, count: quickCount },
            ].map(t => (
              <div key={t.key} onClick={() => { startNewJob(); setNewJobInfo(prev => ({ ...prev, job_type: t.key })) }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", background: t.color + "08", border: `1px solid ${t.color}20`, transition: "all 0.2s" }}>
                <Icon name={t.icon} size={18} color={t.color} />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text, flex: 1 }}>{t.label}</span>
                <span style={{ fontSize: 12, fontFamily: MONO, fontWeight: 700, color: t.color }}>{t.count}</span>
              </div>
            ))}
          </div>

          {/* Customer Registry */}
          <div data-card-hover onClick={() => setRightTab("registry")} style={{ ...card, cursor: "pointer", padding: "20px 16px", textAlign: "center", border: `1px solid ${C.green}20` }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><IconBadge name="users" color={C.green} size={44} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Customers</div>
            <div style={{ fontSize: 13, color: C.muted }}>Registry</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.green, marginTop: 8 }}>{regEntries.length} vehicles</div>
          </div>

          {/* Assessor reference list */}
          <div data-card-hover onClick={() => setRightTab("assessors")} style={{ ...card, cursor: "pointer", padding: "20px 16px", textAlign: "center", border: `1px solid ${C.purple}20` }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><IconBadge name="userCheck" color={C.purple} size={44} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Assessors</div>
            <div style={{ fontSize: 13, color: C.muted }}>Insurance contacts</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.purple, marginTop: 8 }}>{assessors.length} saved</div>
          </div>

          {/* Receivable — pending insurance / credit payments */}
          <div data-card-hover onClick={() => { loadClosedJobs(); setRightTab("receivable") }} style={{ ...card, cursor: "pointer", padding: "20px 16px", textAlign: "center", border: `1px solid ${pendingPaymentJobs.length > 0 ? C.orange : C.border}20` }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><IconBadge name="banknote" color={C.orange} size={44} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Receivable</div>
            <div style={{ fontSize: 13, color: C.muted }}>Credit & Insurance</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: pendingPaymentJobs.length > 0 ? C.orange : C.green, marginTop: 8 }}>
              {pendingPaymentJobs.length > 0 ? `${pendingPaymentJobs.length} pending` : "All clear"}
            </div>
          </div>

          {/* Payable — unpaid purchases */}
          <div data-card-hover onClick={() => setRightTab("payable")} style={{ ...card, cursor: "pointer", padding: "20px 16px", textAlign: "center", border: `1px solid ${unpaidPOs.length > 0 ? C.red : C.border}20` }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><IconBadge name="creditCard" color={C.red} size={44} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Payable</div>
            <div style={{ fontSize: 13, color: C.muted }}>Unpaid Purchases</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: unpaidPOs.length > 0 ? C.red : C.green, marginTop: 8 }}>
              {unpaidPOs.length > 0 ? `${unpaidPOs.length} unpaid` : "All clear"}
            </div>
          </div>

          {/* Cash Book */}
          <div data-card-hover onClick={() => setRightTab("cashbook")} style={{ ...card, cursor: "pointer", padding: "20px 16px", textAlign: "center", border: `1px solid ${C.accent}20` }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><IconBadge name="bookOpen" color={C.accent} size={44} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Cash Book</div>
            <div style={{ fontSize: 13, color: C.muted }}>Petty Cash · Expenses · Bank</div>
            <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.accent, marginTop: 8 }}>
              Cash Rs.{(cashBook.openingCash || 0).toLocaleString()}
            </div>
          </div>

          {/* Contractors */}
          <div data-card-hover onClick={() => setRightTab("contractors")} style={{ ...card, cursor: "pointer", padding: "20px 16px", textAlign: "center", border: `1px solid ${C.purple}20` }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><IconBadge name="users" color={C.purple} size={44} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Contractors</div>
            <div style={{ fontSize: 13, color: C.muted }}>Sub-contract accounts</div>
            <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: contractorOwed > 0 ? C.orange : C.green, marginTop: 8 }}>
              {contractorOwed > 0 ? `Rs.${contractorOwed.toLocaleString()} owed` : "All settled"}
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts hint (desktop only) */}
        <div className="desktop-only" style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: C.muted, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <span><kbd style={{ padding: "2px 6px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 10 }}>N</kbd> New job</span>
          <span><kbd style={{ padding: "2px 6px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 10 }}>/</kbd> Search</span>
          <span><kbd style={{ padding: "2px 6px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: MONO, fontSize: 10 }}>Esc</kbd> Back</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: FONT, background: C.bg, color: C.text, minHeight: "100vh", display: isTablet ? "flex" : "block" }}>
      {/* TABLET: Left sidebar */}
      {isTablet && (
        <div onClick={() => { if (sidebarCollapsed) setSidebarExpanded(true) }} style={{ width: sidebarCollapsed ? 82 : 380, minWidth: sidebarCollapsed ? 82 : 380, height: "100vh", position: "sticky", top: 0, overflowY: "auto", overflowX: "hidden", borderRight: `1px solid ${C.border}`, padding: sidebarCollapsed ? "8px 6px" : "0 16px", background: C.bg, transition: "width 0.25s ease, min-width 0.25s ease, padding 0.25s ease", cursor: sidebarCollapsed ? "pointer" : "default" }}>
          {sidebarCollapsed ? (
            <>
              {/* Collapsed: mini thumbnails + reg */}
              <div style={{ textAlign: "center", padding: "10px 0 8px", marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 1 }}>JOBS</div>
                <div style={{ fontSize: 11, color: C.muted }}>{jobs.filter(j => !j.onHold && j.stage !== "closed" && j.stage !== "cancelled").length}</div>
              </div>
              {(() => {
                let filtered = homeTab === "on_hold" ? jobs.filter(j => j.onHold) : homeTab === "closed" ? jobs.filter(j => j.stage === "closed") : jobs.filter(j => !j.onHold && j.stage !== "closed" && j.stage !== "cancelled")
                return filtered.map(j => {
                  const stage = ALL_STAGES[j.stage] || ALL_STAGES.job_received
                  const thumb = (j.jobDocs || [])[0]?.dataUrl
                  const isSel = activeJobId === j.id
                  return (
                    <div key={j.id} onClick={e => { e.stopPropagation(); setHoverJobId(null); openJob(j); setSidebarExpanded(false) }} onMouseEnter={e => { setHoverJobId(j.id); setHoverY(e.clientY) }} onMouseLeave={() => setHoverJobId(null)} style={{ marginBottom: 6, cursor: "pointer", borderRadius: 12, overflow: "hidden", border: isSel ? `2px solid ${C.accent}` : `2px solid transparent`, background: isSel ? C.accent + "08" : C.card, transition: "all 0.2s" }}>
                      {thumb ? <SecureImg src={thumb} style={{ width: "100%", height: 52, objectFit: "cover", display: "block" }} alt="" /> : <div style={{ width: "100%", height: 52, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="car" size={20} color={C.muted} /></div>}
                      <div style={{ padding: "4px 4px 5px", textAlign: "center" }}>
                        <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.jobInfo.vehicle_reg || "--"}</div>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: stage.color, margin: "3px auto 0" }} />
                      </div>
                    </div>
                  )
                })
              })()}
              <div onClick={e => { e.stopPropagation(); setSidebarExpanded(true) }} style={{ textAlign: "center", padding: "10px 0", cursor: "pointer" }}>
                <div style={{ fontSize: 18, color: C.accent }}>▸</div>
              </div>
            </>
          ) : (
            <>
              {/* Expanded: full job list */}
              {isDetailScreen && (
                <div onClick={() => setSidebarExpanded(false)} style={{ textAlign: "right", padding: "10px 4px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>◂ Collapse</span>
                </div>
              )}
              {jobListPanel()}
            </>
          )}
        </div>
      )}

      {/* TABLET: Vehicle photo popup on hover (only in collapsed sidebar, not when job is selected) */}
      {isTablet && hoverJobId && hoverJobId !== activeJobId && sidebarCollapsed && (() => {
        const hj = jobs.find(j => j.id === hoverJobId)
        const photo = (hj?.jobDocs || [])[0]?.dataUrl
        return photo ? (
          <div style={{ position: "fixed", left: 90, top: Math.min(hoverY - 40, window.innerHeight - 240), zIndex: 200, background: C.card, borderRadius: 16, padding: 6, boxShadow: "0 12px 40px rgba(0,0,0,0.22)", border: `1px solid ${C.border}`, pointerEvents: "none" }}>
            <SecureImg src={photo} style={{ width: 240, height: 180, objectFit: "cover", borderRadius: 12 }} alt="" />
            <div style={{ padding: "6px 8px", fontSize: 14, fontWeight: 700, color: C.sub, textAlign: "center" }}>{hj.jobInfo.vehicle_reg} · {hj.jobInfo.vehicle_make}</div>
          </div>
        ) : null
      })()}

      {/* Main content */}
      <div style={{ flex: isTablet ? 1 : undefined, maxWidth: isTablet ? undefined : 480, margin: isTablet ? undefined : "0 auto", padding: isTablet ? "16px 28px" : "14px 16px", paddingTop: isTablet ? 16 : "max(14px, env(safe-area-inset-top))", paddingBottom: !isTablet && screen === "home" ? "max(90px, calc(90px + env(safe-area-inset-bottom)))" : "max(100px, calc(100px + env(safe-area-inset-bottom)))", minHeight: "100vh", overflowY: isTablet ? "auto" : undefined, maxHeight: isTablet ? "100vh" : undefined }}>

        {/* Toast */}
        {toast && <div key={toast} className="toast-appear" style={{ position: "fixed", top: "max(20px, calc(20px + env(safe-area-inset-top)))", left: "50%", transform: "translateX(-50%)", background: /⚠️|❌|❗|error|failed|blocked|wrong|invalid|outstanding/i.test(toast) ? C.red : /⏳|uploading/i.test(toast) ? C.accent : /✓|✅|success|saved|added|recorded|done|nice|🎉|👏|💵|💰/i.test(toast) ? C.green : C.text, color: "#fff", padding: "14px 22px", borderRadius: 14, fontWeight: 600, fontSize: 16, zIndex: 3000, boxShadow: "0 8px 40px rgba(0,0,0,0.25)", maxWidth: "min(92vw, 500px)", textAlign: "center" }}>{toast}</div>}

        {/* Hidden file inputs */}
        <input ref={uploadRef} type="file" accept="image/*" style={{ display: "none" }} id="galleryInput" onChange={async e => { const f = e.target.files[0]; if (f) { const label = showUploadMenu === "approval" && selEst ? (selEst.type === "supplementary" ? selEst.label : "Estimate") : photoTag; const docId = "d_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6); tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/${docId}.jpg`); setJobDocs(p => [...p, { id: docId, dataUrl: url, estId: selEst?.id || null, label }]); tt(`📸 ${label} photo saved`); setShowUploadMenu(null); setPhotoTag("General") } catch { tt("❌ Upload failed") } } e.target.value = "" }} />
        <input id="camInput" type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={async e => { const f = e.target.files[0]; if (f) { const label = showUploadMenu === "approval" && selEst ? (selEst.type === "supplementary" ? selEst.label : "Estimate") : photoTag; const docId = "d_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6); tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/${docId}.jpg`); setJobDocs(p => [...p, { id: docId, dataUrl: url, estId: selEst?.id || null, label }]); tt(`📸 ${label} photo saved`); setShowUploadMenu(null); setPhotoTag("General") } catch { tt("❌ Upload failed") } } e.target.value = "" }} />

        {/* Image full screen viewer */}
        {showImage && (() => {
          const d = jobDocs.find(x => x.id === showImage)
          return d ? (
            <div onClick={() => setShowImage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
              {d.label && <div style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>{d.label}</div>}
              <SecureImg src={d.dataUrl} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 16 }} alt="" />
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button onClick={(e) => { e.stopPropagation(); setShowImage(null) }} style={{ ...btnSm("#fff", C.text), width: "auto", padding: "14px 40px" }}>Close</button>
                <button onClick={async (e) => {
                  e.stopPropagation()
                  if (!confirm("Delete this photo?")) return
                  try {
                    await deletePhoto(d.dataUrl)
                    setJobDocs(prev => prev.filter(x => x.id !== d.id))
                    setShowImage(null)
                    tt("🗑️ Photo deleted")
                  } catch (err) {
                    console.error("Delete failed:", err)
                    tt("❌ Failed to delete photo")
                  }
                }} style={{ ...btnSm("#ff3b30", "#fff"), width: "auto", padding: "14px 40px" }}>🗑️ Delete</button>
              </div>
            </div>
          ) : null
        })()}

        {/* Upload sheet */}
        {showUploadMenu && (
          <Sheet onClose={() => { setShowUploadMenu(null); setPhotoTag("General") }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>{showUploadMenu === "approval" ? "Upload Approved Copy" : "Add Photo"}</div>
            {showUploadMenu !== "approval" && (
              <>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, textAlign: "center" }}>Tag this photo</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
                  {["Vehicle", "Before", "After", ...estimates.flatMap(e => (e.parts || []).map(p => p.name)).filter((v, i, a) => a.indexOf(v) === i), "General"].map(tag => {
                    const tagColor = tag === "Vehicle" ? C.accent : tag === "Before" ? C.orange : tag === "After" ? C.green : C.sub
                    return <div key={tag} onClick={() => setPhotoTag(tag)} style={{ padding: "6px 14px", borderRadius: 20, background: photoTag === tag ? tagColor + "18" : C.bg, border: `2px solid ${photoTag === tag ? tagColor : C.border}`, color: photoTag === tag ? tagColor : C.muted, fontSize: 14, fontWeight: photoTag === tag ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>{tag}</div>
                  })}
                </div>
              </>
            )}
            <button onClick={() => document.getElementById("camInput").click()} style={{ ...btn(C.bg, C.text), marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 16 }}>
              <span style={{ fontSize: 26 }}>📷</span> Take Photo
            </button>
            <button onClick={() => document.getElementById("galleryInput").click()} style={{ ...btn(C.bg, C.text), marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 16 }}>
              <span style={{ fontSize: 26 }}>🖼️</span> Choose from Gallery
            </button>
            <button onClick={() => { setShowUploadMenu(null); setPhotoTag("General") }} style={{ ...btn("transparent", C.sub) }}>Cancel</button>
          </Sheet>
        )}

        {/* Sub-flow pause/continue prompt */}
        {showSubFlowPrompt && (
          <Sheet onClose={() => setShowSubFlowPrompt(false)}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Supplementary Added</div>
            <div style={{ fontSize: 16, color: C.sub, textAlign: "center", marginBottom: 20 }}>Should the main job pause while this supplementary is processed?</div>
            <button onClick={() => { setJobPaused(true); setShowSubFlowPrompt(false); tt("⏸ Main job paused") }} style={{ ...btn(C.orange, "#fff"), marginBottom: 10 }}>⏸ Pause Main Job</button>
            <button onClick={() => { setJobPaused(false); setShowSubFlowPrompt(false); tt("▶ Continuing alongside") }} style={{ ...btn(C.green, "#fff"), marginBottom: 10 }}>▶ Continue Alongside</button>
          </Sheet>
        )}

        {/* Parts Quotation / PO Editor overlay */}
        {showPQScreen && (
          <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 999, overflowY: "auto", padding: "0 20px 40px" }}>
            <NavBar title={isInsurance ? "Parts Quotation" : "Purchase Order"} subtitle={`${jobInfo.vehicle_reg} · ${partsQuotation.length} parts`} onBack={() => setShowPQScreen(false)} right={<div style={{ display: "flex", gap: 6 }}>
              {isInsurance && <button onClick={generatePQPDF} style={{ ...btnSm(C.purple, "#fff"), padding: "8px 12px" }}>📄</button>}
              <button onClick={() => sharePQ("whatsapp")} style={{ ...btnSm(C.green, "#fff"), padding: "8px 12px" }}>📱</button>
              <button onClick={() => sharePQ("copy")} style={{ ...btnSm(C.bg, C.sub), padding: "8px 12px" }}>📋</button>
            </div>} />

            {isInsurance && <>
              {/* Quote / Approve / Costs tabs */}
              <div style={{ display: "flex", gap: 0, marginBottom: 14, background: C.card, borderRadius: 14, padding: 4 }}>
                <div onClick={() => setPqTab("quote")} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: pqTab === "quote" ? C.purple + "12" : "transparent", color: pqTab === "quote" ? C.purple : C.muted, fontSize: 14, fontWeight: 600 }}>📝 Quote</div>
                <div onClick={() => setPqTab("approve")} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: pqTab === "approve" ? C.green + "12" : "transparent", color: pqTab === "approve" ? C.green : C.muted, fontSize: 14, fontWeight: 600 }}>✓ Approve</div>
                <div onClick={() => setPqTab("cost")} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: pqTab === "cost" ? C.accent + "12" : "transparent", color: pqTab === "cost" ? C.accent : C.muted, fontSize: 14, fontWeight: 600 }}>💰 Costs</div>
              </div>

              {/* QUOTE TAB */}
              {pqTab === "quote" && <>
                <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Fill supplier name &amp; quoted price for each part, then send to insurance for price approval.</div>
                {partsQuotation.map((p, idx) => (
                  <div key={p.id} style={{ ...card, padding: "14px 16px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 600 }}>{idx + 1}. {p.partName}</span>
                      <span style={{ fontSize: 13, color: C.muted, background: C.bg, padding: "3px 8px", borderRadius: 6 }}>{p.remarks}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Supplier</div>
                        <input value={p.supplier} disabled={pqStatus === "approved"} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, supplier: e.target.value } : x))} placeholder="Toyota Lanka" style={{ ...inp, fontSize: 16, opacity: pqStatus === "approved" ? 0.6 : 1 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Quoted Price {pqStatus === "approved" && <span style={{ color: C.orange, fontSize: 10, fontWeight: 600 }}>🔒 LOCKED</span>}</div>
                        <input type="number" value={p.quotedPrice === null ? "" : p.quotedPrice} disabled={pqStatus === "approved"} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, quotedPrice: e.target.value === "" ? null : Number(e.target.value) } : x))} placeholder="0" style={{ ...inp, fontSize: 20, fontFamily: MONO, fontWeight: 700, textAlign: "right", opacity: pqStatus === "approved" ? 0.6 : 1 }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ ...card, background: C.purple + "08", textAlign: "center", marginTop: 4 }}>
                  <div style={{ fontSize: 14, color: C.sub }}>Quoted Total</div>
                  <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.purple }}>Rs.{pqTotalPrice.toLocaleString()}</div>
                  <div style={{ fontSize: 13, color: pqAllFilled ? C.green : C.orange, marginTop: 4, fontWeight: 600 }}>{pqAllFilled ? "✓ All parts priced" : `${pqTotal - pqFilled} parts need pricing`}</div>
                </div>
                {pqAllFilled && pqStatus === "draft" && <button onClick={() => { setPqStatus("submitted"); tt("📤 Submitted to insurance"); setPqTab("approve") }} style={{ ...btn(C.purple, "#fff"), marginTop: 12 }}>📤 Mark as Submitted to Insurance</button>}
                {pqStatus !== "draft" && <div style={{ textAlign: "center", marginTop: 10, fontSize: 14, color: C.green, fontWeight: 600 }}>✓ Submitted to insurance</div>}
              </>}

              {/* APPROVE TAB */}
              {pqTab === "approve" && <>
                <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Record insurance-approved prices and attach approval photo.</div>
                <div style={{ ...card, textAlign: "center", padding: "12px 16px", border: `2px solid ${pqStatus === "approved" ? C.green : C.orange}30`, marginBottom: 12 }}>
                  <span style={pill(pqStatus === "approved" ? C.green : pqStatus === "submitted" ? C.orange : C.muted)}>{pqStatus === "approved" ? "✓ Approved" : pqStatus === "submitted" ? "⏳ Awaiting Approval" : "Draft"}</span>
                </div>
                <div style={{ display: "flex", gap: 0, marginBottom: 14, background: C.card, borderRadius: 14, padding: 4 }}>
                  <div onClick={() => setPqLumpMode(false)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: !pqLumpMode ? C.accent + "12" : "transparent", color: !pqLumpMode ? C.accent : C.muted, fontSize: 14, fontWeight: 600 }}>Per Part</div>
                  <div onClick={() => setPqLumpMode(true)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: pqLumpMode ? C.accent + "12" : "transparent", color: pqLumpMode ? C.accent : C.muted, fontSize: 14, fontWeight: 600 }}>Lump Sum</div>
                </div>
                {!pqLumpMode ? <>
                  {partsQuotation.map((p, idx) => (
                    <div key={p.id} style={{ ...card, padding: "12px 16px", marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 500 }}>{idx + 1}. {p.partName}</span>
                        <span style={{ fontFamily: MONO, fontSize: 14, color: C.muted }}>Quoted: {p.quotedPrice?.toLocaleString() || "--"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, color: C.sub, width: 70 }}>Approved</span>
                        <input type="number" value={p.approvedPrice === null ? "" : p.approvedPrice} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, approvedPrice: e.target.value === "" ? null : Number(e.target.value) } : x))} placeholder={p.quotedPrice?.toString() || "0"} style={{ flex: 1, ...inp, fontSize: 20, fontFamily: MONO, fontWeight: 700, textAlign: "right", border: `2px solid ${p.approvedPrice !== null ? (p.approvedPrice < (p.quotedPrice || 0) ? C.red + "40" : C.green + "40") : C.border}` }} />
                      </div>
                      {p.approvedPrice !== null && p.approvedPrice < (p.quotedPrice || 0) && <div style={{ fontSize: 13, color: C.red, marginTop: 4 }}>Cut Rs.{((p.quotedPrice || 0) - p.approvedPrice).toLocaleString()}</div>}
                    </div>
                  ))}
                  <div style={{ ...card, textAlign: "center", background: C.green + "06" }}>
                    <div style={{ fontSize: 14, color: C.sub }}>Approved Total</div>
                    <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.green }}>Rs.{pqApprovedTotal.toLocaleString()}</div>
                  </div>
                </> : <>
                  <div style={{ ...card, padding: "16px" }}>
                    <div style={{ fontSize: 14, color: C.sub, marginBottom: 8 }}>Insurance approved lump sum for all parts:</div>
                    <input type="number" value={pqLumpSum === null ? "" : pqLumpSum} onChange={e => setPqLumpSum(e.target.value === "" ? null : Number(e.target.value))} placeholder="Total approved amount" style={{ ...inp, fontSize: 28, fontFamily: MONO, fontWeight: 700, textAlign: "center" }} />
                    {pqLumpSum > 0 && pqTotalPrice > 0 && pqLumpSum < pqTotalPrice && <div style={{ fontSize: 14, color: C.red, marginTop: 8, textAlign: "center" }}>Cut Rs.{(pqTotalPrice - pqLumpSum).toLocaleString()} ({Math.round(((pqTotalPrice - pqLumpSum) / pqTotalPrice) * 100)}%)</div>}
                  </div>
                </>}
                <div style={{ ...card, padding: "14px 16px", marginTop: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, marginBottom: 8 }}>📷 Approval Photo</div>
                  {pqApprovalPhoto ? (
                    <div style={{ position: "relative" }}>
                      <SecureImg src={pqApprovalPhoto} style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} alt="Approval" />
                      <span onClick={() => setPqApprovalPhoto(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 20, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>×</span>
                    </div>
                  ) : (
                    <div onClick={() => pqPhotoRef.current?.click()} style={{ padding: "24px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.muted }}>
                      <div style={{ fontSize: 32, marginBottom: 4 }}>📷</div>
                      <div style={{ fontSize: 15 }}>Tap to attach approval photo</div>
                    </div>
                  )}
                  <input ref={pqPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={async e => { const f = e.target.files?.[0]; if (f) { tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/pq-approval-${Date.now()}.jpg`); setPqApprovalPhoto(url); tt("📷 Approval photo saved") } catch { tt("❌ Upload failed") } } }} />
                </div>
                {pqStatus !== "approved" && (
                  <button onClick={() => {
                    if (!pqHasApproval) { tt("⚠️ Enter approved prices first"); return }
                    if (!pqApprovalPhoto) { tt("⚠️ Attach approval photo first"); return }
                    setPqStatus("approved"); tt("✓ Parts prices approved")
                  }} style={{ ...btn(C.green, "#fff"), marginTop: 12 }}>✓ Confirm Prices Approved</button>
                )}
                {pqStatus === "approved" && (
                  <div style={{ ...card, textAlign: "center", background: C.green + "06", marginTop: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: C.green }}>✓ Parts Prices Approved</span>
                    <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>Rs.{pqApprovedTotal.toLocaleString()} approved · Photo attached</div>
                  </div>
                )}
              </>}

              {/* COST TAB */}
              {pqTab === "cost" && <>
                {pqStatus !== "approved" ? (
                  <div style={{ ...card, textAlign: "center", padding: "30px 16px" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.sub }}>Prices not yet approved</div>
                    <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Complete the Approve tab first</div>
                  </div>
                ) : <>
                  <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Enter actual cost per part. Supplier invoice is at approved price — your margin is the difference.</div>
                  {partsQuotation.map((p, idx) => {
                    const margin = (p.approvedPrice || 0) - (p.actualCost || 0)
                    const hasMargin = p.actualCost > 0 && p.approvedPrice > 0
                    return (
                      <div key={p.id} style={{ ...card, padding: "14px 16px", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 600 }}>{idx + 1}. {p.partName}</span>
                          <span style={{ fontFamily: MONO, fontSize: 14, color: C.green, fontWeight: 600 }}>Appr: {p.approvedPrice?.toLocaleString() || "--"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 0, marginBottom: 8, background: C.bg, borderRadius: 10, padding: 3 }}>
                          <div onClick={() => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, suppliedBy: "supplier" } : x))} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, cursor: "pointer", background: p.suppliedBy === "supplier" ? C.accent + "15" : "transparent", color: p.suppliedBy === "supplier" ? C.accent : C.muted, fontSize: 13, fontWeight: 600 }}>🏭 Supplier</div>
                          <div onClick={() => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, suppliedBy: "insurance", actualCost: 0 } : x))} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, cursor: "pointer", background: p.suppliedBy === "insurance" ? C.orange + "15" : "transparent", color: p.suppliedBy === "insurance" ? C.orange : C.muted, fontSize: 13, fontWeight: 600 }}>🛡️ Insurance Supplied</div>
                        </div>
                        {p.suppliedBy === "supplier" && (
                          <div>
                            <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Actual Cost (what you paid)</div>
                            <input type="number" value={p.actualCost || ""} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, actualCost: e.target.value === "" ? 0 : Number(e.target.value) } : x))} placeholder="0" style={{ ...inp, fontSize: 20, fontFamily: MONO, fontWeight: 700, textAlign: "right" }} />
                            {hasMargin && (
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "6px 10px", background: margin > 0 ? C.green + "08" : C.red + "08", borderRadius: 8 }}>
                                <span style={{ fontSize: 14, color: margin > 0 ? C.green : C.red, fontWeight: 600 }}>Margin</span>
                                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: margin > 0 ? C.green : C.red }}>Rs.{margin.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {p.suppliedBy === "insurance" && <div style={{ padding: "8px 12px", background: C.orange + "08", borderRadius: 8, fontSize: 14, color: C.orange, fontWeight: 500 }}>Insurance supplied this part directly -- no cost to workshop</div>}
                      </div>
                    )
                  })}
                  {(() => {
                    const supplierParts = partsQuotation.filter(p => p.suppliedBy === "supplier" && p.actualCost > 0)
                    const insParts = partsQuotation.filter(p => p.suppliedBy === "insurance")
                    const totalApproved = supplierParts.reduce((s, p) => s + (p.approvedPrice || 0), 0)
                    const totalActual = supplierParts.reduce((s, p) => s + (p.actualCost || 0), 0)
                    const totalMargin = totalApproved - totalActual
                    const allFilled = partsQuotation.every(p => p.suppliedBy)
                    return <>
                      {supplierParts.length > 0 && (
                        <div style={{ ...card, background: totalMargin > 0 ? C.green + "06" : C.red + "06", textAlign: "center" }}>
                          <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>Parts Margin Summary</div>
                          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 6 }}>
                            <div><div style={{ fontSize: 11, color: C.muted }}>Approved</div><div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>Rs.{totalApproved.toLocaleString()}</div></div>
                            <div><div style={{ fontSize: 11, color: C.muted }}>Actual</div><div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>Rs.{totalActual.toLocaleString()}</div></div>
                            <div><div style={{ fontSize: 11, color: C.muted }}>Margin</div><div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: totalMargin > 0 ? C.green : C.red }}>Rs.{totalMargin.toLocaleString()}</div></div>
                          </div>
                          {insParts.length > 0 && <div style={{ fontSize: 13, color: C.orange }}>+ {insParts.length} part{insParts.length > 1 ? "s" : ""} supplied by insurance</div>}
                        </div>
                      )}
                      {!allFilled && <div style={{ fontSize: 13, color: C.orange, textAlign: "center", marginTop: 8 }}>⚠️ Select supplier/insurance for all parts</div>}
                    </>
                  })()}
                  <div style={{ ...card, padding: "14px 16px", marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.sub }}>📄 Supplier Invoices</span>
                      <span style={{ fontSize: 13, color: C.muted }}>{supplierInvoices.length} attached</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Invoices at insurance-approved prices to submit to insurance</div>
                    {supplierInvoices.map((inv, idx) => (
                      <div key={inv.id} style={{ background: C.bg, borderRadius: 12, padding: 10, marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{inv.supplierName || `Invoice ${idx + 1}`}</span>
                          <span onClick={() => setSupplierInvoices(prev => prev.filter(x => x.id !== inv.id))} style={{ fontSize: 13, color: C.red, cursor: "pointer", fontWeight: 600 }}>Remove</span>
                        </div>
                        {inv.photo && <SecureImg src={inv.photo} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 10, marginBottom: 6 }} alt="" />}
                      </div>
                    ))}
                    {showSupplierInvForm ? (
                      <div style={{ background: C.bg, borderRadius: 12, padding: 12, border: `2px dashed ${C.accent}40` }}>
                        <input id="suppInvName" placeholder="Supplier name" style={{ ...inp, fontSize: 16, marginBottom: 8 }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <div onClick={() => { const inp2 = document.createElement("input"); inp2.type = "file"; inp2.accept = "image/*"; inp2.capture = "environment"; inp2.onchange = async e => { const f = e.target.files?.[0]; if (f) { const name = document.getElementById("suppInvName")?.value || "Supplier"; const sid = "si" + Date.now(); tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/supp-inv-${sid}.jpg`); setSupplierInvoices(prev => [...prev, { id: sid, supplierName: name, photo: url }]); setShowSupplierInvForm(false); tt("📄 Invoice attached") } catch { tt("❌ Upload failed") } } }; inp2.click() }} style={{ flex: 1, padding: "20px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.muted }}>
                            <div style={{ fontSize: 24, marginBottom: 2 }}>📷</div>
                            <div style={{ fontSize: 13 }}>Camera</div>
                          </div>
                          <div onClick={() => { const inp2 = document.createElement("input"); inp2.type = "file"; inp2.accept = "image/*"; inp2.onchange = async e => { const f = e.target.files?.[0]; if (f) { const name = document.getElementById("suppInvName")?.value || "Supplier"; const sid = "si" + Date.now(); tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/supp-inv-${sid}.jpg`); setSupplierInvoices(prev => [...prev, { id: sid, supplierName: name, photo: url }]); setShowSupplierInvForm(false); tt("📄 Invoice attached") } catch { tt("❌ Upload failed") } } }; inp2.click() }} style={{ flex: 1, padding: "20px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.muted }}>
                            <div style={{ fontSize: 24, marginBottom: 2 }}>🖼️</div>
                            <div style={{ fontSize: 13 }}>Gallery</div>
                          </div>
                        </div>
                        <div onClick={() => setShowSupplierInvForm(false)} style={{ textAlign: "center", fontSize: 14, color: C.muted, marginTop: 8, cursor: "pointer" }}>Cancel</div>
                      </div>
                    ) : (
                      <button onClick={() => setShowSupplierInvForm(true)} style={{ ...btn(C.bg, C.accent), border: `1px solid ${C.accent}30`, fontSize: 15 }}>+ Add Supplier Invoice</button>
                    )}
                  </div>
                </>}
              </>}
            </>}

            {isDirectJob && <>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Purchase order for your purchasing office. Share via WhatsApp.</div>
              {partsQuotation.map((p, idx) => (
                <div key={p.id} style={{ ...card, padding: "12px 16px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 17, fontWeight: 500 }}>{idx + 1}. {p.partName}</span>
                    <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>({p.remarks})</span>
                  </div>
                </div>
              ))}
              {!customerConfirmed && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 14, color: C.orange, marginBottom: 8, fontWeight: 500 }}>⚠️ Customer hasn't confirmed — PO not sent</div>
                  <button onClick={() => { confirmCustomer(); setShowPQScreen(false) }} style={{ ...btn(C.accent, "#fff") }}>✓ Customer Confirmed</button>
                </div>
              )}
              {customerConfirmed && <div style={{ fontSize: 14, color: C.green, fontWeight: 600, textAlign: "center", marginTop: 14 }}>✓ Customer confirmed -- share PO with purchasing</div>}
            </>}

            <button onClick={() => setShowPQScreen(false)} style={{ ...btn(C.bg, C.sub), marginTop: 16 }}>Done</button>
          </div>
        )}

        {/* Floating doc ref button */}
        {jobDocs.length > 0 && (screen === "approve_entry" || screen === "inv_detail") && (() => {
          const relevantDocs = screen === "approve_entry" && selEst ? jobDocs.filter(d => d.estId === selEst.id) : jobDocs
          const lastDoc = relevantDocs[relevantDocs.length - 1]
          return lastDoc ? <div onClick={() => setShowImage(lastDoc.id)} style={{ position: "fixed", bottom: 80, right: 20, width: 58, height: 58, borderRadius: 29, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 60, boxShadow: "0 6px 20px rgba(0,122,255,0.4)", fontSize: 24 }}>📋</div> : null
        })()}

        {/* User Management (super admin only) */}
        {showUserMgmt && <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 2000, overflowY: "auto" }}><UserManagement onBack={() => setShowUserMgmt(false)} /></div>}

        {/* Screen router */}
        {screen === "home" && (isTablet
          ? (homeTab === "closed" && selectedClosedJob ? <ClosedJobDetail job={selectedClosedJob} openJob={openJob} startWarrantyJob={startWarrantyJob} /> : rightPanelHub())
          : (mobileView === "hub" ? rightPanelHub() : jobListPanel())
        )}

        {/* Mobile bottom tab bar */}
        {!isTablet && screen === "home" && !rightTab && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 8px max(8px, env(safe-area-inset-bottom))", zIndex: 100, boxShadow: "0 -2px 12px rgba(0,0,0,0.05)" }}>
            <div onClick={() => setMobileView("jobs")} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, cursor: "pointer", color: mobileView === "jobs" ? C.accent : C.muted, fontWeight: 600 }}>
              <div style={{ fontSize: 22 }}>🔧</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>Jobs</div>
            </div>
            <div onClick={() => setMobileView("hub")} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, cursor: "pointer", color: mobileView === "hub" ? C.accent : C.muted, fontWeight: 600 }}>
              <div style={{ fontSize: 22 }}>🏢</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>Hub</div>
            </div>
          </div>
        )}
        {screen === "new_job" && <NewJobScreen />}
        {screen === "job" && <JobScreen />}
        {screen === "est_parts" && <EstimateParts />}
        {screen === "est_cat" && <EstimateCat />}
        {screen === "est_review" && <EstimateReview />}
        {screen === "approve" && <ApprovalUpload />}
        {screen === "approve_entry" && <ApprovalEntry />}
        {screen === "approve_summary" && <ApprovalSummary />}
        {screen === "inv_detail" && <InvoiceDetail />}

        <style>{`input[type=number]::-webkit-inner-spin-button{opacity:1}input[type=number]{-moz-appearance:textfield}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.3}}.pulse-anim{animation:pulse-dot 1.2s infinite}`}</style>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <WorkshopProvider>
      <AppInner />
    </WorkshopProvider>
  )
}

