"use client"
import { useState } from "react"
import { C, FONT, MONO, SP, inp, btn, btnSm, btnOutline, card, pill, NavBar, fmt } from "../WorkshopContext"

const UNITS = ["pcs", "litre", "kg", "can", "set", "roll", "sheet", "pair", "box"]

// ═══ PO DETAIL ═══
function PODetail({ po, onBack, onUpdate, onCreateGRN, grns, tt }) {
  const [editing, setEditing] = useState(false)
  const [supplier, setSupplier] = useState(po.supplier)
  const [items, setItems] = useState(po.items)
  const [notes, setNotes] = useState(po.notes || "")
  const [addName, setAddName] = useState("")
  const [addQty, setAddQty] = useState("")
  const [addUnit, setAddUnit] = useState("pcs")
  const [addPrice, setAddPrice] = useState("")

  const total = items.reduce((s, i) => s + (i.qty * i.unitPrice), 0)
  const poGRNs = grns.filter(g => g.poId === po.id)
  const isDraft = po.status === "draft"

  const addItem = () => {
    if (!addName.trim()) return
    setItems(prev => [...prev, { id: "pi" + Date.now(), name: addName.trim(), qty: Number(addQty) || 1, unit: addUnit, unitPrice: Number(addPrice) || 0, received: 0 }])
    setAddName(""); setAddQty(""); setAddPrice("")
  }

  const save = () => {
    onUpdate(po.id, { supplier, items, notes, totalAmount: total })
    setEditing(false)
    tt("✓ PO updated")
  }

  const markOrdered = () => {
    onUpdate(po.id, { status: "ordered" })
    tt("📤 PO marked as ordered")
  }

  const cancelPO = () => {
    if (!confirm("Cancel this PO?")) return
    onUpdate(po.id, { status: "cancelled" })
    tt("PO cancelled")
  }

  return (
    <div>
      <NavBar title={po.poNumber} subtitle={`${po.supplier} · ${po.items.length} items`} onBack={onBack}
        right={isDraft && !editing ? <span onClick={() => setEditing(true)} style={{ fontSize: 14, color: C.accent, fontWeight: 600, cursor: "pointer" }}>✏️ Edit</span> : null} />

      {/* Status */}
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Status</div>
          <span style={pill(po.status === "received" ? C.green : po.status === "ordered" ? C.accent : po.status === "cancelled" ? C.red : po.status === "partial" ? C.orange : C.muted)}>
            {po.status === "received" ? "✓ Received" : po.status === "ordered" ? "📤 Ordered" : po.status === "cancelled" ? "✕ Cancelled" : po.status === "partial" ? "◐ Partial" : "Draft"}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Total</div>
          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>Rs.{total.toLocaleString()}</div>
        </div>
      </div>

      {/* Supplier */}
      {editing ? (
        <div style={card}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Supplier</div>
          <input value={supplier} onChange={e => setSupplier(e.target.value)} style={inp} placeholder="Supplier name" />
        </div>
      ) : (
        <div style={card}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Supplier</div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{po.supplier || "—"}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{new Date(po.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</div>
        </div>
      )}

      {/* Items */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.md }}>Items</div>
        {(editing ? items : po.items).map((item, idx) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: idx < (editing ? items : po.items).length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{item.qty} {item.unit} × Rs.{(item.unitPrice || 0).toLocaleString()}</div>
              {item.received > 0 && <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginTop: 2 }}>✓ {item.received} received</div>}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
              {(item.qty * (item.unitPrice || 0)).toLocaleString()}
            </div>
            {editing && <span onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} style={{ fontSize: 18, color: C.muted, cursor: "pointer", marginLeft: 8, padding: 4 }}>×</span>}
          </div>
        ))}

        {/* Add item (editing mode) */}
        {editing && (
          <div style={{ marginTop: SP.md, padding: SP.md, background: C.bg, borderRadius: 12 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Item name" style={{ ...inp, flex: 1, fontSize: 14 }} />
              <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="Qty" style={{ ...inp, width: 60, flex: "0 0 60px", fontSize: 14, textAlign: "center" }} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={addUnit} onChange={e => setAddUnit(e.target.value)} style={{ ...inp, flex: "0 0 80px", fontSize: 14 }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="Unit price" style={{ ...inp, flex: 1, fontSize: 14, fontFamily: MONO, textAlign: "right" }} />
              <div onClick={addItem} style={{ width: 44, height: 44, borderRadius: 10, background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>+</div>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {editing ? (
        <div style={card}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Notes</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inp, minHeight: 60, resize: "vertical" }} placeholder="Optional notes..." />
        </div>
      ) : po.notes ? (
        <div style={card}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Notes</div>
          <div style={{ fontSize: 14, color: C.sub }}>{po.notes}</div>
        </div>
      ) : null}

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

      {/* Actions */}
      {editing && <button onClick={save} style={{ ...btn(C.accent, "#fff"), marginBottom: SP.sm }}>Save Changes</button>}
      {isDraft && !editing && <button onClick={markOrdered} style={{ ...btn(C.accent, "#fff"), marginBottom: SP.sm }}>📤 Mark as Ordered</button>}
      {(po.status === "ordered" || po.status === "partial") && (
        <button onClick={() => onCreateGRN(po)} style={{ ...btn(C.green, "#fff"), marginBottom: SP.sm }}>📥 Receive Goods</button>
      )}
      {isDraft && !editing && <button onClick={cancelPO} style={{ ...btnOutline(C.red), marginBottom: SP.sm }}>Cancel PO</button>}
    </div>
  )
}

// ═══ GRN DETAIL ═══
function GRNDetail({ grn, onBack, pos }) {
  const linkedPO = pos.find(p => p.id === grn.poId)
  const total = grn.items.reduce((s, i) => s + (i.qty * (i.unitPrice || 0)), 0)
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

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Items Received</div>
        {grn.items.map((item, idx) => (
          <div key={item.id || idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: idx < grn.items.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{item.qty} {item.unit || "pcs"} × Rs.{(item.unitPrice || 0).toLocaleString()}</div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700 }}>{(item.qty * (item.unitPrice || 0)).toLocaleString()}</div>
          </div>
        ))}
      </div>
      {grn.notes && <div style={card}><div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Notes</div><div style={{ fontSize: 14, color: C.sub }}>{grn.notes}</div></div>}
    </div>
  )
}

// ═══ CREATE/EDIT PO ═══
function NewPOForm({ onSave, onCancel, suppliers, tt }) {
  const [supplier, setSupplier] = useState("")
  const [suppSugg, setSuppSugg] = useState([])
  const [items, setItems] = useState([])
  const [notes, setNotes] = useState("")
  const [addName, setAddName] = useState("")
  const [addQty, setAddQty] = useState("1")
  const [addUnit, setAddUnit] = useState("pcs")
  const [addPrice, setAddPrice] = useState("")

  const total = items.reduce((s, i) => s + (i.qty * i.unitPrice), 0)

  const addItem = () => {
    if (!addName.trim()) { tt("⚠️ Enter item name"); return }
    setItems(prev => [...prev, { id: "pi" + Date.now(), name: addName.trim(), qty: Number(addQty) || 1, unit: addUnit, unitPrice: Number(addPrice) || 0, received: 0 }])
    setAddName(""); setAddQty("1"); setAddPrice("")
  }

  const save = () => {
    if (!supplier.trim()) { tt("⚠️ Enter supplier name"); return }
    if (items.length === 0) { tt("⚠️ Add at least one item"); return }
    onSave({ supplier: supplier.trim(), items, notes, totalAmount: total })
  }

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
              {suppSugg.map(s => <div key={s} onMouseDown={() => { setSupplier(s); setSuppSugg([]) }} style={{ padding: "12px 16px", fontSize: 15, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>{s}</div>)}
            </div>
          )}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SP.sm }}>Items ({items.length})</div>

        {items.map((item, idx) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{item.qty} {item.unit} × Rs.{item.unitPrice.toLocaleString()}</div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, marginRight: 8 }}>{(item.qty * item.unitPrice).toLocaleString()}</div>
            <span onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} style={{ fontSize: 18, color: C.muted, cursor: "pointer", padding: 4 }}>×</span>
          </div>
        ))}

        {/* Add item row */}
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
            <input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="Unit price"
              onKeyDown={e => { if (e.key === "Enter") addItem() }}
              style={{ ...inp, flex: 1, fontSize: 15, fontFamily: MONO, fontWeight: 700, textAlign: "right" }} />
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

      <button onClick={save} style={{ ...btn(C.accent, "#fff"), marginBottom: SP.sm }}>Save as Draft</button>
    </div>
  )
}

// ═══ RECEIVE GOODS (GRN) ═══
function ReceiveGoodsForm({ po, onSave, onCancel, suppliers, tt }) {
  const isPOMode = !!po
  const [supplier, setSupplier] = useState(po?.supplier || "")
  const [items, setItems] = useState(
    isPOMode ? po.items.filter(i => i.received < i.qty).map(i => ({
      ...i, id: "gi" + Date.now() + Math.random().toString(36).slice(2, 6), poItemId: i.id,
      qty: i.qty - i.received, // remaining qty
    })) : []
  )
  const [receivedBy, setReceivedBy] = useState("")
  const [invoiceRef, setInvoiceRef] = useState("")
  const [notes, setNotes] = useState("")
  const [addName, setAddName] = useState("")
  const [addQty, setAddQty] = useState("1")
  const [addUnit, setAddUnit] = useState("pcs")
  const [addPrice, setAddPrice] = useState("")

  const total = items.reduce((s, i) => s + (i.qty * (i.unitPrice || 0)), 0)

  const addItem = () => {
    if (!addName.trim()) { tt("⚠️ Enter item name"); return }
    setItems(prev => [...prev, {
      id: "gi" + Date.now(), name: addName.trim(), qty: Number(addQty) || 1,
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
      notes: notes.trim(),
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
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: SP.sm, padding: "10px 0", borderBottom: idx < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{item.unit || "pcs"} × Rs.{(item.unitPrice || 0).toLocaleString()}</div>
            </div>
            {isPOMode ? (
              <input type="number" value={item.qty} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: Number(e.target.value) || 0 } : i))}
                style={{ width: 60, padding: "8px", fontSize: 16, fontFamily: MONO, fontWeight: 700, borderRadius: 8, border: `2px solid ${C.accent}30`, textAlign: "center", outline: "none" }} />
            ) : (
              <>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>{item.qty} × {(item.unitPrice || 0).toLocaleString()}</span>
                <span onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} style={{ fontSize: 16, color: C.muted, cursor: "pointer", padding: 4 }}>×</span>
              </>
            )}
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
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Notes</div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={{ ...inp, fontSize: 14 }} autoComplete="off" />
        </div>
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

// ═══ MAIN STORE SCREEN ═══
export default function StoreScreen({ purchaseOrders, grns, setPurchaseOrders, setGrns, tt }) {
  const [storeTab, setStoreTab] = useState("pos") // pos | grns
  const [storeScreen, setStoreScreen] = useState("list") // list | new_po | view_po | new_grn | view_grn | direct_grn
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
    const po = { id: "po_" + Date.now(), poNumber: nextPONum(), status: "draft", ...data, created_at: new Date().toISOString() }
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
    const grn = { id: "grn_" + Date.now(), grnNumber: nextGRNNum(), ...data, created_at: new Date().toISOString() }
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
  if (storeScreen === "new_po") {
    return <NewPOForm onSave={createPO} onCancel={() => setStoreScreen("list")} suppliers={suppliers} tt={tt} />
  }
  if (storeScreen === "view_po" && activePO) {
    return <PODetail po={activePO} onBack={() => { setStoreScreen("list"); setActivePO(null) }}
      onUpdate={updatePO} onCreateGRN={(po) => { setReceivePO(po); setStoreScreen("new_grn") }} grns={grns} tt={tt} />
  }
  if (storeScreen === "new_grn" && receivePO) {
    return <ReceiveGoodsForm po={receivePO} onSave={createGRN} onCancel={() => { setStoreScreen("view_po"); setActivePO(receivePO) }} suppliers={suppliers} tt={tt} />
  }
  if (storeScreen === "direct_grn") {
    return <ReceiveGoodsForm po={null} onSave={createGRN} onCancel={() => setStoreScreen("list")} suppliers={suppliers} tt={tt} />
  }
  if (storeScreen === "view_grn" && activeGRN) {
    return <GRNDetail grn={activeGRN} onBack={() => { setStoreScreen("list"); setActiveGRN(null) }} pos={purchaseOrders} />
  }

  // Filter
  const q = search.toLowerCase().replace(/\s/g, "")
  const filteredPOs = q ? purchaseOrders.filter(p => p.supplier.toLowerCase().includes(q) || p.poNumber.toLowerCase().includes(q) || p.items.some(i => i.name.toLowerCase().includes(q))) : purchaseOrders
  const filteredGRNs = q ? grns.filter(g => g.supplier.toLowerCase().includes(q) || g.grnNumber.toLowerCase().includes(q) || g.items.some(i => i.name.toLowerCase().includes(q))) : grns

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

      {/* PO / GRN tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: SP.md, background: C.card, borderRadius: 14, padding: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div onClick={() => setStoreTab("pos")} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, minHeight: 44, cursor: "pointer", background: storeTab === "pos" ? C.accent + "12" : "transparent", color: storeTab === "pos" ? C.accent : C.muted, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>
          📋 POs ({purchaseOrders.length})
        </div>
        <div onClick={() => setStoreTab("grns")} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, minHeight: 44, cursor: "pointer", background: storeTab === "grns" ? C.green + "12" : "transparent", color: storeTab === "grns" ? C.green : C.muted, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>
          📥 GRNs ({grns.length})
        </div>
      </div>

      {/* PO List */}
      {storeTab === "pos" && (
        <>
          {filteredPOs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>No purchase orders</div>
              <div style={{ fontSize: 16, marginTop: 6 }}>Create a PO to order supplies</div>
            </div>
          ) : filteredPOs.map(po => (
            <div key={po.id} onClick={() => { setActivePO(po); setStoreScreen("view_po") }} style={{ ...card, cursor: "pointer", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
          ))}

          <button onClick={() => setStoreScreen("new_po")} style={{ ...btn(C.accent, "#fff"), marginTop: SP.sm, position: "sticky", bottom: 20 }}>+ New PO</button>
        </>
      )}

      {/* GRN List */}
      {storeTab === "grns" && (
        <>
          {filteredGRNs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📥</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>No goods received</div>
              <div style={{ fontSize: 16, marginTop: 6 }}>Record purchases here</div>
            </div>
          ) : filteredGRNs.map(grn => {
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

          <div style={{ display: "flex", gap: 8, marginTop: SP.sm, position: "sticky", bottom: 20 }}>
            <button onClick={() => setStoreScreen("direct_grn")} style={{ ...btn(C.green, "#fff"), flex: 1 }}>📥 Direct Purchase</button>
          </div>
        </>
      )}
    </div>
  )
}
