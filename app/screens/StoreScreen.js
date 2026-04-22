"use client"
import { useState } from "react"
import { C, FONT, MONO, SP, inp, btn, btnSm, btnOutline, card, pill, NavBar, fmt, genId } from "../WorkshopContext"

const UNITS = ["pcs", "litre", "kg", "can", "set", "roll", "sheet", "pair", "box"]

// ═══ PO DETAIL ═══
function PODetail({ po, onBack, onUpdate, onCreateGRN, onDelete, grns, tt }) {
  const [mode, setMode] = useState("preview") // preview | edit
  const [showSendOpts, setShowSendOpts] = useState(false)
  const [supplier, setSupplier] = useState(po.supplier)
  const [phone, setPhone] = useState(po.supplierPhone || "")
  const [whatsapp, setWhatsapp] = useState(po.supplierWhatsapp || "")
  const [email, setEmail] = useState(po.supplierEmail || "")
  const [address, setAddress] = useState(po.supplierAddress || "")
  const [items, setItems] = useState(po.items)
  const [notes, setNotes] = useState(po.notes || "")
  const [addName, setAddName] = useState("")
  const [addQty, setAddQty] = useState("1")
  const [addUnit, setAddUnit] = useState("pcs")
  const [addPrice, setAddPrice] = useState("")

  const total = items.reduce((s, i) => s + (i.qty * (i.unitPrice || 0)), 0)
  const poGRNs = grns.filter(g => g.poId === po.id)
  const isDraft = po.status === "draft"
  const isOrdered = po.status === "ordered"
  const isCancelled = po.status === "cancelled"
  const canEdit = isDraft || isOrdered

  const statusColor = po.status === "received" ? C.green : po.status === "ordered" ? C.accent : po.status === "cancelled" ? C.red : po.status === "partial" ? C.orange : C.muted
  const statusLabel = po.status === "received" ? "✓ Received" : po.status === "ordered" ? "📤 Ordered" : po.status === "cancelled" ? "✕ Cancelled" : po.status === "partial" ? "◐ Partial" : "Draft"
  const today = new Date(po.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  const addItem = () => {
    if (!addName.trim()) return
    setItems(prev => [...prev, { id: genId("pi"), name: addName.trim(), qty: Number(addQty) || 1, unit: addUnit, unitPrice: Number(addPrice) || 0, received: 0 }])
    setAddName(""); setAddQty("1"); setAddPrice("")
  }

  const save = () => {
    onUpdate(po.id, { supplier, supplierPhone: phone, supplierWhatsapp: whatsapp, supplierEmail: email, supplierAddress: address, items, notes, totalAmount: total })
    setMode("preview")
    tt("✓ PO updated")
  }

  const markOrdered = () => {
    onUpdate(po.id, { status: "ordered", supplier, supplierPhone: phone, supplierWhatsapp: whatsapp, supplierEmail: email, supplierAddress: address, items, notes, totalAmount: total })
    tt("📤 PO marked as ordered")
  }

  const cancelPO = () => {
    if (!confirm("Cancel this PO?")) return
    onUpdate(po.id, { status: "cancelled" })
    tt("PO cancelled")
  }

  // WhatsApp
  const sendWhatsApp = () => {
    const wa = (whatsapp || phone || "").replace(/\s/g, "")
    if (!wa) { tt("⚠️ No WhatsApp number"); return }
    const intl = wa.startsWith("0") ? "+94" + wa.slice(1) : wa.startsWith("+") ? wa : "+94" + wa
    const itemLines = items.map((i, idx) => `${idx + 1}. ${i.name} — ${i.qty} ${i.unit} × Rs.${(i.unitPrice || 0).toLocaleString()} = Rs.${(i.qty * (i.unitPrice || 0)).toLocaleString()}`).join("\n")
    const msg = `*${po.poNumber}*\n\nDear ${supplier},\n\nPlease supply the following:\n\n${itemLines}\n\n*Total: Rs.${total.toLocaleString()}*\n${notes ? "\nNote: " + notes + "\n" : ""}\n— MacForce Auto Engineering`
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, "_blank")
    tt("✓ WhatsApp opened")
  }

  // Email
  const sendEmail = () => {
    if (!email) { tt("⚠️ No email address"); return }
    const itemLines = items.map((i, idx) => `${idx + 1}. ${i.name} - ${i.qty} ${i.unit} x Rs.${(i.unitPrice || 0).toLocaleString()} = Rs.${(i.qty * (i.unitPrice || 0)).toLocaleString()}`).join("%0A")
    const body = `Dear ${supplier},%0A%0APlease supply the following items:%0A%0A${itemLines}%0A%0ATotal: Rs.${total.toLocaleString()}%0A${notes ? "%0ANote: " + encodeURIComponent(notes) + "%0A" : ""}%0A— MacForce Auto Engineering`
    window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(po.poNumber + " - Purchase Order")}&body=${body}`, "_blank")
    tt("✓ Gmail opened")
  }

  // Print
  const printPO = () => {
    const itemRows = items.map((i, idx) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${idx + 1}</td><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.qty} ${i.unit}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">Rs.${(i.unitPrice || 0).toLocaleString()}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:700">Rs.${(i.qty * (i.unitPrice || 0)).toLocaleString()}</td></tr>`).join("")
    const html = `<html><head><title>${po.poNumber}</title><style>body{font-family:system-ui;padding:40px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px;border-bottom:2px solid #333;font-size:13px}@media print{body{padding:20px}}</style></head><body><h2 style="margin:0">MacForce Auto Engineering</h2><p style="color:#666;margin:4px 0 30px">Purchase Order</p><div style="display:flex;justify-content:space-between;margin-bottom:24px"><div><strong>${po.poNumber}</strong><br>${today}</div><div style="text-align:right"><strong>${supplier}</strong>${phone ? "<br>" + phone : ""}${email ? "<br>" + email : ""}${address ? "<br>" + address : ""}</div></div><table><thead><tr><th>#</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead><tbody>${itemRows}<tr><td colspan="4" style="padding:12px 8px;text-align:right;font-weight:700;font-size:16px">Total</td><td style="padding:12px 8px;text-align:right;font-weight:700;font-size:16px">Rs.${total.toLocaleString()}</td></tr></tbody></table>${notes ? "<p style='margin-top:24px;color:#666'><strong>Notes:</strong> " + notes + "</p>" : ""}<div style="margin-top:60px;display:flex;justify-content:space-between"><div style="text-align:center;border-top:1px solid #999;padding-top:8px;width:200px">Authorized Signature</div><div style="text-align:center;border-top:1px solid #999;padding-top:8px;width:200px">Supplier Signature</div></div></body></html>`
    const win = window.open("", "_blank")
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
    tt("✓ Print opened")
  }

  // ── EDIT MODE ──
  if (mode === "edit") {
    return (
      <div>
        <NavBar title={`Edit ${po.poNumber}`} onBack={() => setMode("preview")} />

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Supplier</div>
          <input value={supplier} onChange={e => setSupplier(e.target.value)} style={inp} placeholder="Supplier name" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>📞 Phone</div>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>💬 WhatsApp</div>
              <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="07XXXXXXXX" style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>✉️ Email</div>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="supplier@email.com" style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>📍 Address</div>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Items ({items.length})</div>
          {items.map((item) => (
            <div key={item.id} style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <input value={item.name} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))}
                style={{ ...inp, flex: 1, fontSize: 15, fontWeight: 600, padding: "10px 12px" }} />
              <input type="number" value={item.qty} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: Number(e.target.value) || 0 } : i))}
                style={{ ...inp, width: 80, flex: "0 0 80px", fontSize: 16, fontFamily: MONO, fontWeight: 600, textAlign: "center", padding: "10px 6px" }} />
              <select value={item.unit} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, unit: e.target.value } : i))}
                style={{ ...inp, flex: "0 0 70px", fontSize: 13, padding: "10px 6px" }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="number" value={item.unitPrice || 0} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: Number(e.target.value) || 0 } : i))}
                style={{ ...inp, width: 100, flex: "0 0 100px", fontSize: 15, fontFamily: MONO, fontWeight: 700, textAlign: "right", padding: "10px 10px" }} />
              <div onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} style={{ width: 48, height: 48, borderRadius: 10, background: C.red + "15", color: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>×</div>
            </div>
          ))}
          <div style={{ marginTop: SP.md, padding: SP.md, background: C.bg, borderRadius: 12 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Item" autoComplete="off"
                onKeyDown={e => { if (e.key === "Enter") addItem() }}
                style={{ ...inp, flex: 1, fontSize: 15, fontWeight: 600, padding: "10px 12px" }} />
              <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="Qty"
                style={{ ...inp, width: 80, flex: "0 0 80px", fontSize: 16, fontFamily: MONO, fontWeight: 600, textAlign: "center", padding: "10px 6px" }} />
              <select value={addUnit} onChange={e => setAddUnit(e.target.value)} style={{ ...inp, flex: "0 0 70px", fontSize: 13, padding: "10px 6px" }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="Price"
                onKeyDown={e => { if (e.key === "Enter") addItem() }}
                style={{ ...inp, width: 100, flex: "0 0 100px", fontSize: 15, fontFamily: MONO, fontWeight: 700, textAlign: "right", padding: "10px 10px" }} />
              <div onClick={addItem} style={{ width: 48, height: 48, borderRadius: 10, background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>+</div>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.accent + "08" }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: C.sub }}>Total</span>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700 }}>Rs.{total.toLocaleString()}</span>
          </div>
        )}

        <div style={card}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Notes (optional)</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inp, minHeight: 50, resize: "vertical" }} placeholder="Delivery date, special instructions..." />
        </div>

        <button onClick={save} style={{ ...btn(C.accent, "#fff"), marginBottom: SP.sm }}>💾 Save Changes</button>
      </div>
    )
  }

  // ── PREVIEW MODE ──
  return (
    <div>
      <NavBar title={po.poNumber} subtitle={`${supplier} · ${items.length} items`} onBack={onBack} />

      {/* PO Header */}
      <div style={{ ...card, padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>{po.poNumber}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{today}</div>
          </div>
          <span style={pill(statusColor)}>{statusLabel}</span>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{supplier}</div>
          {phone && <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>📞 {phone}</div>}
          {whatsapp && <div style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>💬 {whatsapp}</div>}
          {email && <div style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>✉️ {email}</div>}
          {address && <div style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>📍 {address}</div>}
        </div>
      </div>

      {/* Items */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Items</div>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: idx < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{item.qty} {item.unit} × Rs.{(item.unitPrice || 0).toLocaleString()}</div>
              {item.received > 0 && <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginTop: 2 }}>✓ {item.received} received</div>}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700 }}>Rs.{(item.qty * (item.unitPrice || 0)).toLocaleString()}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `2px solid ${C.text}`, marginTop: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Total</span>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>Rs.{total.toLocaleString()}</span>
        </div>
      </div>

      {notes && <div style={card}><div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Notes</div><div style={{ fontSize: 14, color: C.sub }}>{notes}</div></div>}

      {/* Linked GRNs */}
      {poGRNs.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Goods Received</div>
          {poGRNs.map(g => (
            <div key={g.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{g.grnNumber}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{new Date(g.receivedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {g.items.length} items</div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>Rs.{(g.totalAmount || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {canEdit && (
        <div style={{ display: "flex", gap: 8, marginBottom: SP.sm }}>
          <button onClick={() => setMode("edit")} style={{ ...btnOutline(C.accent), flex: 1 }}>✏️ Edit</button>
          <button onClick={save} style={{ ...btn(C.accent, "#fff"), flex: 1 }}>💾 Save</button>
        </div>
      )}

      {/* Send options */}
      {canEdit && (
        !showSendOpts ? (
          <button onClick={() => setShowSendOpts(true)} style={{ ...btn(C.green, "#fff"), marginBottom: SP.sm }}>📤 Send</button>
        ) : (
          <div style={{ ...card, padding: "12px", display: "flex", gap: 8, marginBottom: SP.sm }}>
            <button onClick={sendWhatsApp} style={{ ...btnSm(C.green, "#fff"), flex: 1, fontSize: 13 }}>💬 WhatsApp</button>
            <button onClick={sendEmail} style={{ ...btnSm(C.accent, "#fff"), flex: 1, fontSize: 13 }}>✉️ Email</button>
            <button onClick={printPO} style={{ ...btnSm(C.text, "#fff"), flex: 1, fontSize: 13 }}>🖨 Print</button>
          </div>
        )
      )}

      {/* Mark as ordered (draft only) */}
      {isDraft && <button onClick={markOrdered} style={{ ...btn(C.orange, "#fff"), marginBottom: SP.sm }}>📤 Mark as Ordered</button>}

      {/* Receive goods removed from here — shown on PO list card instead */}

      {/* Close partial PO — when remaining items won't arrive */}
      {po.status === "partial" && (
        <button onClick={() => {
          if (!confirm("Close this PO? Undelivered items will be marked as cancelled.")) return
          onUpdate(po.id, { status: "received" })
          tt("✓ PO closed — partial delivery accepted")
          onBack()
        }} style={{ ...btn(C.orange, "#fff"), marginBottom: SP.sm }}>✅ Close PO (Accept Partial)</button>
      )}

      {/* Go Back + Delete */}
      <div style={{ display: "flex", gap: 8, marginBottom: SP.sm }}>
        <button onClick={onBack} style={{ ...btnOutline(C.accent), flex: 1 }}>← Go Back</button>
        {canEdit && <button onClick={() => {
          if (!confirm("Delete this PO permanently?")) return
          onDelete(po.id)
          tt("🗑 PO deleted")
          onBack()
        }} style={{ ...btnOutline(C.red), flex: 1 }}>🗑 Delete PO</button>}
        {isCancelled && <button onClick={() => {
          if (!confirm("Delete this PO permanently?")) return
          onDelete(po.id)
          tt("🗑 PO deleted")
          onBack()
        }} style={{ ...btnOutline(C.red), flex: 1 }}>🗑 Delete PO</button>}
      </div>
    </div>
  )
}

// ═══ GRN DETAIL ═══
function GRNDetail({ grn, onBack, pos, onUpdate, cashBook, setCashBook, tt }) {
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState(grn.items)
  const [invoiceAmount, setInvoiceAmount] = useState(grn.invoiceAmount || "")
  const [paymentMethod, setPaymentMethod] = useState(grn.paymentMethod || "credit")

  const linkedPO = pos.find(p => p.id === grn.poId)
  const total = items.reduce((s, i) => s + (i.qty * (i.unitPrice || 0)), 0)

  const payMethods = [
    { key: "cash", label: "💵 Cash", color: C.green },
    { key: "bank", label: "🏦 Bank", color: C.accent },
    { key: "credit", label: "📋 Credit", color: C.orange },
  ]

  const save = () => {
    onUpdate(grn.id, { items, invoiceAmount: Number(invoiceAmount) || 0, paymentMethod, paid: paymentMethod !== "credit", totalAmount: total })
    setEditing(false)
    tt("✓ GRN updated")
  }

  return (
    <div>
      <NavBar title={grn.grnNumber} subtitle={`${grn.supplier} · ${grn.items.length} items`} onBack={onBack} />
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>{linkedPO ? `Against ${linkedPO.poNumber}` : "Direct Purchase"}</div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{grn.supplier}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{new Date(grn.receivedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}{grn.receivedBy ? ` · ${grn.receivedBy}` : ""}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>Rs.{total.toLocaleString()}</div>
          {grn.invoiceRef && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Inv: {grn.invoiceRef}</div>}
        </div>
      </div>

      {/* Payment Term */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Payment</div>
        {editing ? (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              {payMethods.map(m => (
                <div key={m.key} onClick={() => setPaymentMethod(m.key)} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer", fontSize: 14, fontWeight: 600,
                  background: paymentMethod === m.key ? m.color : "#fff",
                  color: paymentMethod === m.key ? "#fff" : C.sub,
                  border: `2px solid ${paymentMethod === m.key ? m.color : C.border}`,
                }}>{m.label}</div>
              ))}
            </div>
            {paymentMethod === "credit" && (
              <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginTop: 8 }}>⚠️ Payment pending — will show in Payables</div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={pill(paymentMethod === "credit" ? C.orange : paymentMethod === "cash" ? C.green : C.accent)}>
              {payMethods.find(m => m.key === paymentMethod)?.label || "📋 Credit"}
            </span>
            {paymentMethod === "credit" && <span style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>Unpaid</span>}
            {paymentMethod !== "credit" && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Paid</span>}
          </div>
        )}
        {grn.invoiceAmount > 0 && !editing && (
          <div style={{ marginTop: 8, fontSize: 13, color: C.sub }}>Invoice Amount: <span style={{ fontFamily: MONO, fontWeight: 700 }}>Rs.{grn.invoiceAmount.toLocaleString()}</span></div>
        )}
      </div>

      {/* Items */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Items Received</div>
        {editing ? items.map((item, idx) => (
          <div key={item.id || idx} style={{ padding: "8px 0", borderBottom: idx < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{item.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" value={item.qty} onFocus={e => { e.target._orig = item.qty; e.target.value = ""; setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: "" } : i)) }}
                onBlur={e => { if (e.target.value === "") setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: e.target._orig } : i)) }}
                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: e.target.value === "" ? "" : Number(e.target.value) } : i))}
                style={{ ...inp, width: 80, flex: "0 0 80px", fontSize: 16, fontFamily: MONO, fontWeight: 700, textAlign: "center", padding: "10px 6px" }} />
              <span style={{ fontSize: 13, color: C.muted }}>{item.unit || "pcs"} ×</span>
              <input type="number" value={item.unitPrice} onFocus={e => { e.target._orig = item.unitPrice; e.target.value = ""; setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: "" } : i)) }}
                onBlur={e => { if (e.target.value === "") setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: e.target._orig } : i)) }}
                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: e.target.value === "" ? "" : Number(e.target.value) } : i))}
                style={{ ...inp, flex: 1, fontSize: 15, fontFamily: MONO, fontWeight: 700, textAlign: "right", padding: "10px 10px" }} />
            </div>
            <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, textAlign: "right", marginTop: 4 }}>= Rs.{((Number(item.qty) || 0) * (Number(item.unitPrice) || 0)).toLocaleString()}</div>
          </div>
        )) : items.map((item, idx) => (
          <div key={item.id || idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: idx < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{item.qty} {item.unit || "pcs"} × Rs.{(item.unitPrice || 0).toLocaleString()}</div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700 }}>{(item.qty * (item.unitPrice || 0)).toLocaleString()}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `2px solid ${C.text}`, marginTop: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Total</span>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>Rs.{total.toLocaleString()}</span>
        </div>
      </div>

      {grn.notes && <div style={card}><div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Notes</div><div style={{ fontSize: 14, color: C.sub }}>{grn.notes}</div></div>}

      {/* Invoice photo */}
      {grn.invoicePhoto && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Invoice Photo</div>
          <img src={grn.invoicePhoto} alt="Invoice" style={{ width: "100%", borderRadius: 8 }} />
        </div>
      )}

      {/* Actions */}
      {editing ? (
        <div style={{ display: "flex", gap: 8, marginBottom: SP.sm }}>
          <button onClick={() => { setEditing(false); setItems(grn.items); setPaymentMethod(grn.paymentMethod || "credit") }} style={{ ...btnOutline(C.muted), flex: 1 }}>Cancel</button>
          <button onClick={save} style={{ ...btn(C.accent, "#fff"), flex: 1 }}>💾 Save</button>
        </div>
      ) : (
        <>
          <button onClick={() => setEditing(true)} style={{ ...btnOutline(C.accent), marginBottom: SP.sm }}>✏️ Edit</button>
          {grn.paid && grn.paymentMethod !== "credit" && (
            <button onClick={() => {
              const method = grn.paymentMethod
              const amt = Number(grn.paymentAmount || grn.totalAmount) || 0
              const refundMsg = method === "bank" && setCashBook
                ? `Unmark payment? Rs.${amt.toLocaleString()} will be added back to bank balance. GRN will return to unpaid.`
                : `Unmark payment? GRN will return to unpaid.`
              if (!confirm(refundMsg)) return
              // Restore bank balance if bank payment
              if (method === "bank" && setCashBook) {
                setCashBook(prev => ({ ...prev, bankBalance: (Number(prev.bankBalance) || 0) + amt }))
              }
              onUpdate(grn.id, { paid: false, paymentMethod: "credit", paymentAmount: 0, paymentDate: null, chequeNo: null, chequeBank: null, chequeDate: null, chequeCleared: false, bankSlipUrl: null })
              tt("Payment unmarked — GRN moved to Payables")
            }} style={{ ...btnOutline(C.red), marginBottom: SP.sm }}>↶ Unmark Payment</button>
          )}
        </>
      )}
    </div>
  )
}

// ═══ CREATE/EDIT PO ═══
function NewPOForm({ onSave, onCancel, suppliers, supplierRegistry, tt, nextPONum, onSaveQuiet }) {
  const [mode, setMode] = useState("edit") // edit | preview
  const [showSendOpts, setShowSendOpts] = useState(false)
  const [sent, setSent] = useState(false)
  const [supplier, setSupplier] = useState("")
  const [suppSugg, setSuppSugg] = useState([])
  const [phone, setPhone] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [items, setItems] = useState([])
  const [notes, setNotes] = useState("")
  const [addName, setAddName] = useState("")
  const [addQty, setAddQty] = useState("1")
  const [addUnit, setAddUnit] = useState("pcs")
  const [addPrice, setAddPrice] = useState("")

  const total = items.reduce((s, i) => s + (i.qty * i.unitPrice), 0)

  const selectSupplier = (name) => {
    setSupplier(name); setSuppSugg([])
    const reg = supplierRegistry?.[name]
    if (reg) {
      if (reg.phone) setPhone(reg.phone)
      if (reg.whatsapp) setWhatsapp(reg.whatsapp)
      if (reg.email) setEmail(reg.email)
      if (reg.address) setAddress(reg.address)
    }
  }

  const addItem = () => {
    if (!addName.trim()) { tt("⚠️ Enter item name"); return }
    setItems(prev => [...prev, { id: genId("pi"), name: addName.trim(), qty: Number(addQty) || 1, unit: addUnit, unitPrice: Number(addPrice) || 0, received: 0 }])
    setAddName(""); setAddQty("1"); setAddPrice("")
  }

  const validate = () => {
    if (!supplier.trim()) { tt("⚠️ Enter supplier name"); return false }
    if (items.length === 0) { tt("⚠️ Add at least one item"); return false }
    return true
  }

  const goPreview = () => { if (validate()) setMode("preview") }

  const getData = () => ({ supplier: supplier.trim(), supplierPhone: phone.trim(), supplierWhatsapp: whatsapp.trim(), supplierEmail: email.trim(), supplierAddress: address.trim(), items, notes, totalAmount: total })

  const save = () => { onSave(getData()) }

  // Save without navigating away (for send actions)
  const saveSilent = () => { if (onSaveQuiet) onSaveQuiet(getData()) }

  const saveAndSend = () => {
    if (validate()) setShowSendOpts(true)
  }

  const poNum = nextPONum || "PO-XXX"
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  // WhatsApp send
  const sendWhatsApp = () => {
    saveSilent()
    const wa = (whatsapp || phone || "").replace(/\s/g, "")
    if (!wa) { tt("⚠️ No WhatsApp number"); return }
    const intl = wa.startsWith("0") ? "+94" + wa.slice(1) : wa.startsWith("+") ? wa : "+94" + wa
    const itemLines = items.map((i, idx) => `${idx + 1}. ${i.name} — ${i.qty} ${i.unit} × Rs.${i.unitPrice.toLocaleString()} = Rs.${(i.qty * i.unitPrice).toLocaleString()}`).join("\n")
    const msg = `*${poNum}*\n\nDear ${supplier},\n\nPlease supply the following:\n\n${itemLines}\n\n*Total: Rs.${total.toLocaleString()}*\n${notes ? "\nNote: " + notes + "\n" : ""}\n— MacForce Auto Engineering`
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, "_blank")
    setSent(true)
    tt("✓ PO saved & WhatsApp opened")
  }

  // Email send
  const sendEmail = () => {
    saveSilent()
    if (!email) { tt("⚠️ No email address"); return }
    const itemLines = items.map((i, idx) => `${idx + 1}. ${i.name} - ${i.qty} ${i.unit} x Rs.${i.unitPrice.toLocaleString()} = Rs.${(i.qty * i.unitPrice).toLocaleString()}`).join("%0A")
    const body = `Dear ${supplier},%0A%0APlease supply the following items:%0A%0A${itemLines}%0A%0ATotal: Rs.${total.toLocaleString()}%0A${notes ? "%0ANote: " + encodeURIComponent(notes) + "%0A" : ""}%0A— MacForce Auto Engineering`
    window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(poNum + " - Purchase Order")}&body=${body}`, "_blank")
    setSent(true)
    tt("✓ PO saved & Gmail opened")
  }

  // Print
  const printPO = () => {
    saveSilent()
    const itemRows = items.map((i, idx) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${idx + 1}</td><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.qty} ${i.unit}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">Rs.${i.unitPrice.toLocaleString()}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:700">Rs.${(i.qty * i.unitPrice).toLocaleString()}</td></tr>`).join("")
    const html = `<html><head><title>${poNum}</title><style>body{font-family:system-ui;padding:40px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px;border-bottom:2px solid #333;font-size:13px}@media print{body{padding:20px}}</style></head><body><h2 style="margin:0">MacForce Auto Engineering</h2><p style="color:#666;margin:4px 0 30px">Purchase Order</p><div style="display:flex;justify-content:space-between;margin-bottom:24px"><div><strong>${poNum}</strong><br>${today}</div><div style="text-align:right"><strong>${supplier}</strong>${phone ? "<br>" + phone : ""}${email ? "<br>" + email : ""}${address ? "<br>" + address : ""}</div></div><table><thead><tr><th>#</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead><tbody>${itemRows}<tr><td colspan="4" style="padding:12px 8px;text-align:right;font-weight:700;font-size:16px">Total</td><td style="padding:12px 8px;text-align:right;font-weight:700;font-size:16px">Rs.${total.toLocaleString()}</td></tr></tbody></table>${notes ? "<p style='margin-top:24px;color:#666'><strong>Notes:</strong> " + notes + "</p>" : ""}<div style="margin-top:60px;display:flex;justify-content:space-between"><div style="text-align:center;border-top:1px solid #999;padding-top:8px;width:200px">Authorized Signature</div><div style="text-align:center;border-top:1px solid #999;padding-top:8px;width:200px">Supplier Signature</div></div></body></html>`
    const win = window.open("", "_blank")
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
    setSent(true)
    tt("✓ PO saved & print opened")
  }

  // ── PREVIEW MODE ──
  if (mode === "preview") {
    return (
      <div>
        <NavBar title="Preview PO" onBack={onCancel} />

        {/* PO Header */}
        <div style={{ ...card, padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>{poNum}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{today}</div>
            </div>
            <span style={pill(C.muted)}>Draft</span>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{supplier}</div>
            {phone && <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>📞 {phone}</div>}
            {whatsapp && <div style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>💬 {whatsapp}</div>}
            {email && <div style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>✉️ {email}</div>}
            {address && <div style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>📍 {address}</div>}
          </div>
        </div>

        {/* Items */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Items</div>
          {items.map((item, idx) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: idx < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{item.qty} {item.unit} × Rs.{item.unitPrice.toLocaleString()}</div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700 }}>Rs.{(item.qty * item.unitPrice).toLocaleString()}</div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `2px solid ${C.text}`, marginTop: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>Rs.{total.toLocaleString()}</span>
          </div>
        </div>

        {notes && <div style={card}><div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Notes</div><div style={{ fontSize: 14, color: C.sub }}>{notes}</div></div>}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: SP.sm }}>
          <button onClick={() => setMode("edit")} style={{ ...btnOutline(C.accent), flex: 1 }}>✏️ Edit</button>
          <button onClick={save} style={{ ...btn(C.accent, "#fff"), flex: 1 }}>💾 Save</button>
        </div>

        {!showSendOpts ? (
          <button onClick={saveAndSend} style={{ ...btn(C.green, "#fff"), marginBottom: SP.sm }}>📤 Save & Send</button>
        ) : (
          <>
            <div style={{ ...card, padding: "12px", display: "flex", gap: 8, marginBottom: SP.sm }}>
              <button onClick={sendWhatsApp} style={{ ...btnSm(C.green, "#fff"), flex: 1, fontSize: 13 }}>💬 WhatsApp</button>
              <button onClick={sendEmail} style={{ ...btnSm(C.accent, "#fff"), flex: 1, fontSize: 13 }}>✉️ Email</button>
              <button onClick={printPO} style={{ ...btnSm(C.text, "#fff"), flex: 1, fontSize: 13 }}>🖨 Print</button>
            </div>
            {sent && (
              <button onClick={() => {
                onSave({ supplier: supplier.trim(), supplierPhone: phone.trim(), supplierWhatsapp: whatsapp.trim(), supplierEmail: email.trim(), supplierAddress: address.trim(), items, notes, totalAmount: total, status: "ordered" })
              }} style={{ ...btn(C.orange, "#fff"), marginBottom: SP.sm }}>📤 Mark as Ordered</button>
            )}
          </>
        )}
      </div>
    )
  }

  // ── EDIT MODE ──
  return (
    <div>
      <NavBar title="New Purchase Order" onBack={onCancel} />

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Supplier</div>
        <div style={{ position: "relative" }}>
          <input value={supplier} onChange={e => {
            setSupplier(e.target.value)
            const q = e.target.value.toLowerCase()
            setSuppSugg(q.length >= 1 ? suppliers.filter(s => s.toLowerCase().includes(q)) : [])
          }} onFocus={() => { if (!supplier) setSuppSugg(suppliers.slice(0, 10)) }}
            onBlur={() => setTimeout(() => setSuppSugg([]), 200)}
            placeholder="Supplier name" style={inp} autoComplete="off" />
          {suppSugg.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, zIndex: 20, maxHeight: 160, overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", marginTop: 4 }}>
              {suppSugg.map(s => <div key={s} onMouseDown={() => selectSupplier(s)} style={{ padding: "12px 16px", fontSize: 15, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>{s}</div>)}
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>📞 Phone</div>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>💬 WhatsApp</div>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="07XXXXXXXX" style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>✉️ Email</div>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="supplier@email.com" style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>📍 Address</div>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Items ({items.length})</div>

        {items.map((item, idx) => (
          <div key={item.id} style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
            <input value={item.name} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))}
              style={{ ...inp, flex: 1, fontSize: 15, fontWeight: 600, padding: "10px 12px" }} />
            <input type="number" value={item.qty} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: Number(e.target.value) || 0 } : i))}
              style={{ ...inp, width: 80, flex: "0 0 80px", fontSize: 16, fontFamily: MONO, fontWeight: 600, textAlign: "center", padding: "10px 6px" }} />
            <select value={item.unit} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, unit: e.target.value } : i))}
              style={{ ...inp, flex: "0 0 70px", fontSize: 13, padding: "10px 6px" }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input type="number" value={item.unitPrice} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: Number(e.target.value) || 0 } : i))}
              style={{ ...inp, width: 100, flex: "0 0 100px", fontSize: 15, fontFamily: MONO, fontWeight: 700, textAlign: "right", padding: "10px 10px" }} />
            <div onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} style={{ width: 48, height: 48, borderRadius: 10, background: C.red + "15", color: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>×</div>
          </div>
        ))}

        {/* Add item row */}
        <div style={{ marginTop: SP.md, padding: SP.md, background: C.bg, borderRadius: 12 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Item" autoComplete="off"
              onKeyDown={e => { if (e.key === "Enter") addItem() }}
              style={{ ...inp, flex: 1, fontSize: 15, fontWeight: 600, padding: "10px 12px" }} />
            <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="Qty"
              style={{ ...inp, width: 80, flex: "0 0 80px", fontSize: 16, fontFamily: MONO, fontWeight: 600, textAlign: "center", padding: "10px 6px" }} />
            <select value={addUnit} onChange={e => setAddUnit(e.target.value)} style={{ ...inp, flex: "0 0 70px", fontSize: 13, padding: "10px 6px" }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="Price"
              onKeyDown={e => { if (e.key === "Enter") addItem() }}
              style={{ ...inp, width: 100, flex: "0 0 100px", fontSize: 15, fontFamily: MONO, fontWeight: 700, textAlign: "right", padding: "10px 10px" }} />
            <div onClick={addItem} style={{ width: 48, height: 48, borderRadius: 10, background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>+</div>
          </div>
        </div>
      </div>

      {/* Total */}
      {items.length > 0 && (
        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.accent + "08" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.sub }}>Total</span>
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700 }}>Rs.{total.toLocaleString()}</span>
        </div>
      )}

      {/* Notes */}
      <div style={card}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Notes (optional)</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inp, minHeight: 50, resize: "vertical" }} placeholder="Delivery date, special instructions..." />
      </div>

      <button onClick={goPreview} style={{ ...btn(C.accent, "#fff"), marginBottom: SP.sm }}>Preview →</button>
    </div>
  )
}

// ═══ RECEIVE GOODS (GRN) ═══
function ReceiveGoodsForm({ po, onSave, onCancel, suppliers, tt }) {
  const isPOMode = !!po
  const [supplier, setSupplier] = useState(po?.supplier || "")
  const [items, setItems] = useState(
    isPOMode ? po.items.filter(i => i.received < i.qty).map(i => ({
      ...i, id: genId("gi") + Math.random().toString(36).slice(2, 6), poItemId: i.id,
      qty: i.qty - i.received, // remaining qty
    })) : []
  )
  const [receivedBy, setReceivedBy] = useState("")
  const [invoiceRef, setInvoiceRef] = useState("")
  const [invoiceAmount, setInvoiceAmount] = useState("")
  const [invoicePhoto, setInvoicePhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("credit")
  const [addName, setAddName] = useState("")
  const [addQty, setAddQty] = useState("1")
  const [addUnit, setAddUnit] = useState("pcs")
  const [addPrice, setAddPrice] = useState("")

  const total = items.reduce((s, i) => s + (i.qty * (i.unitPrice || 0)), 0)

  const addItem = () => {
    if (!addName.trim()) { tt("⚠️ Enter item name"); return }
    setItems(prev => [...prev, {
      id: genId("gi"), name: addName.trim(), qty: Number(addQty) || 1,
      unit: addUnit, unitPrice: Number(addPrice) || 0, poItemId: null,
    }])
    setAddName(""); setAddQty("1"); setAddPrice("")
  }

  const save = () => {
    if (!supplier.trim()) { tt("⚠️ Enter supplier"); return }
    if (items.length === 0) { tt("⚠️ Add items"); return }
    onSave({
      poId: po?.id || null,
      supplier: supplier.trim(),
      items,
      receivedBy: receivedBy.trim(),
      invoiceRef: invoiceRef.trim(),
      invoiceAmount: Number(invoiceAmount) || total,
      invoicePhoto: typeof invoicePhoto === "string" ? invoicePhoto : null,
      notes: notes.trim(),
      paymentMethod,
      paid: paymentMethod !== "credit",
      totalAmount: total,
      receivedDate: new Date().toISOString(),
    })
  }

  return (
    <div>
      <NavBar title={isPOMode ? `Receive: ${po.poNumber}` : "Direct Purchase"} onBack={onCancel} />

      {!isPOMode && (
        <div style={card}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Supplier</div>
          <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" style={inp} autoComplete="off" />
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>
          {isPOMode ? "Receiving Items" : "Items Purchased"}
        </div>

        {items.map((item, idx) => (
          <div key={item.id} style={{ padding: "10px 0", borderBottom: idx < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{item.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" defaultValue={item.qty}
                onFocus={e => { e.target.dataset.prev = e.target.value; e.target.value = "" }}
                onBlur={e => { if (e.target.value === "") e.target.value = e.target.dataset.prev; setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: Number(e.target.value) || 0 } : i)) }}
                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: Number(e.target.value) || 0 } : i))}
                style={{ ...inp, width: 80, flex: "0 0 80px", fontSize: 16, fontFamily: MONO, fontWeight: 700, textAlign: "center", padding: "10px 6px" }} />
              <span style={{ fontSize: 13, color: C.muted }}>{item.unit || "pcs"} ×</span>
              <input type="number" defaultValue={item.unitPrice || 0}
                onFocus={e => { e.target.dataset.prev = e.target.value; e.target.value = "" }}
                onBlur={e => { if (e.target.value === "") e.target.value = e.target.dataset.prev; setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: Number(e.target.value) || 0 } : i)) }}
                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: Number(e.target.value) || 0 } : i))}
                placeholder="Price"
                style={{ ...inp, flex: 1, fontSize: 15, fontFamily: MONO, fontWeight: 700, textAlign: "right", padding: "10px 10px" }} />
              {!isPOMode && <span onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} style={{ fontSize: 18, color: C.muted, cursor: "pointer", padding: 4 }}>×</span>}
            </div>
            <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, textAlign: "right", marginTop: 4 }}>= Rs.{(item.qty * (item.unitPrice || 0)).toLocaleString()}</div>
          </div>
        ))}
        {/* Add item for direct purchase */}
        {!isPOMode && (
          <div style={{ marginTop: SP.md, padding: SP.md, background: C.bg, borderRadius: 12 }}>
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Item name" autoComplete="off"
              onKeyDown={e => { if (e.key === "Enter") addItem() }}
              style={{ ...inp, fontSize: 15, fontWeight: 600, marginBottom: 6 }} />
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="Qty"
                style={{ ...inp, width: 55, flex: "0 0 55px", fontSize: 14, textAlign: "center" }} />
              <select value={addUnit} onChange={e => setAddUnit(e.target.value)} style={{ ...inp, flex: "0 0 80px", fontSize: 14 }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="Price"
                onKeyDown={e => { if (e.key === "Enter") addItem() }}
                style={{ ...inp, flex: 1, fontSize: 15, fontFamily: MONO, fontWeight: 700, textAlign: "right" }} />
              <div onClick={addItem} style={{ width: 48, height: 48, borderRadius: 10, background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>+</div>
            </div>
          </div>
        )}
      </div>

      {/* Receiving details */}
      <div style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Received By</div>
            <input value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Name" style={{ ...inp, fontSize: 14 }} autoComplete="off" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Invoice Ref</div>
            <input value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} placeholder="INV-001" style={{ ...inp, fontSize: 14 }} autoComplete="off" />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Invoice Amount</div>
          <input type="number" value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} placeholder="Total from invoice"
            style={{ ...inp, fontSize: 16, fontFamily: MONO, fontWeight: 700 }} autoComplete="off" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Notes</div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={{ ...inp, fontSize: 14 }} autoComplete="off" />
        </div>
      </div>

      {/* Invoice Photo */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Invoice Photo</div>
        {invoicePhoto ? (
          <div>
            <img src={typeof invoicePhoto === "string" ? invoicePhoto : URL.createObjectURL(invoicePhoto)} alt="Invoice"
              style={{ width: "100%", borderRadius: 10, marginBottom: 8, maxHeight: 300, objectFit: "contain", background: C.bg }} />
            <button onClick={() => setInvoicePhoto(null)} style={{ ...btnOutline(C.red), fontSize: 13 }}>✕ Remove Photo</button>
          </div>
        ) : (
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", borderRadius: 12, border: `2px dashed ${C.border}`, cursor: "pointer", color: C.muted, fontSize: 15, fontWeight: 600, background: C.bg }}>
            📷 Tap to add invoice photo
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                setUploading(true)
                const { uploadPhoto } = await import("../supabase")
                const path = `store/invoices/${Date.now()}_${file.name}`
                const url = await uploadPhoto(file, path)
                setInvoicePhoto(url)
                tt("✓ Photo uploaded")
              } catch {
                // Fallback: store compressed preview locally
                const { compressForPreview } = await import("../supabase")
                const preview = await compressForPreview(file)
                setInvoicePhoto(preview)
                tt("✓ Photo added locally")
              } finally {
                setUploading(false)
              }
            }} />
          </label>
        )}
        {uploading && <div style={{ textAlign: "center", padding: 8, color: C.accent, fontSize: 13 }}>Uploading...</div>}
      </div>

      {/* Payment Method */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Payment</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "cash", label: "💵 Cash", color: C.green },
            { key: "bank", label: "🏦 Bank", color: C.accent },
            { key: "credit", label: "📋 Credit", color: C.orange },
          ].map(m => (
            <div key={m.key} onClick={() => setPaymentMethod(m.key)}
              style={{
                flex: 1, textAlign: "center", padding: "12px 8px", borderRadius: 12, cursor: "pointer",
                fontWeight: 700, fontSize: 14, transition: "all 0.2s",
                background: paymentMethod === m.key ? m.color : "#fff",
                color: paymentMethod === m.key ? "#fff" : C.sub,
                border: `2px solid ${paymentMethod === m.key ? m.color : C.border}`,
              }}>
              {m.label}
            </div>
          ))}
        </div>
        {paymentMethod === "credit" && (
          <div style={{ fontSize: 12, color: C.orange, marginTop: 8, fontWeight: 600 }}>⚠️ Payment pending — will show in Payables</div>
        )}
      </div>

      {/* Total */}
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.green + "08" }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: C.sub }}>Total</span>
        <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700 }}>Rs.{total.toLocaleString()}</span>
      </div>

      <button onClick={save} style={{ ...btn(C.green, "#fff"), marginBottom: SP.sm }}>📥 Confirm Receipt</button>
    </div>
  )
}

// ═══ SUPPLIER LIST (editable) ═══
function SupplierList({ purchaseOrders, grns, setPurchaseOrders, setGrns, q, tt }) {
  const [editingName, setEditingName] = useState(null)
  const [editData, setEditData] = useState({})

  // Build supplier registry from POs & GRNs
  const registry = {}
  purchaseOrders.forEach(p => {
    const name = p.supplier
    if (!name) return
    if (!registry[name]) registry[name] = { name, phone: "", whatsapp: "", email: "", address: "", poCount: 0, grnCount: 0 }
    registry[name].poCount++
    if (p.supplierPhone && !registry[name].phone) registry[name].phone = p.supplierPhone
    if (p.supplierWhatsapp && !registry[name].whatsapp) registry[name].whatsapp = p.supplierWhatsapp
    if (p.supplierEmail && !registry[name].email) registry[name].email = p.supplierEmail
    if (p.supplierAddress && !registry[name].address) registry[name].address = p.supplierAddress
  })
  grns.forEach(g => {
    const name = g.supplier
    if (!name) return
    if (!registry[name]) registry[name] = { name, phone: "", whatsapp: "", email: "", address: "", poCount: 0, grnCount: 0 }
    registry[name].grnCount++
    if (g.supplierPhone && !registry[name].phone) registry[name].phone = g.supplierPhone
    if (g.supplierEmail && !registry[name].email) registry[name].email = g.supplierEmail
  })
  const list = Object.values(registry).filter(s => !q || s.name.toLowerCase().includes(q))

  const startEdit = (s) => {
    setEditingName(s.name)
    setEditData({ phone: s.phone, whatsapp: s.whatsapp, email: s.email, address: s.address })
  }

  const saveEdit = (supplierName) => {
    // Update all POs with this supplier
    setPurchaseOrders(prev => prev.map(p => p.supplier === supplierName ? {
      ...p,
      supplierPhone: editData.phone || p.supplierPhone,
      supplierWhatsapp: editData.whatsapp || p.supplierWhatsapp,
      supplierEmail: editData.email || p.supplierEmail,
      supplierAddress: editData.address || p.supplierAddress,
    } : p))
    // Update all GRNs with this supplier
    setGrns(prev => prev.map(g => g.supplier === supplierName ? {
      ...g,
      supplierPhone: editData.phone || g.supplierPhone,
      supplierEmail: editData.email || g.supplierEmail,
    } : g))
    setEditingName(null)
    tt("✓ Supplier updated")
  }

  if (list.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📇</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>No suppliers yet</div>
        <div style={{ fontSize: 16, marginTop: 6 }}>Suppliers from POs & GRNs appear here</div>
      </div>
    )
  }

  return list.map(s => (
    <div key={s.name} style={{ ...card, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</div>
        {editingName === s.name ? (
          <div style={{ display: "flex", gap: 8 }}>
            <span onClick={() => saveEdit(s.name)} style={{ fontSize: 13, color: C.green, fontWeight: 600, cursor: "pointer" }}>✓ Save</span>
            <span onClick={() => setEditingName(null)} style={{ fontSize: 13, color: C.muted, cursor: "pointer" }}>Cancel</span>
          </div>
        ) : (
          <span onClick={() => startEdit(s)} style={{ fontSize: 13, color: C.accent, fontWeight: 600, cursor: "pointer" }}>✏️ Edit</span>
        )}
      </div>

      {editingName === s.name ? (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>📞 Phone</div>
              <input value={editData.phone} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} placeholder="07XXXXXXXX" style={{ ...inp, fontSize: 13, padding: "8px 10px" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>💬 WhatsApp</div>
              <input value={editData.whatsapp} onChange={e => setEditData(d => ({ ...d, whatsapp: e.target.value }))} placeholder="07XXXXXXXX" style={{ ...inp, fontSize: 13, padding: "8px 10px" }} />
            </div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>✉️ Email</div>
            <input value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} placeholder="email@supplier.com" style={{ ...inp, fontSize: 13, padding: "8px 10px" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>📍 Address</div>
            <input value={editData.address} onChange={e => setEditData(d => ({ ...d, address: e.target.value }))} placeholder="Address" style={{ ...inp, fontSize: 13, padding: "8px 10px" }} />
          </div>
        </div>
      ) : (
        <>
          {s.phone && <div style={{ fontSize: 13, color: C.sub, marginBottom: 2 }}>📞 {s.phone}</div>}
          {s.whatsapp && <div style={{ fontSize: 13, color: C.sub, marginBottom: 2 }}>💬 {s.whatsapp}</div>}
          {s.email && <div style={{ fontSize: 13, color: C.sub, marginBottom: 2 }}>✉️ {s.email}</div>}
          {s.address && <div style={{ fontSize: 13, color: C.sub, marginBottom: 2 }}>📍 {s.address}</div>}
          {!s.phone && !s.whatsapp && !s.email && !s.address && <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic" }}>No contact details — tap Edit to add</div>}
        </>
      )}
      <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
        {s.poCount} PO{s.poCount !== 1 ? "s" : ""} · {s.grnCount} GRN{s.grnCount !== 1 ? "s" : ""}
      </div>
    </div>
  ))
}

// ═══ MAIN STORE SCREEN ═══
export default function StoreScreen({ purchaseOrders, grns, setPurchaseOrders, setGrns, cashBook, setCashBook, tt, initialTab, initialScreen }) {
  const [storeTab, setStoreTab] = useState(initialTab || "pos") // pos | grns | suppliers
  const [storeScreen, setStoreScreen] = useState(initialScreen || "list") // list | new_po | view_po | new_grn | view_grn | direct_grn
  const [activePO, setActivePO] = useState(null)
  const [activeGRN, setActiveGRN] = useState(null)
  const [receivePO, setReceivePO] = useState(null) // PO to receive against
  const [search, setSearch] = useState("")

  // Unique supplier list from POs & GRNs
  const suppliers = [...new Set([...purchaseOrders.map(p => p.supplier), ...grns.map(g => g.supplier)].filter(Boolean))]

  const nextPONum = () => {
    const max = purchaseOrders.reduce((m, p) => { const n = parseInt(p.poNumber?.replace("PO-", ""), 10); return n > m ? n : m }, 0)
    return `PO-${String(max + 1).padStart(3, "0")}`
  }
  const nextGRNNum = () => {
    const max = grns.reduce((m, g) => { const n = parseInt(g.grnNumber?.replace("GRN-", ""), 10); return n > m ? n : m }, 0)
    return `GRN-${String(max + 1).padStart(3, "0")}`
  }

  const createPO = (data) => {
    const po = { id: genId("po"), poNumber: nextPONum(), status: "draft", ...data, created_at: new Date().toISOString() }
    setPurchaseOrders(prev => [po, ...prev])
    setStoreScreen("list")
    tt(`✓ ${po.poNumber} created`)
  }

  const updatePO = (id, updates) => {
    setPurchaseOrders(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    // Refresh active PO view
    setActivePO(prev => prev?.id === id ? { ...prev, ...updates } : prev)
  }

  const createGRN = (data) => {
    const grn = { id: genId("grn"), grnNumber: nextGRNNum(), ...data, created_at: new Date().toISOString() }
    setGrns(prev => [grn, ...prev])

    // Update PO received quantities if linked
    if (data.poId) {
      setPurchaseOrders(prev => prev.map(po => {
        if (po.id !== data.poId) return po
        const updatedItems = po.items.map(pi => {
          const grnItem = data.items.find(gi => gi.poItemId === pi.id)
          if (!grnItem) return pi
          return { ...pi, received: (pi.received || 0) + grnItem.qty }
        })
        const allReceived = updatedItems.every(i => i.received >= i.qty)
        const someReceived = updatedItems.some(i => i.received > 0)
        return { ...po, items: updatedItems, status: allReceived ? "received" : someReceived ? "partial" : po.status }
      }))
    }

    setStoreScreen("list")
    setStoreTab("grns")
    tt(`✓ ${grn.grnNumber} recorded`)
  }

  // Sub-screens
  // Build supplier registry for auto-fill
  const supplierRegistry = {}
  purchaseOrders.forEach(p => {
    if (!p.supplier) return
    if (!supplierRegistry[p.supplier]) supplierRegistry[p.supplier] = {}
    const r = supplierRegistry[p.supplier]
    if (p.supplierPhone && !r.phone) r.phone = p.supplierPhone
    if (p.supplierWhatsapp && !r.whatsapp) r.whatsapp = p.supplierWhatsapp
    if (p.supplierEmail && !r.email) r.email = p.supplierEmail
    if (p.supplierAddress && !r.address) r.address = p.supplierAddress
  })

  if (storeScreen === "new_po") {
    return <NewPOForm onSave={createPO} onSaveQuiet={(data) => {
      // Save as draft without navigating away
      const existing = purchaseOrders.find(p => p.poNumber === nextPONum())
      if (!existing) {
        const po = { id: genId("po"), poNumber: nextPONum(), status: "draft", ...data, created_at: new Date().toISOString() }
        setPurchaseOrders(prev => [po, ...prev])
      }
    }} onCancel={() => setStoreScreen("list")} suppliers={suppliers} supplierRegistry={supplierRegistry} tt={tt} nextPONum={nextPONum()} />
  }
  if (storeScreen === "view_po" && activePO) {
    const livePO = purchaseOrders.find(p => p.id === activePO.id) || activePO
    return <PODetail po={livePO} onBack={() => { setStoreScreen("list"); setActivePO(null) }}
      onUpdate={updatePO} onDelete={(id) => { setPurchaseOrders(prev => prev.filter(p => p.id !== id)); setStoreScreen("list"); setActivePO(null) }}
      onCreateGRN={(po) => { setReceivePO(po); setStoreScreen("new_grn") }} grns={grns} tt={tt} />
  }
  if (storeScreen === "new_grn" && receivePO) {
    return <ReceiveGoodsForm po={receivePO} onSave={createGRN} onCancel={() => { setStoreScreen("view_po"); setActivePO(receivePO) }} suppliers={suppliers} tt={tt} />
  }
  if (storeScreen === "direct_grn") {
    return <ReceiveGoodsForm po={null} onSave={createGRN} onCancel={() => setStoreScreen("list")} suppliers={suppliers} tt={tt} />
  }
  if (storeScreen === "view_grn" && activeGRN) {
    return <GRNDetail grn={activeGRN} onBack={() => { setStoreScreen("list"); setActiveGRN(null) }} pos={purchaseOrders} onUpdate={(id, data) => { setGrns(prev => prev.map(g => g.id === id ? { ...g, ...data } : g)); setActiveGRN(prev => ({ ...prev, ...data })) }} cashBook={cashBook} setCashBook={setCashBook} tt={tt} />
  }

  // Filter
  const q = search.toLowerCase().replace(/\s/g, "")
  const activePOs = purchaseOrders.filter(p => p.status !== "received")
  const receivedPOs = purchaseOrders.filter(p => p.status === "received")
  const filteredPOs = q ? activePOs.filter(p => p.supplier.toLowerCase().includes(q) || p.poNumber.toLowerCase().includes(q) || p.items.some(i => i.name.toLowerCase().includes(q))) : activePOs
  const filteredGRNs = q ? grns.filter(g => g.supplier.toLowerCase().includes(q) || g.grnNumber.toLowerCase().includes(q) || g.items.some(i => i.name.toLowerCase().includes(q))) : grns
  const filteredReceivedPOs = q ? receivedPOs.filter(p => p.supplier.toLowerCase().includes(q) || p.poNumber.toLowerCase().includes(q)) : receivedPOs

  const statusColor = s => s === "received" ? C.green : s === "ordered" ? C.accent : s === "cancelled" ? C.red : s === "partial" ? C.orange : C.muted
  const statusLabel = s => s === "received" ? "✓ Received" : s === "ordered" ? "Ordered" : s === "cancelled" ? "Cancelled" : s === "partial" ? "Partial" : "Draft"

  return (
    <div>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: SP.md }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search POs, GRNs..." style={{ ...inp, background: C.card, fontSize: 15, paddingLeft: 42, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }} />
        {search && <span onClick={() => setSearch("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, cursor: "pointer", color: C.muted, padding: 4 }}>✕</span>}
      </div>

      {/* PO / GRN / Suppliers tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: SP.md, background: C.card, borderRadius: 14, padding: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div onClick={() => setStoreTab("pos")} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, minHeight: 44, cursor: "pointer", background: storeTab === "pos" ? C.accent + "12" : "transparent", color: storeTab === "pos" ? C.accent : C.muted, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>
          📋 POs ({activePOs.length})
        </div>
        <div onClick={() => setStoreTab("grns")} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, minHeight: 44, cursor: "pointer", background: storeTab === "grns" ? C.green + "12" : "transparent", color: storeTab === "grns" ? C.green : C.muted, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>
          📥 GRNs ({grns.length})
        </div>
        <div onClick={() => setStoreTab("suppliers")} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, minHeight: 44, cursor: "pointer", background: storeTab === "suppliers" ? C.purple + "12" : "transparent", color: storeTab === "suppliers" ? C.purple : C.muted, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>
          📇 Suppliers
        </div>
      </div>

      {/* PO List */}
      {storeTab === "pos" && (
        <>
          <button onClick={() => setStoreScreen("new_po")} style={{ ...btn(C.accent, "#fff"), marginBottom: SP.md }}>+ New PO</button>
          {filteredPOs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>No purchase orders</div>
              <div style={{ fontSize: 16, marginTop: 6 }}>Create a PO to order supplies</div>
            </div>
          ) : filteredPOs.map(po => {
            const isOrderedOrPartial = po.status === "ordered" || po.status === "partial"
            return (
              <div key={po.id} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{po.poNumber}</span>
                      <span style={pill(statusColor(po.status))}>{statusLabel(po.status)}</span>
                    </div>
                    <div style={{ fontSize: 15, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.supplier}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {po.items.length} item{po.items.length !== 1 ? "s" : ""} · {new Date(po.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                    Rs.{(po.totalAmount || 0).toLocaleString()}
                  </div>
                </div>
                {isOrderedOrPartial && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={(e) => { e.stopPropagation(); setReceivePO(po); setStoreScreen("new_grn") }}
                      style={{ ...btnSm(C.green, "#fff"), flex: 1, fontSize: 13, padding: "8px 0" }}>📥 Receive Goods</button>
                    <button onClick={(e) => { e.stopPropagation(); setActivePO(po); setStoreScreen("view_po") }}
                      style={{ ...btnSm(C.accent, "#fff"), flex: 1, fontSize: 13, padding: "8px 0" }}>📋 View Details</button>
                  </div>
                )}
                {!isOrderedOrPartial && (
                  <div style={{ cursor: "pointer", marginTop: 6, textAlign: "right" }} onClick={() => { setActivePO(po); setStoreScreen("view_po") }}>
                    <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>View Details →</span>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* GRN List */}
      {storeTab === "grns" && (
        <>
          <button onClick={() => setStoreScreen("direct_grn")} style={{ ...btn(C.green, "#fff"), marginBottom: SP.md }}>📥 Direct Purchase</button>

          {filteredGRNs.map(grn => {
            const linkedPO = purchaseOrders.find(p => p.id === grn.poId)
            return (
              <div key={grn.id} onClick={() => { setActiveGRN(grn); setStoreScreen("view_grn") }} style={{ ...card, cursor: "pointer", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{grn.grnNumber}</span>
                    {linkedPO && <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{linkedPO.poNumber}</span>}
                    {!linkedPO && <span style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>Direct</span>}
                  </div>
                  <div style={{ fontSize: 15, color: C.sub }}>{grn.supplier}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {grn.items.length} item{grn.items.length !== 1 ? "s" : ""} · {new Date(grn.receivedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {grn.invoiceRef ? ` · ${grn.invoiceRef}` : ""}
                  </div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  Rs.{(grn.totalAmount || 0).toLocaleString()}
                </div>
              </div>
            )
          })}

          {filteredGRNs.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📥</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>No goods received</div>
              <div style={{ fontSize: 16, marginTop: 6 }}>Record purchases here</div>
            </div>
          )}

        </>
      )}

      {/* Suppliers List */}
      {storeTab === "suppliers" && <SupplierList purchaseOrders={purchaseOrders} grns={grns} setPurchaseOrders={setPurchaseOrders} setGrns={setGrns} q={q} tt={tt} />}
    </div>
  )
}
