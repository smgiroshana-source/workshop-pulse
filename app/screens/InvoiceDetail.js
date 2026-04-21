"use client"
import { useWorkshop } from "../WorkshopContext"
import { C, FONT, MONO, inp, btn, btnSm, card, pill, Sheet, NavBar, fmt, INV_STATUS, WORKSHOP } from "../WorkshopContext"
import { uploadPhoto } from "../supabase"

export default function InvoiceDetail() {
  const {
    screen, setScreen,
    selInv, setSelInv,
    invoices, setInvoices,
    jobInfo,
    jobCats,
    jobDocs, setJobDocs,
    showImage, setShowImage,
    editingItem, setEditingItem,
    showPayForm, setShowPayForm,
    payAmount, setPayAmount,
    payMethod, setPayMethod,
    payRef, setPayRef,
    discount, setDiscount,
    showDiscountInput, setShowDiscountInput,
    showCustDiscInput, setShowCustDiscInput,
    custDiscount, setCustDiscount,
    payType, setPayType,
    insPayPhoto, setInsPayPhoto,
    insPhotoRef,
    confirmDel, setConfirmDel,
    activeJobId,
    jobStage, setJobStage, setJobs, setActiveJobId, homeTab, setHomeTab,
    isInsurance, isDirectJob,
    invTotal, invNet, invInsPayments, invCustPayments, invInsTotal, invCustPaidTotal,
    invCustDiscount, invCustPortion, invCustOwes, invCustBalance, invTotalDiscount, invFullyPaid,
    updateInvItem, removeInvItem, setInvStatus, calcStatus,
    addPayment, deletePayment, updateInsStatus, applyCustomerDiscount,
    generateInvoicePDF,
    tt,
  } = useWorkshop()

  if (!selInv) return null

  return (
    <>
      <NavBar title={selInv.invoice_number} subtitle={`From ${selInv.source_estimates?.join(" + ")}`} onBack={() => setScreen("job")} right={<button onClick={() => generateInvoicePDF(selInv)} style={{ ...btnSm(C.purple, "#fff"), padding: "8px 14px" }}>📄 PDF</button>} />
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.card, borderRadius: 14, padding: 5, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {["draft", "finalized", "sent", "paid"].map(k => { const s = INV_STATUS[k]; const active = selInv.status === k || (k === "paid" && selInv.status === "partially_paid"); return <div key={k} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 12, fontSize: 14, fontWeight: 600, background: active ? s.c + "12" : "transparent", color: active ? s.c : C.muted }}>{selInv.status === "partially_paid" && k === "paid" ? "Partial" : s.l}</div> })}
      </div>
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{WORKSHOP.name}</div>
          <div style={{ fontSize: 15, color: C.sub, marginTop: 2 }}>{WORKSHOP.address}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{WORKSHOP.phone} · {WORKSHOP.email}</div>
        </div>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 13, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>To</div><div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>{jobInfo.customer_name || "Customer"}</div><div style={{ fontSize: 15, color: C.sub }}>{jobInfo.customer_phone}</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Vehicle</div><div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, marginTop: 2 }}>{jobInfo.vehicle_reg || "---"}</div><div style={{ fontSize: 15, color: C.sub }}>{jobInfo.vehicle_make} {jobInfo.vehicle_model}{jobInfo.insurance_name ? ` · ${jobInfo.insurance_name}` : ""}</div></div>
        </div>
        {jobCats.map(c => { const ci = selInv.items.filter(i => i.category === c.key); if (!ci.length) return null; return <div key={c.key}>
          <div style={{ padding: "10px 18px", background: c.color + "06", display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 15, fontWeight: 600, color: c.color }}>{c.icon} {c.label}</span><span style={{ fontFamily: MONO, fontSize: 15, color: c.color, fontWeight: 600 }}>Rs.{fmt(ci.reduce((s, i) => s + i.qty * i.unit_price, 0))}</span></div>
          {ci.map(item => <div key={item.id} style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
            {editingItem === item.id && selInv.status === "draft" ? <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8 }}><input value={item.description} onChange={e => updateInvItem(item.id, { description: e.target.value })} style={{ ...inp, flex: 1, fontSize: 16 }} /><input type="number" value={item.unit_price} onChange={e => updateInvItem(item.id, { unit_price: Number(e.target.value) || 0 })} style={{ ...inp, width: 90, textAlign: "right", fontFamily: MONO }} /></div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button onClick={() => setEditingItem(null)} style={{ ...btnSm(C.green + "12", C.green), width: "auto" }}>Done</button><button onClick={() => { removeInvItem(item.id); setEditingItem(null) }} style={{ ...btnSm(C.red + "12", C.red), width: "auto" }}>Remove</button></div>
            </div> : <>
              <div style={{ flex: 1 }} onClick={() => selInv.status === "draft" && setEditingItem(item.id)}>
                <div style={{ fontSize: 17, display: "flex", gap: 6, alignItems: "center" }}>{item.description}{item.is_modified && <span style={pill(C.orange)}>edited</span>}{item.remarks && <span style={{ fontSize: 14, color: C.orange, fontWeight: 500 }}>{item.remarks}</span>}</div>
                <div style={{ fontSize: 15, color: C.sub, marginTop: 2 }}>Rs.{fmt(item.unit_price)}</div>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600 }}>Rs.{fmt(item.qty * item.unit_price)}</span>
            </>}
          </div>)}
        </div> })}
        {/* Sundry items */}
        {selInv.items.filter(i => i.category === "sundry").length > 0 && <div>
          <div style={{ padding: "10px 18px", background: C.orange + "06", display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 15, fontWeight: 600, color: C.orange }}>📎 Sundries</span><span style={{ fontFamily: MONO, fontSize: 15, color: C.orange, fontWeight: 600 }}>Rs.{fmt(selInv.items.filter(i => i.category === "sundry").reduce((s, i) => s + i.qty * i.unit_price, 0))}</span></div>
          {selInv.items.filter(i => i.category === "sundry").map(item => <div key={item.id} style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}><div><span style={{ fontSize: 16 }}>{item.description}</span>{item.remarks && <span style={{ fontSize: 12, color: C.purple, marginLeft: 6 }}>{item.remarks}</span>}</div><span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600 }}>Rs.{fmt(item.unit_price)}</span></div>)}
        </div>}
        {selInv.items.filter(i => i.category === "labour").length > 0 && <div>
          <div style={{ padding: "10px 18px", background: C.accent + "06", display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 15, fontWeight: 600, color: C.accent }}>👷 Labour</span><span style={{ fontFamily: MONO, fontSize: 15, color: C.accent, fontWeight: 600 }}>Rs.{fmt(selInv.items.filter(i => i.category === "labour").reduce((s, i) => s + i.qty * i.unit_price, 0))}</span></div>
          {selInv.items.filter(i => i.category === "labour").map(item => <div key={item.id} style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}` }}><span style={{ fontSize: 16 }}>{item.description}</span><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{selInv.status === "draft" ? <input type="number" value={item.unit_price || ""} onChange={e => updateInvItem(item.id, { unit_price: Number(e.target.value) || 0 })} style={{ width: 100, padding: "6px 10px", background: C.bg, border: `2px solid ${C.accent}40`, borderRadius: 8, color: C.text, fontSize: 17, fontFamily: MONO, fontWeight: 700, textAlign: "right", outline: "none" }} placeholder="Rate" /> : <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600 }}>Rs.{fmt(item.unit_price)}</span>}</div></div>)}
        </div>}
        {selInv.items.filter(i => i.category === "other").length > 0 && <div>
          <div style={{ padding: "10px 18px", background: C.orange + "06", display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 15, fontWeight: 600, color: C.orange }}>📦 Outsource</span><span style={{ fontFamily: MONO, fontSize: 15, color: C.orange, fontWeight: 600 }}>Rs.{fmt(selInv.items.filter(i => i.category === "other").reduce((s, i) => s + i.qty * i.unit_price, 0))}</span></div>
          {selInv.items.filter(i => i.category === "other").map(item => <div key={item.id} style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}><span style={{ fontSize: 16 }}>{item.description}</span><span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600 }}>Rs.{fmt(item.unit_price)}</span></div>)}
        </div>}
        {/* Invoice Total */}
        <div style={{ padding: "16px 18px", background: C.bg }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, marginBottom: 6 }}><span style={{ color: C.sub }}>Subtotal</span><span style={{ fontFamily: MONO, fontWeight: 600 }}>Rs.{fmt(invTotal(selInv))}</span></div>
          {selInv.discount > 0 && !showDiscountInput ? <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, marginBottom: 6, alignItems: "center" }}><span style={{ color: C.orange, fontWeight: 500, cursor: "pointer" }} onClick={() => { setDiscount(selInv.discount); setShowDiscountInput(true) }}>Discount ✏️</span><span style={{ fontFamily: MONO, color: C.orange, fontWeight: 600 }}>-Rs.{fmt(selInv.discount)}</span></div>
            : showDiscountInput ? <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: C.orange, flexShrink: 0 }}>Discount:</span>
              <input type="number" min="0" value={discount || ""} onChange={e => { const v = Number(e.target.value); if (v < 0) return; setDiscount(v || 0) }} placeholder="0" style={{ flex: 1, padding: "8px 10px", background: C.bg, border: `2px solid ${C.orange}`, borderRadius: 8, color: C.text, fontSize: 18, fontFamily: MONO, fontWeight: 700, textAlign: "right", outline: "none" }} onKeyDown={e => { if (e.key === "Enter") { const d = Math.max(0, Number(discount) || 0); const sub = invTotal(selInv); if (d > sub) { tt(`⚠️ Discount cannot exceed subtotal Rs.${fmt(sub)}`); return }; setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, discount: d } : inv)); setSelInv(prev => ({ ...prev, discount: d })); setShowDiscountInput(false); tt(d > 0 ? `Discount Rs.${fmt(d)}` : "Removed") } }} />
              <button onClick={() => { const d = Math.max(0, Number(discount) || 0); const sub = invTotal(selInv); if (d > sub) { tt(`⚠️ Discount cannot exceed subtotal Rs.${fmt(sub)}`); return }; setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, discount: d } : inv)); setSelInv(prev => ({ ...prev, discount: d })); setShowDiscountInput(false); tt(d > 0 ? `Discount Rs.${fmt(d)}` : "Removed") }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: C.orange, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>✓</button>
            </div>
            : (selInv.status === "draft" || selInv.status === "finalized") ? <div onClick={() => { setDiscount(0); setShowDiscountInput(true) }} style={{ fontSize: 14, color: C.orange, marginBottom: 6, cursor: "pointer", opacity: 0.7 }}>+ Add discount</div> : null}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, paddingTop: 6, borderTop: `1px solid ${C.border}` }}><span style={{ fontWeight: 700 }}>Net Total</span><span style={{ fontFamily: MONO, fontWeight: 700 }}>Rs.{fmt(invNet(selInv))}</span></div>
        </div>
      </div>

      {/* Insurance Payments */}
      {isInsurance && <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, letterSpacing: 0.5 }}>🛡️ INSURANCE</div>
        {invInsPayments(selInv).map(p => {
          const stC = { recorded: C.orange, pending: C.accent, received: C.green }
          const stL = { recorded: "RECORDED", pending: "PENDING", received: "RECEIVED" }
          return <div key={p.id} style={{ ...card, padding: 0, overflow: "hidden", borderLeft: `4px solid ${stC[p.ins_status]}`, marginBottom: 8 }}>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 20, fontWeight: 700, fontFamily: MONO }}>Rs.{fmt(p.amount)}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: stC[p.ins_status], background: stC[p.ins_status] + "15", padding: "3px 8px", borderRadius: 6 }}>{stL[p.ins_status]}</span>
                  <span onClick={() => deletePayment(p.id)} style={{ fontSize: confirmDel === p.id ? 13 : 16, color: C.red, cursor: "pointer", opacity: confirmDel === p.id ? 1 : 0.4, background: confirmDel === p.id ? C.red + "15" : "none", padding: confirmDel === p.id ? "2px 8px" : "0", borderRadius: 6, fontWeight: confirmDel === p.id ? 700 : 400 }}>{confirmDel === p.id ? "Delete?" : "✕"}</span>
                </div>
              </div>
              {p.reference && <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>Ref: {p.reference}</div>}
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{new Date(p.date).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" })}</div>
              {p.photo && <img src={p.photo} onClick={() => { const d = { id: "ins_ph_" + p.id, dataUrl: p.photo, label: "Insurance Release Letter" }; setJobDocs(prev => { const ex = prev.find(x => x.id === d.id); return ex ? prev : [...prev, d] }); setShowImage(d.id) }} style={{ height: 50, marginTop: 6, borderRadius: 6, border: `1px solid ${C.border}`, cursor: "pointer", objectFit: "cover" }} alt="" />}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {p.ins_status === "recorded" && <button onClick={() => updateInsStatus(p.id, "pending")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: C.accent + "15", color: C.accent, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>→ Mark Pending</button>}
                {p.ins_status === "pending" && <button onClick={() => updateInsStatus(p.id, "received")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: C.green + "15", color: C.green, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>✓ Received</button>}
                {p.ins_status === "received" && <span style={{ fontSize: 13, color: C.green }}>✓ Money received</span>}
              </div>
            </div>
          </div> })}
        {invInsPayments(selInv).length === 0 && <div style={{ ...card, textAlign: "center", color: C.sub, fontSize: 14, padding: 16 }}>No insurance payment recorded</div>}
        <button onClick={() => { setPayType("insurance"); const expected = Math.max(0, invNet(selInv) - invCustBalance(selInv) - invInsTotal(selInv)); setPayAmount(expected > 0 ? expected.toString() : ""); setPayRef(""); setInsPayPhoto(null); setShowPayForm(true) }} style={{ ...btn(C.accent + "15", C.accent), marginTop: 4, fontSize: 14, border: `1px solid ${C.accent}30` }}>+ Record Insurance Payment</button>
      </div>}

      {/* Customer Settlement */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, letterSpacing: 0.5 }}>{isDirectJob ? "💰 PAYMENT" : "👤 CUSTOMER"}</div>
        <div style={{ ...card, padding: "14px 16px" }}>
          {isInsurance && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}><span style={{ color: C.sub }}>Customer Portion</span><span style={{ fontFamily: MONO, fontWeight: 600 }}>Rs.{fmt(invCustPortion(selInv))}</span></div>}
          {invCustDiscount(selInv) > 0 && !showCustDiscInput ? <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4, alignItems: "center" }}><span style={{ color: C.orange, cursor: "pointer" }} onClick={() => { setCustDiscount(invCustDiscount(selInv)); setShowCustDiscInput(true) }}>{isDirectJob ? "Discount" : "Customer Discount"} ✏️</span><span style={{ fontFamily: MONO, color: C.orange, fontWeight: 600 }}>-Rs.{fmt(invCustDiscount(selInv))}</span></div>
            : showCustDiscInput ? <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.orange, flexShrink: 0 }}>Discount:</span>
              <input type="number" value={custDiscount || ""} onChange={e => setCustDiscount(Number(e.target.value) || 0)} placeholder="0" style={{ flex: 1, padding: "6px 8px", background: C.bg, border: `2px solid ${C.orange}`, borderRadius: 8, color: C.text, fontSize: 16, fontFamily: MONO, fontWeight: 700, textAlign: "right", outline: "none" }} onKeyDown={e => { if (e.key === "Enter") applyCustomerDiscount(Number(custDiscount) || 0) }} />
              <button onClick={() => applyCustomerDiscount(Number(custDiscount) || 0)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: C.orange, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✓</button>
            </div>
            : <div onClick={() => { setCustDiscount(0); setShowCustDiscInput(true) }} style={{ fontSize: 13, color: C.orange, marginBottom: 4, cursor: "pointer", opacity: 0.7 }}>+ {isDirectJob ? "Discount" : "Customer discount"}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, paddingTop: 6, borderTop: `1px solid ${C.border}` }}><span style={{ fontWeight: 700 }}>{isDirectJob ? "Amount Due" : "Customer Owes"}</span><span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: invCustOwes(selInv) <= 0 ? C.green : C.text }}>Rs.{fmt(invCustOwes(selInv))}</span></div>
        </div>
        {invCustPayments(selInv).map(p => <div key={p.id} style={{ ...card, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${C.green}`, marginTop: 6 }}>
          <div><span style={{ fontSize: 17, fontWeight: 600, color: C.green }}>Rs.{fmt(p.amount)}</span> <span style={{ fontSize: 15, color: C.sub }}>{(p.method || "").replace("_", " ")}</span>{p.reference ? <span style={{ fontSize: 13, color: C.muted }}> · {p.reference}</span> : null}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, color: C.sub }}>{new Date(p.date).toLocaleDateString("en-LK", { month: "short", day: "numeric" })}</span>
            <span onClick={() => deletePayment(p.id)} style={{ fontSize: confirmDel === p.id ? 13 : 16, color: C.red, cursor: "pointer", opacity: confirmDel === p.id ? 1 : 0.4, background: confirmDel === p.id ? C.red + "15" : "none", padding: confirmDel === p.id ? "2px 8px" : "0", borderRadius: 6, fontWeight: confirmDel === p.id ? 700 : 400 }}>{confirmDel === p.id ? "Delete?" : "✕"}</span>
          </div>
        </div>)}
        {invCustBalance(selInv) > 0 && <button onClick={() => { setPayType("customer"); setPayAmount(invCustBalance(selInv).toString()); setPayRef(""); setShowPayForm(true) }} style={{ ...btn(C.green, "#fff"), marginTop: 8 }}>💰 Record Payment</button>}
        {invCustBalance(selInv) <= 0 && invCustPayments(selInv).length > 0 && <div style={{ textAlign: "center", color: C.green, fontSize: 14, fontWeight: 600, marginTop: 8 }}>✓ {isDirectJob ? "Fully Paid" : "Customer settled"}</div>}
      </div>

      {/* Overall Summary */}
      <div style={{ ...card, marginTop: 14, padding: "14px 16px", background: invFullyPaid(selInv) ? C.green + "08" : C.bg, border: invFullyPaid(selInv) ? `2px solid ${C.green}30` : `1px solid ${C.border}` }}>
        {invTotalDiscount(selInv) > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}><span style={{ color: C.orange }}>Total Discounts</span><span style={{ fontFamily: MONO, color: C.orange, fontWeight: 600 }}>Rs.{fmt(invTotalDiscount(selInv))}</span></div>}
        {isInsurance && invInsPayments(selInv).some(p => p.ins_status !== "received") && <div style={{ fontSize: 13, color: C.orange, marginBottom: 6 }}>⏳ Insurance payment not yet received</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 20, fontWeight: 700 }}>{invFullyPaid(selInv) ? "✓ Fully Settled" : "Status"}</span><span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: invFullyPaid(selInv) ? C.green : invCustBalance(selInv) <= 0 ? C.accent : C.text }}>{invFullyPaid(selInv) ? "COMPLETE" : (isDirectJob ? (invCustBalance(selInv) <= 0 ? "COMPLETE" : "OPEN") : (invCustBalance(selInv) <= 0 ? "AWAITING INS." : "OPEN"))}</span></div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 12 }}>
        {selInv.status === "draft" && <><div style={{ fontSize: 15, color: C.sub, marginBottom: 8 }}>Tap any line item to edit</div><button onClick={() => setInvStatus("finalized")} style={{ ...btn(C.accent, "#fff"), marginBottom: 10 }}>Finalize Invoice</button></>}
        {selInv.status === "finalized" && <button onClick={() => setInvStatus("sent")} style={{ ...btn(C.orange, "#fff"), marginBottom: 10 }}>Mark as Sent</button>}
        {selInv.status !== "draft" && (selInv.payments || []).length === 0 && <button onClick={() => { if (!confirm("Revert invoice to draft? This will clear the 'sent' status.")) return; setInvStatus("draft") }} style={{ ...btn(C.bg, C.accent) }}>Edit Invoice</button>}
        {selInv.status !== "draft" && (selInv.payments || []).length > 0 && <div style={{ ...card, background: C.muted + "08", fontSize: 13, color: C.muted, textAlign: "center", padding: "10px 14px" }}>🔒 Invoice locked — payments recorded. Delete all payments to edit.</div>}
      </div>

      {/* Close Job (for quick jobs that are fully paid) */}
      {invFullyPaid(selInv) && jobStage !== "closed" && (
        <button onClick={() => {
          if (!confirm("Close this job?")) return
          setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: "closed" } : j))
          setJobStage("closed")
          tt("🏁 Job closed")
          setActiveJobId(null)
          setScreen("home")
          setHomeTab("closed")
        }} style={{ ...btn(C.green, "#fff"), marginTop: 12, marginBottom: 8 }}>🏁 Close Job</button>
      )}

      {/* Payment Form */}
      <input ref={insPhotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async e => { const f = e.target.files[0]; if (f) { tt("⏳ Uploading…"); try { const url = await uploadPhoto(f, `${activeJobId}/ins-pay-${Date.now()}.jpg`); if (!url) throw new Error("No URL returned"); setInsPayPhoto(url); tt("📷 Photo attached") } catch (err) { setInsPayPhoto(null); tt("❌ Upload failed — please retry") } } e.target.value = "" }} />
      {showPayForm && <Sheet onClose={() => { setShowPayForm(false); setInsPayPhoto(null) }}>
        {payType === "insurance" ? <>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>🛡️ Insurance Payment</div>
          <div style={{ fontSize: 15, color: C.sub, marginBottom: 16 }}>Net Total: Rs.{fmt(invNet(selInv))}</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: C.sub }}>AMOUNT</div>
          <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" style={{ ...inp, fontFamily: MONO, fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 16 }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: C.sub }}>RELEASE LETTER / CHEQUE NUMBER</div>
          <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional" style={{ ...inp, marginBottom: 16 }} />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>📎 Release Letter / Cheque Photo <span style={{ color: C.red }}>*</span></div>
            {insPayPhoto ? <div style={{ position: "relative", display: "inline-block" }}>
              <img src={insPayPhoto} style={{ height: 80, borderRadius: 8, border: `2px solid ${C.green}` }} alt="" />
              <span onClick={() => setInsPayPhoto(null)} style={{ position: "absolute", top: -6, right: -6, background: C.red, color: "#fff", width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✕</span>
            </div> : <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { insPhotoRef.current.setAttribute("capture", "environment"); insPhotoRef.current.click() }} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `2px dashed ${C.accent}40`, background: C.bg, color: C.accent, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>📷 Photo</button>
              <button onClick={() => { insPhotoRef.current.removeAttribute("capture"); insPhotoRef.current.click() }} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `2px dashed ${C.border}`, background: C.bg, color: C.sub, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>🖼️ Gallery</button>
            </div>}
          </div>
        </> : <>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{isDirectJob ? "💰 Payment" : "👤 Customer Payment"}</div>
          <div style={{ fontSize: 15, color: C.sub, marginBottom: 16 }}>{isDirectJob ? "Due" : "Owes"}: Rs.{fmt(invCustOwes(selInv))}</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: C.sub }}>AMOUNT</div>
          <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" style={{ ...inp, fontFamily: MONO, fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 16 }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: C.sub }}>METHOD</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[["cash", "💵 Cash"], ["bank_transfer", "🏦 Bank"], ["cheque", "📝 Cheque"], ["online", "📱 Online"]].map(([k, l]) => <div key={k} onClick={() => setPayMethod(k)} style={{ flex: 1, textAlign: "center", padding: "12px 4px", borderRadius: 12, cursor: "pointer", background: payMethod === k ? C.green + "15" : C.bg, border: `1px solid ${payMethod === k ? C.green + "50" : C.border}`, fontSize: 14, fontWeight: payMethod === k ? 600 : 400, color: payMethod === k ? C.green : C.sub }}>{l}</div>)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: C.sub }}>REFERENCE</div>
          <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional" style={{ ...inp, marginBottom: 16 }} />
        </>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { setShowPayForm(false); setInsPayPhoto(null) }} style={{ ...btn(C.bg, C.sub), flex: 1 }}>Cancel</button>
          <button onClick={addPayment} style={{ ...btn(payType === "insurance" ? C.accent : C.green, "#fff"), flex: 1 }}>{payType === "insurance" ? "Record" : "Record Payment"}</button>
        </div>
      </Sheet>}
    </>
  )
}
