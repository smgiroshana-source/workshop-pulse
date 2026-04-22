"use client"
import { useState, useRef, useEffect, useMemo, useCallback, createContext, useContext } from "react";
import { supabase, uploadPhoto, deletePhoto } from "./supabase"

// Collision-resistant ID generator: prefix + timestamp + random
export const genId = (prefix = "id") => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

// ═══ CONSTANTS ═══
export const C = {
  bg: "#F2F2F7", card: "#FFFFFF", text: "#000000", sub: "#6C6C70", muted: "#AEAEB2",
  accent: "#007AFF", green: "#34C759", orange: "#FF9500", red: "#FF3B30", purple: "#AF52DE",
  border: "#E5E5EA", sheetBg: "rgba(0,0,0,0.4)",
  // Semantic tokens
  accentLight: "#007AFF12", focusRing: "#007AFF40",
  successBg: "#34C75910", warningBg: "#FF950010", errorBg: "#FF3B3010",
}
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 }
export const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"
export const MONO = "'SF Mono', ui-monospace, 'Menlo', monospace"
export const fmt = n => Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })

export const card = { background: C.card, borderRadius: 16, padding: SP.lg, marginBottom: SP.md, boxShadow: "0 0.5px 1px rgba(0,0,0,0.05)" }
export const pill = (color) => ({ fontSize: 13, fontWeight: 600, color, background: color + "15", padding: "5px 12px", borderRadius: 20 })
export const btn = (bg, color) => ({ border: "none", borderRadius: 12, padding: "16px 24px", fontSize: 17, fontWeight: 600, cursor: "pointer", color: color || "#fff", background: bg || C.accent, fontFamily: FONT, width: "100%", textAlign: "center", letterSpacing: "-0.3px", minHeight: 52, transition: "all 0.15s ease", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" })
export const btnSm = (bg, color) => ({ ...btn(bg, color), padding: "12px 18px", fontSize: 15, borderRadius: 10, minHeight: 44 })
export const btnOutline = (color) => ({ border: `1.5px solid ${color || C.accent}`, borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", color: color || C.accent, background: "transparent", fontFamily: FONT, width: "100%", textAlign: "center", minHeight: 48, transition: "all 0.15s ease" })
export const btnText = (color) => ({ border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 15, fontWeight: 600, cursor: "pointer", color: color || C.accent, background: "transparent", fontFamily: FONT, textAlign: "center", minHeight: 44 })
export const inp = { width: "100%", boxSizing: "border-box", padding: "14px 16px", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 17, fontFamily: FONT, outline: "none", letterSpacing: "-0.2px", transition: "border-color 0.15s, box-shadow 0.15s" }

export const CATS_PAINT = [
  { key: "remove_refix", label: "Remove-Refix", short: "R/R", icon: "🔩", color: C.accent },
  { key: "reshaping", label: "Reshaping", short: "Reshape", icon: "🔨", color: C.orange },
  { key: "booth_painting", label: "Booth Painting", short: "Paint", icon: "🎨", color: C.purple },
  { key: "replace", label: "Replace", short: "Replace", icon: "📦", color: C.green },
]
export const CATS_MECH = [
  { key: "replace", label: "Replace", short: "Replace", icon: "📦", color: C.green },
  { key: "labour", label: "Labour", short: "Labour", icon: "👷", color: C.accent },
]
export const CATS_ALL = [
  { key: "remove_refix", label: "Remove-Refix", short: "R/R", icon: "🔩", color: C.accent },
  { key: "reshaping", label: "Reshaping", short: "Reshape", icon: "🔨", color: C.orange },
  { key: "booth_painting", label: "Booth Painting", short: "Paint", icon: "🎨", color: C.purple },
  { key: "replace", label: "Replace", short: "Replace", icon: "📦", color: C.green },
  { key: "labour", label: "Labour", short: "Labour", icon: "👷", color: C.accent },
]
export const getCats = (wt) => wt === "mechanical" ? CATS_MECH : wt === "both" ? CATS_ALL : CATS_PAINT
// Backward compat -- default to paint cats
export const CATS = CATS_ALL
export const COMMON_PARTS = ["Front Bumper","Rear Bumper","Bumper Lip","Front Bumper with all accessories","Rear Bumper with all accessories","RHS Fender","LHS Fender","RHS Fender inner liner","LHS Fender inner liner","RHS Front Door","LHS Front Door","RHS Rear Door","LHS Rear Door","RHS Quarter Panel","LHS Quarter Panel","RHS A Post","LHS A Post","RHS Side Mirror","LHS Side Mirror","Bonnet","Boot Lid","Back Panel","Roof Panel","RHS Head Light","LHS Head Light","RHS Tail Light","LHS Tail Light","Windscreen","Rear Windscreen","RHS Front Wheel Arch","LHS Front Wheel Arch","RHS Rear Wheel Arch","LHS Rear Wheel Arch","Dashboard Complete","Front Retainer","Wiper Panel with Ends","RHS Fender Apron","LHS Fender Apron","Rear Number Plate Bracket","RHS Reflector Cover","LHS Reflector Cover"]
export const WORKSHOP = { name: "MacForce Auto Engineering", address: "No.555, Pannipitiya Road, Thalawathugoda", phone: "+94 772 291 219", email: "macforceautoengineering@gmail.com" }
export const VEHICLE_MAKES = ["Toyota","Nissan","Honda","Suzuki","Mitsubishi","Mazda","Subaru","Daihatsu","Isuzu","Lexus","Mercedes-Benz","BMW","Audi","Volkswagen","Porsche","Hyundai","Kia","MG","Perodua","Micro"]
export const INSURANCE_COMPANIES = ["SLIC","Ceylinco General","Continental Insurance","LOLC General Insurance","Fairfirst Insurance","Allianz Insurance Lanka","AIA Insurance Lanka","Janashakthi Insurance","HNB General Insurance","Peoples Insurance","Amana Takaful","Cooperative Insurance"]

export const INV_STATUS = { draft:{l:"Draft",c:C.sub}, finalized:{l:"Finalized",c:C.accent}, sent:{l:"Sent",c:C.orange}, partially_paid:{l:"Partial",c:C.orange}, paid:{l:"Paid",c:C.green}, cancelled:{l:"Cancelled",c:C.red} }

// ═══ ALL POSSIBLE STAGES ═══
export const ALL_STAGES = {
  job_received:     {label:"Job Received",    icon:"📥",color:C.accent,    auto:true},
  est_pending:      {label:"Estimate Pending", icon:"📝",color:C.orange,   auto:true},
  est_ready:        {label:"Estimate Ready",   icon:"📋",color:C.accent,   auto:true},
  approved_dismantle:{label:"Approved & Dismantle",icon:"🔧",color:C.orange, auto:false, cond:"insurance"},
  in_progress:      {label:"In Progress",      icon:"🛠️",color:C.accent,   auto:false},
  paint_stage:      {label:"Paint Stage",      icon:"🎨",color:C.purple,   auto:false, cond:"has_paint"},
  qc:               {label:"QC",               icon:"✅",color:C.green,    auto:false},
  ready:            {label:"Ready",            icon:"🚗",color:C.green,    auto:false},
  delivered:        {label:"Delivered",        icon:"📦",color:C.sub,      auto:false},
  follow_up:        {label:"Follow Up",        icon:"📞",color:C.orange,   auto:false},
  closed:           {label:"Closed",           icon:"🏁",color:C.sub,      auto:false},
  cancelled:        {label:"Cancelled",        icon:"✕", color:C.red,      auto:false},
}

// ═══ Components OUTSIDE App (prevents remount) ═══
export const NavBar = ({title,subtitle,onBack,right}) => (
  <div style={{marginBottom:20,paddingTop:8}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div style={{flex:1}}>
        {onBack&&<div onClick={onBack} style={{fontSize:17,color:C.accent,cursor:"pointer",fontWeight:500,marginBottom:4,display:"inline-flex",alignItems:"center",gap:4,padding:"8px 12px 8px 0",minHeight:44,marginLeft:-8,paddingLeft:8,borderRadius:10}}>
          <span style={{fontSize:22}}>‹</span> Back
        </div>}
        <div style={{fontSize:34,fontWeight:700,color:C.text,letterSpacing:"-0.7px",lineHeight:1.1}}>{title}</div>
        {subtitle&&<div style={{fontSize:17,color:C.sub,marginTop:4,letterSpacing:"-0.2px"}}>{subtitle}</div>}
      </div>
      {right&&<div style={{flexShrink:0,paddingTop:onBack?28:4}}>{right}</div>}
    </div>
  </div>
)

export const Sheet = ({children, onClose}) => (
  <div style={{position:"fixed",inset:0,background:C.sheetBg,zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:600,padding:"8px 24px max(36px, calc(36px + env(safe-area-inset-bottom)))",maxHeight:"92vh",overflowY:"auto"}}>
      <div style={{width:40,height:5,background:C.muted,borderRadius:3,margin:"8px auto 20px"}} />
      {children}
    </div>
  </div>
)

// ═══ Pipeline calculator ═══
export function buildPipeline(isInsurance, estimates, workType, jobType) {
  // Quick job: minimal pipeline
  if (jobType === "quick") return ["job_received", "closed"]

  const allEntries = estimates.flatMap(e => (e.approved_entries || e.entries || []))
  const hasPaint = allEntries.some(e => ["booth_painting", "reshaping", "remove_refix"].includes(e.category))

  // Direct + no estimates yet -> minimal
  if (!isInsurance && estimates.length === 0) return ["job_received", "est_pending", "est_ready", "in_progress", "qc", "ready", "delivered", "follow_up", "closed"]

  const stages = ["job_received", "est_pending", "est_ready"]
  if (isInsurance) stages.push("approved_dismantle")
  stages.push("in_progress")
  if (hasPaint || workType === "paint" || workType === "both") stages.push("paint_stage")
  stages.push("qc", "ready", "delivered", "follow_up", "closed")
  return stages
}

// Normalize vehicle reg: CBB-5949, CBB5949, CBB 5949 -> "CBB 5949"
export const normalizeReg = (raw) => {
  if (!raw) return "";
  const s = raw.toUpperCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
  // Temp/dealer plate: LLL-NNNN/X or LLL-NNNN/XXX (e.g., "CAA 1234 / H")
  const tempMatch = s.match(/^([A-Z]{2,3})\s*(\d{4})\s*\/\s*([A-Z]{1,3})$/);
  if (tempMatch) return `${tempMatch[1]} ${tempMatch[2]}/${tempMatch[3]}`;
  const m = s.match(/^([A-Z]{2}\s)?([A-Z]{2,3})\s*(\d{4})$/);
  if (m) return (m[1] || "") + m[2] + " " + m[3];
  return s;
};
export const regSearchKey = (raw) => normalizeReg(raw).replace(/\s/g, "").toLowerCase();
export const normalizePhone = (raw) => {
  if (!raw) return { valid: false, normalized: "", error: "Phone required" };
  // Strip spaces, dashes, parens, dots
  let d = raw.replace(/[\s\-().]/g, "");
  // Handle international prefix: +94..., 0094..., 94...
  if (d.startsWith("+94")) d = d.slice(3);
  else if (d.startsWith("0094")) d = d.slice(4);
  else if (d.length === 11 && d.startsWith("94")) d = d.slice(2);
  if (!/^\d+$/.test(d)) return { valid: false, normalized: d, error: "Numbers only" };
  if (d.length === 10 && d[0] === "0") return { valid: true, normalized: d.slice(1), error: "" };
  if (d.length === 9 && d[0] !== "0") return { valid: true, normalized: d, error: "" };
  if (d.length === 9 && d[0] === "0") return { valid: false, normalized: d, error: "9 digits starting with 0 invalid. Use 10 digits with leading 0" };
  if (d.length > 10) return { valid: false, normalized: d, error: "Too many digits" };
  return { valid: false, normalized: d, error: "Need 10 digits (with 0) or 9 (without). Got " + d.length };
};
export const phoneSearchKey = (raw) => {
  const d = (raw || "").replace(/[\s\-()]/g, "");
  return (d.length === 10 && d[0] === "0") ? d.slice(1) : d;
};

// ═══ CONTEXT ═══
const WorkshopContext = createContext(null)

export function useWorkshop() {
  const ctx = useContext(WorkshopContext)
  if (!ctx) throw new Error("useWorkshop must be used within WorkshopProvider")
  return ctx
}

export function WorkshopProvider({ children }) {
  const [screen, setScreen] = useState("home")
  const [toast, setToast] = useState(null)
  const tt = m => { setToast(m); setTimeout(() => setToast(null), 2000) }

  // ═══ JOBS LIST ═══
  const [jobs, setJobs] = useState([])
  const [activeJobId, setActiveJobId] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStage, setFilterStage] = useState("all")

  // ═══ WORKING STATE ═══
  const [jobInfo, setJobInfo] = useState({ customer_name:"", customer_phone:"", vehicle_reg:"", vehicle_make:"", vehicle_model:"", insurance_name:"" })
  const [jobStage, setJobStage] = useState("job_received")
  const [jobPaused, setJobPaused] = useState(false)
  const [partsOrdered, setPartsOrdered] = useState(false)
  const [partsArrived, setPartsArrived] = useState({}) // {partId: true/false}
  const [showPaintWarn, setShowPaintWarn] = useState(false)
  const [makeSuggestions, setMakeSuggestions] = useState([])
  const [showInsDropdown, setShowInsDropdown] = useState(false)
  const [estimates, setEstimates] = useState([])
  const [selEst, setSelEst] = useState(null)
  const [estParts, setEstParts] = useState([])
  const [estEntries, setEstEntries] = useState([])
  const [sundryItems, setSundryItems] = useState([])
  const [sundryInput, setSundryInput] = useState("")
  const [partInput, setPartInput] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [activeCat, setActiveCat] = useState(0)
  const partInputRef = useRef(null)
  const rateRefs = useRef({})
  const [approvalItems, setApprovalItems] = useState([])
  const [approvalCat, setApprovalCat] = useState(0)
  const approvalRefs = useRef({})
  const [jobDocs, setJobDocs] = useState([])
  const [qcChecks, setQcChecks] = useState({}) // { "partName__cat__checkId": true, "uni_xxx": true }
  // Parts Invoice (supplier invoices submitted to insurance)
  const [supplierInvoices, setSupplierInvoices] = useState([]) // [{id, supplierName, photo, partIds:[]}]
  // Job costs for minor/quick jobs (and cost tracking for all jobs)
  const [jobCosts, setJobCosts] = useState([]) // [{id, name, type:"part"|"sundry"|"outsource"|"labour", source:"purchased"|"ex_stock", cost:0, confirmed:false}]
  const [showSupplierInvForm, setShowSupplierInvForm] = useState(false)
  const suppInvPhotoRef = useRef(null)
  const [followUpNote, setFollowUpNote] = useState("")
  const [followUpAttempts, setFollowUpAttempts] = useState(0) // no-answer count
  const [followUpLog, setFollowUpLog] = useState([]) // [{text, time}]
  const [showImage, setShowImage] = useState(null)
  const [showUploadMenu, setShowUploadMenu] = useState(null)
  const [photoTag, setPhotoTag] = useState("General") // current tag for next upload
  const uploadRef = useRef(null)
  const [invoices, setInvoices] = useState([])
  const [selInv, setSelInv] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("bank_transfer")
  const [payRef, setPayRef] = useState("")
  const [discount, setDiscount] = useState(0)
  const [showDiscountInput, setShowDiscountInput] = useState(false)
  const [showCustDiscInput, setShowCustDiscInput] = useState(false)
  const [custDiscount, setCustDiscount] = useState(0)
  const [payType, setPayType] = useState("insurance")
  const [insPayPhoto, setInsPayPhoto] = useState(null)
  const insPhotoRef = useRef(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [confirmDelEst, setConfirmDelEst] = useState(null)
  const [showSubFlowPrompt, setShowSubFlowPrompt] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [homeTab, setHomeTab] = useState("active") // active | on_hold | closed | store

  // ═══ STORE / PROCUREMENT ═══
  const DEMO_POS = [
    { id: "po_demo1", poNumber: "PO-001", status: "ordered", supplier: "Nippon Paint Lanka", supplierPhone: "0112345678", supplierWhatsapp: "0771234567", supplierEmail: "orders@nipponpaint.lk", supplierAddress: "Colombo 10", items: [
      { id: "pi_d1", name: "2K Clear Coat", qty: 5, unit: "litre", unitPrice: 4500, received: 0 },
      { id: "pi_d2", name: "Primer Surfacer (Grey)", qty: 10, unit: "litre", unitPrice: 2800, received: 0 },
      { id: "pi_d3", name: "Hardener", qty: 3, unit: "litre", unitPrice: 3200, received: 0 },
    ], notes: "Delivery expected by end of week", totalAmount: 60100, created_at: "2026-03-15T08:00:00Z" },
    { id: "po_demo2", poNumber: "PO-002", status: "received", supplier: "Lanka Auto Parts", supplierPhone: "0112987654", supplierWhatsapp: "0779876543", supplierEmail: "sales@lankaautoparts.lk", supplierAddress: "Nugegoda", items: [
      { id: "pi_d4", name: "Sandpaper P800", qty: 50, unit: "sheet", unitPrice: 120, received: 50 },
      { id: "pi_d5", name: "Sandpaper P1200", qty: 30, unit: "sheet", unitPrice: 150, received: 30 },
      { id: "pi_d6", name: "Masking Tape 1\"", qty: 20, unit: "roll", unitPrice: 350, received: 20 },
    ], notes: "", totalAmount: 17500, created_at: "2026-03-10T09:30:00Z" },
    { id: "po_demo3", poNumber: "PO-003", status: "draft", supplier: "Akzo Nobel Lanka", supplierPhone: "0114567890", supplierWhatsapp: "0764567890", supplierEmail: "info@akzonobel.lk", supplierAddress: "Peliyagoda", items: [
      { id: "pi_d7", name: "Base Coat - Pearl White (NH788P)", qty: 2, unit: "litre", unitPrice: 12000, received: 0 },
      { id: "pi_d8", name: "Base Coat - Midnight Blue (B607P)", qty: 1, unit: "litre", unitPrice: 14500, received: 0 },
      { id: "pi_d9", name: "Thinner (Slow)", qty: 5, unit: "litre", unitPrice: 1800, received: 0 },
    ], notes: "Check colour code before ordering", totalAmount: 47500, created_at: "2026-03-19T14:00:00Z" },
  ]
  const DEMO_GRNS = [
    { id: "grn_demo1", grnNumber: "GRN-001", poId: "po_demo2", supplier: "Lanka Auto Parts", items: [
      { id: "gi_d1", name: "Sandpaper P800", qty: 50, unit: "sheet", unitPrice: 120, poItemId: "pi_d4" },
      { id: "gi_d2", name: "Sandpaper P1200", qty: 30, unit: "sheet", unitPrice: 150, poItemId: "pi_d5" },
      { id: "gi_d3", name: "Masking Tape 1\"", qty: 20, unit: "roll", unitPrice: 350, poItemId: "pi_d6" },
    ], receivedBy: "Kamal", invoiceRef: "INV-LA-4521", invoicePhoto: null, notes: "All items in good condition", totalAmount: 17500, receivedDate: "2026-03-12T11:00:00Z", created_at: "2026-03-12T11:00:00Z" },
    { id: "grn_demo2", grnNumber: "GRN-002", poId: null, supplier: "Perera Paint Supplies", items: [
      { id: "gi_d4", name: "Polishing Compound", qty: 2, unit: "kg", unitPrice: 3500, poItemId: null },
      { id: "gi_d5", name: "Microfiber Cloth", qty: 10, unit: "pcs", unitPrice: 250, poItemId: null },
      { id: "gi_d6", name: "Spray Gun Cleaner", qty: 3, unit: "litre", unitPrice: 1200, poItemId: null },
    ], receivedBy: "Nuwan", invoiceRef: "PPS-887", invoicePhoto: null, notes: "Direct purchase - urgent need", totalAmount: 13100, receivedDate: "2026-03-18T15:30:00Z", created_at: "2026-03-18T15:30:00Z" },
  ]
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [grns, setGrns] = useState([])
  // CashBook: { miscExpenses: [{id, date, description, amount, category}], dailyCounts: [{date, actualCash, note}], bankBalance: number, openingCash: number }
  const [cashBook, setCashBook] = useState({ miscExpenses: [], dailyCounts: [], bankBalance: 0, openingCash: 0 })
  const storeSyncRef = useRef(false)
  // Load from Supabase
  useEffect(() => {
    supabase.from("store_data").select("*").eq("id", "main").single()
      .then(({ data }) => {
        if (data?.data && (data.data.purchaseOrders?.length > 0 || data.data.grns?.length > 0)) {
          setPurchaseOrders(data.data.purchaseOrders || [])
          setGrns(data.data.grns || [])
        } else {
          // Load demo data if empty
          setPurchaseOrders(DEMO_POS)
          setGrns(DEMO_GRNS)
        }
        if (data?.data?.cashBook) setCashBook(data.data.cashBook)
        storeSyncRef.current = true
      })
  }, [])
  // Sync store data to Supabase (debounced)
  const storeDirtyRef = useRef(false)
  const storeTimerRef = useRef(null)
  useEffect(() => {
    if (!storeSyncRef.current) return
    storeDirtyRef.current = true
    if (storeTimerRef.current) clearTimeout(storeTimerRef.current)
    storeTimerRef.current = setTimeout(() => {
      if (!storeDirtyRef.current) return
      supabase.from("store_data").upsert({ id: "main", data: { purchaseOrders, grns, cashBook }, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error("Store sync error:", error) })
      storeDirtyRef.current = false
    }, 1000)
    return () => { if (storeTimerRef.current) clearTimeout(storeTimerRef.current) }
  }, [purchaseOrders, grns, cashBook])
  // Parts Quotation (insurance) / PO (direct)
  const [partsQuotation, setPartsQuotation] = useState([]) // [{id, partName, estLabel, supplier, quotedPrice, approvedPrice, remarks}]
  const [pqStatus, setPqStatus] = useState("draft") // draft | submitted | approved
  const [pqApprovalPhoto, setPqApprovalPhoto] = useState(null)
  const [pqLumpSum, setPqLumpSum] = useState(null) // null = per-part, number = lump sum
  const [pqLumpMode, setPqLumpMode] = useState(false) // false = per-part, true = lump sum
  const [customerConfirmed, setCustomerConfirmed] = useState(false)
  const [showPQScreen, setShowPQScreen] = useState(false)
  const [pqTab, setPqTab] = useState("quote") // quote | approve | cost
  const pqPhotoRef = useRef(null)
  // Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState({})
  const toggleSection = useCallback((key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] })), [])
  // Sort
  const [sortBy, setSortBy] = useState("newest") // newest, oldest, highest_value, stage_order
  // Loading
  const [isUploading, setIsUploading] = useState(false)

  // Responsive
  const [isTablet, setIsTablet] = useState(false)
  const [hoverJobId, setHoverJobId] = useState(null)
  const [hoverY, setHoverY] = useState(0)
  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // ═══ SUPABASE PERSISTENCE ═══
  const initializedRef = useRef(false)
  const loadSucceededRef = useRef(false) // safety: only allow deletes if initial load succeeded
  const prevJobsRef = useRef([])
  const dirtyJobsRef = useRef(new Set()) // track which job IDs have changed
  const syncTimerRef = useRef(null)
  const [loadError, setLoadError] = useState(null)

  // Load active + on-hold jobs on mount; closed jobs loaded lazily when tab opened
  const [closedLoaded, setClosedLoaded] = useState(false)
  const [closedCount, setClosedCount] = useState(null) // pre-fetched count before lazy load

  const loadJobs = useCallback(() => {
    setLoadError(null)
    supabase.from("jobs").select("*")
      .neq("stage", "closed")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load jobs:", error)
          setLoadError("Failed to load jobs. Check your connection.")
          return
        }
        const loaded = (data || []).map(row => row.data)
        prevJobsRef.current = loaded
        setJobs(loaded)
        initializedRef.current = true
        loadSucceededRef.current = true
        setLoadError(null)
      })
    // Fetch closed count separately (lightweight)
    supabase.from("jobs").select("id", { count: "exact", head: true })
      .eq("stage", "closed")
      .then(({ count }) => { if (count != null) setClosedCount(count) })
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  // Explicit trigger to load closed jobs (for Closed tab AND Cash Book)
  const loadClosedJobs = useCallback(() => {
    if (closedLoaded || !initializedRef.current) return
    supabase.from("jobs").select("*")
      .eq("stage", "closed")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) { console.error("Failed to load closed jobs:", error); return }
        const loaded = (data || []).map(row => row.data)
        setJobs(prev => {
          const existing = new Set(prev.map(j => j.id))
          const newRows = loaded.filter(j => !existing.has(j.id))
          const merged = [...prev, ...newRows]
          prevJobsRef.current = merged
          return merged
        })
        setClosedLoaded(true)
      })
  }, [closedLoaded])

  // Auto-load closed jobs when Closed tab is opened
  useEffect(() => {
    if (homeTab === "closed") loadClosedJobs()
  }, [homeTab, loadClosedJobs])

  // Build upsert row from a job object
  const buildRow = (job) => ({
    id: job.id,
    data: job,
    created_at: job.created_at,
    stage: job.stage,
    on_hold: job.onHold || false,
    vehicle_reg: (job.jobInfo?.vehicle_reg || "").replace(/\s/g, "").toLowerCase(),
    customer_name: (job.jobInfo?.customer_name || "").toLowerCase(),
    customer_phone: job.jobInfo?.customer_phone || "",
    job_type: job.jobInfo?.job_type || "",
  })

  // Debounced sync: collects dirty job IDs and flushes after 500ms
  const flushSync = useCallback(() => {
    if (!initializedRef.current) return
    const dirty = dirtyJobsRef.current
    if (dirty.size === 0) return

    const current = prevJobsRef.current // already updated by the effect
    const toUpsert = []
    const nowISO = new Date().toISOString()
    for (const id of dirty) {
      const job = current.find(j => j.id === id)
      if (job) {
        // Stamp updated_at so concurrent edits can be detected later
        job.updated_at = nowISO
        toUpsert.push(buildRow(job))
      }
    }
    if (toUpsert.length > 0) {
      supabase.from("jobs").upsert(toUpsert)
        .then(({ error }) => { if (error) console.error("Failed to sync jobs:", error) })
    }
    dirty.clear()
  }, [])

  // Sync job changes to Supabase with debouncing and dirty tracking
  useEffect(() => {
    if (!initializedRef.current) return
    const prev = prevJobsRef.current
    const current = jobs

    // Mark changed/new jobs as dirty (use reference equality first, fall back to ID lookup)
    const prevMap = new Map(prev.map(j => [j.id, j]))
    for (const job of current) {
      const prevJob = prevMap.get(job.id)
      if (!prevJob || prevJob !== job) {
        dirtyJobsRef.current.add(job.id)
      }
    }

    // Delete removed jobs — only if initial load succeeded (safety guard)
    if (loadSucceededRef.current) {
      const currentIds = new Set(current.map(j => j.id))
      for (const job of prev) {
        if (!currentIds.has(job.id)) {
          supabase.from("jobs").delete().eq("id", job.id)
            .then(({ error }) => { if (error) console.error("Failed to delete job:", job.id, error) })
        }
      }
    }

    prevJobsRef.current = current

    // Debounce upserts — flush after 500ms of inactivity
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(flushSync, 500)

    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current) }
  }, [jobs, flushSync])

  // Auto-reactivate held jobs (2-week delivered + 4-hour no-answer follow-ups)
  useEffect(() => {
    const check = () => {
      const now = new Date().toISOString()
      setJobs(prev => {
        let changed = false
        const updated = prev.map(j => {
          if (j.onHold && j.holdUntil && now >= j.holdUntil) {
            changed = true
            if (j.stage === "delivered") {
              return { ...j, onHold: false, holdUntil: null, stage: "follow_up" }
            }
            if (j.stage === "follow_up") {
              // No-answer retry reactivated -- check if 3rd attempt -> auto-close
              if ((j.followUpAttempts || 0) >= 3) {
                const closedLog = [...(j.followUpLog || []), { text: "Auto-closed after 3 no-answer attempts", time: now }]
                return { ...j, onHold: false, holdUntil: null, stage: "closed", followUpNote: (j.followUpNote || "") + (j.followUpNote ? ". " : "") + "Auto-closed: 3 no-answer attempts", followUpLog: closedLog }
              }
              return { ...j, onHold: false, holdUntil: null }
            }
          }
          return j
        })
        return changed ? updated : prev
      })
    }
    check() // check on load
    const timer = setInterval(check, 60000) // check every minute
    return () => clearInterval(timer)
  }, [])

  // ═══ DERIVED ═══
  const isInsurance = !!jobInfo.insurance_name
  const isDirectJob = !jobInfo.insurance_name
  const workType = jobInfo.work_type || "paint"
  const jobCats = getCats(workType)
  const cat = jobCats[activeCat] || jobCats[0]; const aCat = jobCats[approvalCat] || jobCats[0]
  const pipeline = buildPipeline(isInsurance, estimates, workType, jobInfo.job_type)
  const isMinorJob = jobInfo.job_type === "quick"
  const stageIdx = pipeline.indexOf(jobStage)
  const stageInfo = ALL_STAGES[jobStage] || ALL_STAGES.job_received
  const nextStage = stageIdx < pipeline.length - 1 ? pipeline[stageIdx + 1] : null
  const prevStage = stageIdx > 0 ? pipeline[stageIdx - 1] : null
  const hasEntry = (pid, ck) => estEntries.some(e => e.part_id === pid && e.category === ck)
  const getEntry = (pid, ck) => estEntries.find(e => e.part_id === pid && e.category === ck)
  const catTotal = ck => estEntries.filter(e => e.category === ck).reduce((s, e) => s + e.qty * e.rate, 0)
  const sundryTotal = sundryItems.reduce((s, i) => s + (i.remarks === "M/R" ? 0 : (i.rate * (i.qty || 1))), 0)
  const grandTotal = estEntries.reduce((s, e) => s + e.qty * e.rate, 0) + sundryTotal
  const activeJob = jobs.find(j => j.id === activeJobId)

  // Parts tracker: get all Replace parts from all estimates
  const replaceParts = estimates.flatMap(est => {
    const entries = (est.approved_entries || est.entries || []).filter(e => e.category === "replace")
    return entries.map(e => { const part = est.parts.find(p => p.id === e.part_id); return { id: e.part_id + "_" + est.id, partName: part?.name || e.part_name || "Unknown", estLabel: est.label, remarks: e.remarks } })
  })
  const hasReplaceParts = replaceParts.length > 0
  const arrivedCount = replaceParts.filter(p => partsArrived[p.id]).length
  const allPartsArrived = hasReplaceParts && arrivedCount === replaceParts.length
  const pendingParts = replaceParts.filter(p => !partsArrived[p.id])

  // Parts Quotation helpers
  const pqFilled = partsQuotation.filter(p => p.quotedPrice > 0).length
  const pqTotal = partsQuotation.length
  const pqAllFilled = pqTotal > 0 && pqFilled === pqTotal
  const pqTotalPrice = partsQuotation.reduce((s, p) => s + (p.quotedPrice || 0), 0)
  const pqApprovedTotal = pqLumpMode ? (pqLumpSum || 0) : partsQuotation.reduce((s, p) => s + (p.approvedPrice || 0), 0)
  const pqAllApproved = pqStatus === "approved"
  const pqHasApproval = pqLumpMode ? pqLumpSum > 0 : partsQuotation.some(p => p.approvedPrice > 0)

  // ═══ DYNAMIC QC CHECKLIST ═══
  const toggleQc = (key) => setQcChecks(prev => ({ ...prev, [key]: !prev[key] }))

  // Customer confirmation + PO for direct jobs
  const confirmCustomer = () => {
    setCustomerConfirmed(true)
    tt("✓ Customer confirmed -- PO ready")
  }

  // Generate WhatsApp PO text
  const generatePOText = () => {
    const job = activeJob
    const lines = [
      `*PURCHASE ORDER*`,
      `Job: ${job?.jobNumber}`,
      `Vehicle: ${jobInfo.vehicle_reg} ${jobInfo.vehicle_make} ${jobInfo.vehicle_model}`,
      `Customer: ${jobInfo.customer_name}`,
      ``,
      `*Parts Required:*`,
      ...replaceParts.map((p, i) => `${i + 1}. ${p.partName}${p.remarks ? ` (${p.remarks})` : ""}`),
      ``,
      `Please confirm availability and prices.`,
      `-- MacForce Auto Engineering`
    ]
    return lines.join("\n")
  }

  // Generate Parts Quotation text for insurance
  const generatePQText = () => {
    const job = activeJob
    const lines = [
      `*PARTS QUOTATION*`,
      `Job: ${job?.jobNumber} | Claim: ${jobInfo.insurance_name}`,
      `Vehicle: ${jobInfo.vehicle_reg} ${jobInfo.vehicle_make} ${jobInfo.vehicle_model}`,
      ``,
      ...partsQuotation.map((p, i) => `${i + 1}. ${p.partName} (${p.remarks}) -- Rs.${(p.quotedPrice || 0).toLocaleString()} [${p.supplier || "No supplier"}]`),
      ``,
      `*Total: Rs.${pqTotalPrice.toLocaleString()}*`,
      `-- MacForce Auto Engineering`
    ]
    return lines.join("\n")
  }

  const sharePQ = (type) => {
    const text = isInsurance ? generatePQText() : generatePOText()
    if (type === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
    } else {
      navigator.clipboard?.writeText(text)
      tt("📋 Copied to clipboard")
    }
  }

  // ═══ PDF GENERATION ═══
  const SHOP = { name: "MacForce Auto Engineering", addr: "No.555, Pannipitiya Road, Thalawathugoda", phone: "+94 772 291 219" }
  const APP_VERSION = "2.3.0"
  const pdfStyles = `@page{size:A4;margin:15mm}*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,Arial,sans-serif}body{padding:20px;color:#1a1a1a;font-size:13px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #007AFF}.shop-name{font-size:22px;font-weight:700;color:#007AFF}.shop-detail{font-size:12px;color:#666;margin-top:3px}.doc-title{font-size:28px;font-weight:700;text-align:right;color:#1a1a1a}.doc-sub{font-size:13px;color:#666;text-align:right;margin-top:2px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;background:#f8f8f8;padding:14px;border-radius:8px}.info-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px}.info-value{font-size:15px;font-weight:600;margin-top:2px}table{width:100%;border-collapse:collapse;margin-bottom:18px}th{background:#f0f0f0;padding:10px 12px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#555;border-bottom:2px solid #ddd}td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}.text-right{text-align:right}.text-center{text-align:center}.mono{font-family:'SF Mono','Courier New',monospace}.bold{font-weight:700}.cut{text-decoration:line-through;color:#999}.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}.tag-sh{background:#fff3e0;color:#e65100}.tag-mr{background:#e8f5e9;color:#2e7d32}.tag-us{background:#e3f2fd;color:#1565c0}.total-row td{font-weight:700;font-size:15px;border-top:2px solid #333;background:#fafafa}.summary-box{background:#f8f8f8;padding:16px;border-radius:8px;margin-bottom:18px}.footer{margin-top:30px;padding-top:15px;border-top:1px solid #ddd;font-size:11px;color:#888;display:flex;justify-content:space-between}.stamp{margin-top:40px;display:flex;justify-content:space-between}.stamp-box{text-align:center;width:200px}.stamp-line{border-top:1px solid #333;margin-top:50px;padding-top:5px;font-size:12px}@media print{body{padding:0}.no-print{display:none}}.print-btn{position:fixed;top:15px;right:15px;background:#007AFF;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;z-index:100}`;
  const openPDF = (title, bodyHtml) => {
    try {
      const w = window.open("", "_blank")
      if (!w || w.closed) {
        tt("Pop-ups blocked — please allow pop-ups for this site and try again")
        return
      }
      w.document.write("<!DOCTYPE html><html><head><title>" + title + "</title><style>" + pdfStyles + "</style></head><body><button class=\"print-btn no-print\" onclick=\"window.print()\">Print / Save PDF</button>" + bodyHtml + "</body></html>")
      w.document.close()
    } catch (e) {
      console.error("PDF generation failed:", e)
      tt("Failed to generate PDF — check browser settings")
    }
  }
  const generateEstimatePDF = (est) => {
    const isInsurance = !!jobInfo.insurance_name
    const isApproved = est.status === "approved"
    const entries = isApproved ? (est.approved_entries || est.entries) : est.entries
    let tableRows = ""
    const cats = getCats(jobInfo.work_type || "paint")
    cats.forEach(cat => {
      const catEntries = entries.filter(e => e.category === cat.key)
      if (!catEntries.length) return
      tableRows += "<tr><td colspan=\"5\" style=\"background:#f8f8f8;font-weight:700;font-size:14px;color:#333;padding:8px 12px\">" + cat.icon + " " + cat.label + "</td></tr>"
      catEntries.forEach((e, i) => {
        const part = est.parts.find(p => p.id === e.part_id)
        const name = part ? part.name : (e.part_name || "Item")
        const remarkTag = e.remarks === "U/S" ? "<span class=\"tag tag-us\">U/S</span>" : e.remarks === "M/R" ? "<span class=\"tag tag-mr\">M/R</span>" : e.remarks === "S/H" ? "<span class=\"tag tag-sh\">S/H</span>" : ""
        tableRows += "<tr><td>" + (i + 1) + "</td><td>" + name + " " + remarkTag + "</td><td class=\"text-center\">" + e.qty + "</td><td class=\"text-right mono\">Rs." + e.rate.toLocaleString() + "</td><td class=\"text-right mono bold\">Rs." + (e.qty * e.rate).toLocaleString() + "</td></tr>"
      })
    })
    if (est.sundries && est.sundries.length) {
      tableRows += "<tr><td colspan=\"5\" style=\"background:#f8f8f8;font-weight:700;font-size:14px;color:#333;padding:8px 12px\">Sundries</td></tr>"
      est.sundries.forEach((s, i) => {
        tableRows += "<tr><td>" + (i + 1) + "</td><td>" + s.name + (s.remarks === "M/R" ? " <span class=\"tag tag-mr\">M/R</span>" : "") + "</td><td class=\"text-center\">" + (s.qty || 1) + "</td><td class=\"text-right mono\">Rs." + (s.rate || 0).toLocaleString() + "</td><td class=\"text-right mono bold\">Rs." + ((s.rate || 0) * (s.qty || 1)).toLocaleString() + "</td></tr>"
      })
    }
    const total = isApproved ? (est.approved_total || est.total) : est.total
    tableRows += "<tr class=\"total-row\"><td colspan=\"4\" class=\"text-right\">TOTAL</td><td class=\"text-right mono\">Rs." + total.toLocaleString() + "</td></tr>"
    const html = "<div class=\"header\"><div><div class=\"shop-name\">" + SHOP.name + "</div><div class=\"shop-detail\">" + SHOP.addr + "</div><div class=\"shop-detail\">" + SHOP.phone + "</div></div><div><div class=\"doc-title\">" + (isApproved ? "APPROVED ESTIMATE" : "ESTIMATE") + "</div><div class=\"doc-sub\">" + est.number + " - " + est.label + "</div><div class=\"doc-sub\">" + new Date(est.created_at).toLocaleDateString() + "</div></div></div><div class=\"info-grid\"><div><div class=\"info-label\">Vehicle</div><div class=\"info-value\">" + jobInfo.vehicle_reg + "</div></div><div><div class=\"info-label\">Make / Model</div><div class=\"info-value\">" + jobInfo.vehicle_make + " " + jobInfo.vehicle_model + "</div></div><div><div class=\"info-label\">Customer</div><div class=\"info-value\">" + jobInfo.customer_name + "</div></div><div><div class=\"info-label\">" + (isInsurance ? "Insurance" : "Phone") + "</div><div class=\"info-value\">" + (isInsurance ? jobInfo.insurance_name : jobInfo.customer_phone) + "</div></div></div><table><thead><tr><th>#</th><th>Description</th><th class=\"text-center\">Qty</th><th class=\"text-right\">Rate</th><th class=\"text-right\">Amount</th></tr></thead><tbody>" + tableRows + "</tbody></table><div class=\"stamp\"><div class=\"stamp-box\"><div class=\"stamp-line\">Prepared By</div></div><div class=\"stamp-box\"><div class=\"stamp-line\">" + (isInsurance ? "Assessor" : "Customer") + " Signature</div></div></div><div class=\"footer\"><span>" + SHOP.name + "</span><span>Generated " + new Date().toLocaleDateString() + "</span></div>"
    openPDF(est.number + " - " + jobInfo.vehicle_reg, html)
  }
  const generateInvoicePDF = (inv) => {
    const isInsurance = !!jobInfo.insurance_name
    const total = invTotal(inv)
    const disc = inv.insurance_discount || 0
    const custDisc = inv.customer_discount || 0
    const afterInsDisc = total - disc
    const afterAllDisc = afterInsDisc - custDisc
    const paid = (inv.payments || []).reduce((s, p) => s + p.amount, 0)
    let rows = ""
    const ci = (inv.items || []).filter(i => i.category !== "sundry" && i.category !== "labour" && i.category !== "other")
    ci.forEach((item, i) => {
      rows += "<tr><td>" + (i + 1) + "</td><td>" + item.description + (item.remarks ? " <span class=\"tag " + (item.remarks === "S/H" ? "tag-sh" : item.remarks === "M/R" ? "tag-mr" : "tag-us") + "\">" + item.remarks + "</span>" : "") + "</td><td class=\"text-center\">" + item.category + "</td><td class=\"text-center\">" + item.qty + "</td><td class=\"text-right mono\">Rs." + item.unit_price.toLocaleString() + "</td><td class=\"text-right mono bold\">Rs." + (item.unit_price * item.qty).toLocaleString() + "</td></tr>"
    })
    let totalSection = "<tr class=\"total-row\"><td colspan=\"5\" class=\"text-right\">Subtotal</td><td class=\"text-right mono\">Rs." + total.toLocaleString() + "</td></tr>"
    if (disc > 0) totalSection += "<tr><td colspan=\"5\" class=\"text-right\" style=\"color:#e53935\">Insurance Discount</td><td class=\"text-right mono\" style=\"color:#e53935\">-Rs." + (total - afterInsDisc).toLocaleString() + "</td></tr>"
    if (custDisc > 0) totalSection += "<tr><td colspan=\"5\" class=\"text-right\" style=\"color:#e53935\">Customer Discount</td><td class=\"text-right mono\" style=\"color:#e53935\">-Rs." + (afterInsDisc - afterAllDisc).toLocaleString() + "</td></tr>"
    totalSection += "<tr class=\"total-row\"><td colspan=\"5\" class=\"text-right\" style=\"font-size:16px\">NET TOTAL</td><td class=\"text-right mono\" style=\"font-size:16px\">Rs." + afterAllDisc.toLocaleString() + "</td></tr>"
    const payRows = (inv.payments || []).map((p, i) => "<tr><td>" + new Date(p.date).toLocaleDateString() + "</td><td>" + (p.type === "insurance" ? "Insurance" : p.method) + "</td><td>" + (p.reference || "-") + "</td><td class=\"text-right mono\">Rs." + p.amount.toLocaleString() + "</td></tr>").join("")
    const html = "<div class=\"header\"><div><div class=\"shop-name\">" + SHOP.name + "</div><div class=\"shop-detail\">" + SHOP.addr + "</div><div class=\"shop-detail\">" + SHOP.phone + "</div></div><div><div class=\"doc-title\">INVOICE</div><div class=\"doc-sub\">" + inv.invoice_number + "</div><div class=\"doc-sub\">" + new Date(inv.created_at).toLocaleDateString() + "</div></div></div><div class=\"info-grid\"><div><div class=\"info-label\">Vehicle</div><div class=\"info-value\">" + jobInfo.vehicle_reg + "</div></div><div><div class=\"info-label\">Make / Model</div><div class=\"info-value\">" + jobInfo.vehicle_make + " " + jobInfo.vehicle_model + "</div></div><div><div class=\"info-label\">Customer</div><div class=\"info-value\">" + jobInfo.customer_name + "</div></div><div><div class=\"info-label\">" + (isInsurance ? "Insurance" : "Phone") + "</div><div class=\"info-value\">" + (isInsurance ? jobInfo.insurance_name : jobInfo.customer_phone) + "</div></div></div><table><thead><tr><th>#</th><th>Description</th><th class=\"text-center\">Cat</th><th class=\"text-center\">Qty</th><th class=\"text-right\">Rate</th><th class=\"text-right\">Amount</th></tr></thead><tbody>" + rows + totalSection + "</tbody></table>" + (payRows ? "<h3 style=\"margin:18px 0 8px;font-size:15px\">Payments Received</h3><table><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th class=\"text-right\">Amount</th></tr></thead><tbody>" + payRows + "</tbody></table>" : "") + "<div style=\"margin:18px 0\"><div><strong>Total:</strong> Rs." + afterAllDisc.toLocaleString() + "</div><div><strong>Paid:</strong> Rs." + paid.toLocaleString() + "</div><div><strong>Balance:</strong> <span style=\"color:" + (afterAllDisc - paid > 0 ? "#e53935" : "#2e7d32") + ";font-weight:700\">Rs." + (afterAllDisc - paid).toLocaleString() + "</span></div></div><div class=\"stamp\"><div class=\"stamp-box\"><div class=\"stamp-line\">" + SHOP.name + "</div></div><div class=\"stamp-box\"><div class=\"stamp-line\">Customer Signature</div></div></div><div class=\"footer\"><span>" + SHOP.name + "</span><span>Generated " + new Date().toLocaleDateString() + "</span></div>"
    openPDF(inv.invoice_number + " - " + jobInfo.vehicle_reg, html)
  }
  const generatePQPDF = () => {
    let rows = ""
    partsQuotation.forEach((p, i) => {
      const appr = p.approvedPrice != null ? "Rs." + p.approvedPrice.toLocaleString() : "-"
      rows += "<tr><td>" + (i + 1) + "</td><td>" + p.partName + "</td><td class=\"text-center\"><span class=\"tag " + (p.remarks === "S/H" ? "tag-sh" : p.remarks === "M/R" ? "tag-mr" : "tag-us") + "\">" + p.remarks + "</span></td><td>" + (p.supplier || "--") + "</td><td class=\"text-right mono bold\">" + appr + "</td></tr>"
    })
    const pqTotalPrice = partsQuotation.reduce((s, p) => s + (p.quotedPrice || 0), 0)
    rows += "<tr class=\"total-row\"><td colspan=\"4\" class=\"text-right\">QUOTED TOTAL</td><td class=\"text-right mono\">Rs." + pqTotalPrice.toLocaleString() + "</td></tr>"
    const html = "<div class=\"header\"><div><div class=\"shop-name\">" + SHOP.name + "</div><div class=\"shop-detail\">" + SHOP.addr + "</div><div class=\"shop-detail\">" + SHOP.phone + "</div></div><div><div class=\"doc-title\">PARTS QUOTATION</div><div class=\"doc-sub\">" + (activeJob ? activeJob.jobNumber : "") + " - " + jobInfo.insurance_name + "</div><div class=\"doc-sub\">" + new Date().toLocaleDateString() + "</div></div></div><div class=\"info-grid\"><div><div class=\"info-label\">Vehicle</div><div class=\"info-value\">" + jobInfo.vehicle_reg + "</div></div><div><div class=\"info-label\">Make / Model</div><div class=\"info-value\">" + jobInfo.vehicle_make + " " + jobInfo.vehicle_model + "</div></div><div><div class=\"info-label\">Customer</div><div class=\"info-value\">" + jobInfo.customer_name + "</div></div><div><div class=\"info-label\">Insurance</div><div class=\"info-value\">" + jobInfo.insurance_name + "</div></div></div><table><thead><tr><th>#</th><th>Part Description</th><th class=\"text-center\">Type</th><th>Supplier</th><th class=\"text-right\">Approved</th></tr></thead><tbody>" + rows + "</tbody></table>" + (pqLumpMode && pqLumpSum ? "<div class=\"summary-box\" style=\"text-align:center\"><div style=\"font-size:13px;color:#666\">Insurance Approved (Lump Sum)</div><div style=\"font-size:24px;font-weight:700;font-family:monospace;margin-top:4px\">Rs." + pqLumpSum.toLocaleString() + "</div></div>" : "") + "<div class=\"stamp\"><div class=\"stamp-box\"><div class=\"stamp-line\">" + SHOP.name + "</div></div><div class=\"stamp-box\"><div class=\"stamp-line\">Insurance Assessor</div></div></div><div class=\"footer\"><span>" + SHOP.name + "</span><span>Generated " + new Date().toLocaleDateString() + "</span></div>"
    openPDF("Parts Quotation - " + jobInfo.vehicle_reg, html)
  }

  // ═══ JOB MANAGEMENT ═══
  const saveCurrentJob = () => {
    if (!activeJobId) return
    setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, jobInfo: { ...jobInfo }, stage: jobStage, paused: jobPaused, partsOrdered, partsArrived: { ...partsArrived }, partsQuotation: [...partsQuotation], pqStatus, pqApprovalPhoto, pqLumpSum, pqLumpMode, customerConfirmed, estimates: [...estimates], invoices: [...invoices], jobDocs: [...jobDocs], qcChecks: { ...qcChecks }, supplierInvoices: [...supplierInvoices], jobCosts: [...jobCosts], followUpNote, followUpAttempts, followUpLog: [...followUpLog] } : j))
  }
  const openJob = (job) => {
    saveCurrentJob() // save any unsaved changes before switching jobs
    setActiveJobId(job.id)
    setJobInfo({ ...job.jobInfo })
    setJobStage(job.stage || "job_received")
    setJobPaused(job.paused || false)
    setPartsOrdered(job.partsOrdered || false)
    setPartsArrived({ ...(job.partsArrived || {}) })
    setPartsQuotation([...(job.partsQuotation || [])])
    setPqStatus(job.pqStatus || "draft")
    setPqApprovalPhoto(job.pqApprovalPhoto || null)
    setPqLumpSum(job.pqLumpSum ?? null)
    setPqLumpMode(job.pqLumpMode || false)
    setCustomerConfirmed(job.customerConfirmed || false)
    setEstimates([...(job.estimates || [])])
    setInvoices([...(job.invoices || [])])
    setJobDocs([...(job.jobDocs || [])])
    setQcChecks({ ...(job.qcChecks || {}) })
    setSupplierInvoices([...(job.supplierInvoices || [])])
    setJobCosts([...(job.jobCosts || [])])
    setFollowUpNote(job.followUpNote || "")
    setFollowUpAttempts(job.followUpAttempts || 0)
    setFollowUpLog([...(job.followUpLog || [])])

    setSelEst(null); setSelInv(null); setEstParts([]); setEstEntries([]); setSundryItems([]); setSundryInput("")
    setCollapsedSections({})
    setScreen("job"); setSidebarExpanded(false)
  }
  const goHome = () => { saveCurrentJob(); setActiveJobId(null); setScreen("home"); setSidebarExpanded(false) }
  const [newJobInfo, setNewJobInfo] = useState({ customer_name:"", customer_phone:"", vehicle_reg:"", vehicle_make:"", vehicle_model:"", insurance_name:null, work_type:"paint", job_type:null })
  const [newJobMakeSugg, setNewJobMakeSugg] = useState([])
  const [newJobInsDD, setNewJobInsDD] = useState(false)
  const [insSearch, setInsSearch] = useState("")
  const [newJobErrors, setNewJobErrors] = useState({})
  const [customerMatch, setCustomerMatch] = useState(null) // matched from registry

  // ═══ CUSTOMER REGISTRY (built from all jobs) ═══
  const customerRegistry = useMemo(() => {
    const reg = {} // key: normalized vehicle_reg -> entry
    const byPhone = {} // key: normalized phone -> entry (legacy: latest vehicle)
    const byPhoneAll = {} // key: normalized phone -> ARRAY of all vehicles for this customer
    jobs.forEach(j => {
      const ji = j.jobInfo
      const nReg = normalizeReg(ji.vehicle_reg)
      const nPhone = phoneSearchKey(ji.customer_phone)
      const entry = { customer_name: ji.customer_name, customer_phone: ji.customer_phone, vehicle_reg: nReg, vehicle_make: ji.vehicle_make, vehicle_model: ji.vehicle_model }
      if (nReg) reg[regSearchKey(ji.vehicle_reg)] = entry
      if (nPhone && nPhone.length >= 9) {
        byPhone[nPhone] = entry
        if (!byPhoneAll[nPhone]) byPhoneAll[nPhone] = []
        // Dedupe by vehicle_reg
        if (!byPhoneAll[nPhone].some(e => e.vehicle_reg === nReg)) byPhoneAll[nPhone].push(entry)
      }
    })
    return { byReg: reg, byPhone, byPhoneAll }
  }, [jobs])
  const startNewJob = () => {
    setNewJobInfo({ customer_name:"", customer_phone:"", vehicle_reg:"", vehicle_make:"", vehicle_model:"", insurance_name:null, work_type:"paint", job_type:null })
    setNewJobErrors({}); setNewJobInsDD(false); setNewJobMakeSugg([]); setInsSearch(""); setNewJobPhoto(null); setCustomerMatch(null)
    setScreen("new_job")
  }

  // Start a warranty job from a closed job — pre-fills customer/vehicle + links to original
  const startWarrantyJob = (parentJob) => {
    if (!parentJob?.jobInfo) return
    const pi = parentJob.jobInfo
    setNewJobInfo({
      customer_name: pi.customer_name || "",
      customer_phone: pi.customer_phone || "",
      vehicle_reg: pi.vehicle_reg || "",
      vehicle_make: pi.vehicle_make || "",
      vehicle_model: pi.vehicle_model || "",
      insurance_name: null,
      work_type: pi.work_type || "paint",
      job_type: "direct", // warranty is never insurance (workshop bears cost)
      is_warranty: true,
      parent_job_id: parentJob.id,
      parent_job_number: parentJob.jobNumber,
      parent_job_date: parentJob.created_at,
    })
    setNewJobErrors({}); setNewJobInsDD(false); setNewJobMakeSugg([]); setInsSearch(""); setNewJobPhoto(null); setCustomerMatch(null)
    setScreen("new_job")
    tt(`🔧 Warranty job from ${parentJob.jobNumber}`)
  }
  const [newJobPhoto, setNewJobPhoto] = useState(null)
  const newJobPhotoRef = useRef(null)
  const validateAndCreateJob = () => {
    const errs = {}
    const isQuick = newJobInfo.job_type === "quick"
    // Normalize vehicle reg
    const normReg = normalizeReg(newJobInfo.vehicle_reg)
    if (!normReg.trim() || !/^[A-Z]{2,3} \d{4}(\/[A-Z]{1,3})?$/.test(normReg.trim())) { errs.vehicle_reg = true; errs.reg_msg = "Vehicle reg must be 2-3 letters + 4 digits (temp plates: /H or /ABC allowed)" }
    if (!newJobInfo.customer_name.trim()) errs.customer_name = true
    if (!newJobInfo.vehicle_make.trim()) errs.vehicle_make = true
    if (!newJobInfo.vehicle_model.trim()) errs.vehicle_model = true
    // Normalize phone
    const ph = normalizePhone(newJobInfo.customer_phone)
    if (!ph.valid) { errs.customer_phone = true; if (ph.error) errs.phone_msg = ph.error }
    if (!newJobInfo.job_type) errs.job_type = true
    if (newJobInfo.job_type === "insurance" && !newJobInfo.insurance_name) errs.insurance = true
    if (!isQuick && !newJobPhoto) errs.photo = true
    setNewJobErrors(errs)
    if (Object.keys(errs).length > 0) { tt(errs.reg_msg || errs.phone_msg || (!newJobInfo.job_type ? "⚠️ Select job type" : errs.photo && Object.keys(errs).length === 1 ? "⚠️ Take a vehicle photo" : "⚠️ Fill all required fields")); return }
    const id = genId("job")
    const jobNum = String(jobs.length + 1).padStart(3, "0")
    const jobDocs = []
    if (newJobPhoto) jobDocs.push({ id: genId("d"), dataUrl: newJobPhoto, estId: null, label: "Vehicle" })
    const finalInfo = { ...newJobInfo, vehicle_reg: normReg, customer_phone: ph.normalized, insurance_name: newJobInfo.job_type === "insurance" ? newJobInfo.insurance_name : "" }
    const newJob = { id, jobNumber: `JOB-${jobNum}`, jobInfo: finalInfo, stage: "job_received", paused: false, onHold: false, partsOrdered: false, partsArrived: {}, partsQuotation: [], pqStatus: "draft", pqApprovalPhoto: null, pqLumpSum: null, pqLumpMode: false, customerConfirmed: false, estimates: [], invoices: [], jobDocs, qcChecks: {}, supplierInvoices: [], followUpNote: "", followUpAttempts: 0, followUpLog: [], jobCosts: [], created_at: new Date().toISOString(), ...(newJobInfo.is_warranty ? { is_warranty: true, parent_job_id: newJobInfo.parent_job_id, parent_job_number: newJobInfo.parent_job_number, parent_job_date: newJobInfo.parent_job_date } : {}) }
    setJobs(prev => [newJob, ...prev])
    openJob(newJob)
    tt(`${newJob.jobNumber} created`)
  }

  // ═══ ON HOLD ═══
  const toggleHold = () => {
    const newHold = !(activeJob?.onHold || false)
    setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, onHold: newHold } : j))
    tt(newHold ? "📌 Moved to On Hold" : "▶ Back to active jobs")
    if (newHold) { setActiveJobId(null); setScreen("home"); setHomeTab("on_hold") }
  }

  // ═══ DELETE JOB ═══
  const [confirmDelJob, setConfirmDelJob] = useState(false)
  const deleteJob = () => {
    if (!confirmDelJob) { setConfirmDelJob(true); setTimeout(() => setConfirmDelJob(false), 3000); return }
    setJobs(prev => prev.filter(j => j.id !== activeJobId))
    setActiveJobId(null); setScreen("home"); setConfirmDelJob(false)
    tt("Job deleted")
  }

  // ═══ ESTIMATE DELETE/ARCHIVE ═══
  const deleteEstimate = (estId) => {
    if (confirmDelEst !== estId) { setConfirmDelEst(estId); setTimeout(() => setConfirmDelEst(c => c === estId ? null : c), 3000); return }
    const est = estimates.find(e => e.id === estId)
    if (est?.status === "approved") {
      // Archive -- mark as archived, keep in records
      setEstimates(prev => prev.map(e => e.id === estId ? { ...e, status: "archived" } : e))
      tt(`${est.number} archived`)
    } else {
      // Draft -- permanent delete
      setEstimates(prev => prev.filter(e => e.id !== estId))
      tt("Estimate deleted")
    }
    setConfirmDelEst(null)
  }

  // ═══ STAGE TRANSITIONS ═══
  const advanceStage = (toStage) => {
    setJobStage(toStage)
    if (toStage === "delivered") {
      // Auto hold for 2 weeks, then follow-up
      const holdUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      saveCurrentJob() // save all local state before navigating away
      setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: toStage, onHold: true, holdUntil } : j))
      tt("📦 Delivered -- on hold for 2 weeks follow-up")
      setActiveJobId(null); setScreen("home"); setHomeTab("on_hold")
      return
    }
    if (toStage === "closed") {
      saveCurrentJob() // save all local state before navigating away
      setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: toStage, onHold: false, holdUntil: null, followUpNote, followUpAttempts, followUpLog: [...followUpLog], jobCosts: [...jobCosts] } : j))
      tt("🏁 Job closed")
      setActiveJobId(null); setScreen("home"); setHomeTab("closed")
      return
    }
    setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: toStage } : j))
    tt(`${ALL_STAGES[toStage].icon} ${ALL_STAGES[toStage].label}`)
  }
  const goBackStage = () => {
    if (prevStage) {
      setJobStage(prevStage)
      setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: prevStage } : j))
      tt(`Back to ${ALL_STAGES[prevStage].label}`)
    }
  }
  const getNextActionLabel = () => {
    if (jobPaused) return null
    if (!nextStage) return null
    const ns = ALL_STAGES[nextStage]
    const labels = {
      approved_dismantle: "Mark Dismantle Complete",
      in_progress: "Repair Complete",
      paint_stage: "Painting Complete",
      qc: "QC Passed",
      ready: "✅ Mark Ready for Delivery",
      delivered: "📦 Mark as Delivered",
      follow_up: "📞 Follow Up Done",
      closed: "🏁 Close Job",
    }
    return labels[nextStage] || `Next → ${ns.label}`
  }
  const canAdvance = () => {
    if (jobPaused) return false
    if (!nextStage) return false
    // Auto stages are triggered by system actions, not manual button
    if (ALL_STAGES[nextStage]?.auto) return false
    // Delivered -> follow_up is handled by auto-timer, not manual
    if (jobStage === "delivered") return false
    // follow_up -> closed is handled by dedicated button in follow-up card
    if (jobStage === "follow_up") return false
    return true
  }

  // ═══ ESTIMATE FUNCTIONS ═══
  const addPart = (name) => { const t = name.trim(); if (!t || estParts.find(p => p.name.toLowerCase() === t.toLowerCase())) return; setEstParts(p => [...p, { id: "p" + Date.now() + Math.random().toString(36).slice(2, 5), name: t }]); setPartInput(""); setSuggestions([]); setTimeout(() => partInputRef.current?.focus(), 30) }
  const removePart = (pid) => { setEstParts(p => p.filter(x => x.id !== pid)); setEstEntries(e => e.filter(x => x.part_id !== pid)) }
  const handlePartInput = (val) => { setPartInput(val); if (val.length >= 2) { const q = val.toLowerCase(); const ex = estParts.map(p => p.name.toLowerCase()); setSuggestions(COMMON_PARTS.filter(p => p.toLowerCase().includes(q) && !ex.includes(p.toLowerCase())).slice(0, 6)) } else setSuggestions([]) }
  const toggleCheck = (part) => { const ck = cat.key; if (hasEntry(part.id, ck)) setEstEntries(e => e.filter(x => !(x.part_id === part.id && x.category === ck))); else { setEstEntries(e => [...e, { id: "e" + Date.now(), part_id: part.id, category: ck, qty: 1, rate: 0, remarks: ck === "replace" ? "S/H" : "" }]); setTimeout(() => rateRefs.current[part.id]?.focus(), 50) } }
  const setRate = (pid, rate) => { setEstEntries(e => e.map(x => x.part_id === pid && x.category === cat.key ? { ...x, rate: Number(rate) || 0 } : x)) }
  const toggleRemarks = (pid) => { setEstEntries(e => e.map(x => x.part_id === pid && x.category === cat.key ? { ...x, remarks: x.remarks === "S/H" ? "M/R" : "S/H" } : x)) }
  const handleRateEnter = (pid) => { const ci = estParts.filter(p => hasEntry(p.id, cat.key)); const idx = ci.findIndex(p => p.id === pid); for (let i = idx + 1; i < ci.length; i++) { rateRefs.current[ci[i].id]?.focus(); return } tt("✓ Done") }

  const saveEstimate = () => {
    const validSundries = sundryItems.filter(s => (Number(s.rate) || 0) > 0 || s.remarks === "M/R")
    const tot = estEntries.reduce((s, e) => s + (Number(e.qty) || 0) * (Number(e.rate) || 0), 0) + validSundries.reduce((s, i) => s + (i.remarks === "M/R" ? 0 : ((Number(i.rate) || 0) * (Number(i.qty) || 1))), 0)
    // Warn if editing estimate that already has linked invoices
    if (selEst && invoices.length > 0) {
      const linkedInv = invoices.find(inv => (inv.source_estimates || []).includes(selEst.number))
      if (linkedInv && !confirm(`⚠️ Invoice ${linkedInv.invoice_number} already uses this estimate. Editing may cause inconsistency between estimate and invoice. Continue?`)) return
    }
    const isNewSupplementary = !selEst && estimates.length > 0
    const newEstId = selEst ? selEst.id : genId("est") // pre-assign so PQ uses same ID

    if (selEst) {
      const autoApprove = isDirectJob
      const wasApproved = selEst.status === "approved"
      // For INSURANCE jobs: editing an approved estimate resets to draft and requires re-approval
      const insuranceResetApproval = !isDirectJob && wasApproved
      setEstimates(p => p.map(e => e.id === selEst.id ? {
        ...e, parts: [...estParts], entries: [...estEntries], sundries: validSundries, total: tot,
        ...(autoApprove ? { status: "approved", approved_entries: estEntries.map(en => ({ ...en })), approved_total: tot } : {}),
        ...(insuranceResetApproval ? { status: "draft", approved_entries: null, approved_total: null, previous_approval: { approved_entries: selEst.approved_entries, approved_total: selEst.approved_total, reset_at: new Date().toISOString() } } : {})
      } : e))
      if (insuranceResetApproval) {
        // Also reset job stage if in approved_dismantle (re-approval needed)
        setJobs(prev => prev.map(j => j.id === activeJobId && j.stage === "approved_dismantle" ? { ...j, stage: "est_ready" } : j))
        tt(`⚠️ ${selEst.number} edited — re-approval required`)
      } else {
        tt(`${selEst.number} updated`)
      }
      setSelEst(null)
    } else {
      const num = estimates.length + 1
      const type = isDirectJob ? (num === 1 ? "quotation" : "supplementary") : (num === 1 ? "insurance_claim" : "supplementary")
      const label = isDirectJob ? (num === 1 ? "Quotation" : `Supplementary ${num - 1}`) : (type === "supplementary" ? `Supplementary ${num - 1}` : "Insurance Claim")
      const autoApprove = isDirectJob
      const est = { id: newEstId, number: num === 1 ? "EST-001" : `EST-001-S${num - 1}`, type, label, status: autoApprove ? "approved" : "draft", parts: [...estParts], entries: [...estEntries], sundries: validSundries, total: tot, ...(autoApprove ? { approved_entries: estEntries.map(en => ({ ...en })), approved_total: tot } : {}), created_at: new Date().toISOString() }
      setEstimates(p => [...p, est])
      tt(`${est.number} saved`)
    }
    setEstParts([]); setEstEntries([]); setSundryItems([]); setSundryInput(""); setActiveCat(0)

    // Auto-create/update Parts Quotation entries for Replace parts
    const replaceEntries = estEntries.filter(e => e.category === "replace")
    if (replaceEntries.length > 0) {
      const estId = newEstId // use pre-assigned estimate ID
      setPartsQuotation(prev => {
        const existing = new Set(prev.map(p => p.partId))
        const newItems = replaceEntries.filter(e => !existing.has(e.part_id + "_" + estId)).map(e => {
          const part = estParts.find(p => p.id === e.part_id)
          return { id: "pq_" + Date.now() + "_" + Math.random().toString(36).slice(2,5), partId: e.part_id + "_" + estId, partName: part?.name || "Unknown", estLabel: selEst?.label || (isDirectJob ? "Quotation" : "Insurance Claim"), supplier: "", quotedPrice: null, approvedPrice: null, remarks: e.remarks || "S/H" }
        })
        return [...prev, ...newItems]
      })
    }

    // Auto-advance stage
    const hasEntries = estEntries.length > 0
    if (jobStage === "job_received" && hasEntries) {
      // Skip est_pending, go straight to est_ready (estimate is saved with entries)
      if (isDirectJob) {
        advanceStage("est_ready")  // direct jobs auto-approve
      } else {
        advanceStage("est_ready")  // insurance: estimate ready for assessor
      }
    } else if (jobStage === "job_received") {
      advanceStage("est_pending")
    } else if (jobStage === "est_pending" && hasEntries) {
      if (isDirectJob) {
        advanceStage("est_ready")
      } else {
        advanceStage("est_ready")
      }
    }

    // If this was a supplementary mid-job, ask about pause
    if (isNewSupplementary && !["job_received", "est_pending", "est_ready"].includes(jobStage)) {
      setShowSubFlowPrompt(true)
    }

    setScreen("job")
  }

  // finalizeApproval advances from est_ready -> approved_dismantle

  // ═══ APPROVAL ═══
  const startApproval = (est) => {
    // Block re-approval if work has already started
    const job = jobs.find(j => j.id === activeJobId)
    if (est.status === "approved" && job) {
      const workStarted = ["in_progress", "paint_stage", "qc", "ready", "delivered", "follow_up", "closed"].includes(job.stage)
      if (workStarted && !confirm(`⚠️ This estimate was already approved and work has started (stage: ${job.stage}).\n\nRe-doing approval may cause invoice mismatches. Continue?`)) return
    }
    setSelEst(est)
    // Preserve previous approval as `previous_approval` for audit trail
    const prevSnapshot = est.status === "approved" ? { approved_entries: est.approved_entries, approved_total: est.approved_total, reset_at: new Date().toISOString() } : null
    if (prevSnapshot) {
      setEstimates(prev => prev.map(e => e.id === est.id ? { ...e, previous_approval: prevSnapshot } : e))
    }
    setApprovalItems(est.entries.map(e => {
      const part = est.parts.find(p => p.id === e.part_id)
      // If re-approving, pre-fill with previous approved rate
      const prevApproved = est.approved_entries?.find(ae => ae.id === e.id)
      return { ...e, part_name: part?.name || "Unknown", original_rate: e.rate, approved_rate: prevApproved?.approved_rate ?? null, approval_status: prevApproved?.approval_status || "pending", remarks: prevApproved?.remarks || e.remarks }
    }))
    setApprovalCat(0); setScreen("approve")
  }
  const setApproved = (eid, rate) => { setApprovalItems(prev => prev.map(i => { if (i.id !== eid) return i; const r = rate === "" ? null : Number(rate); let s = "pending"; if (r !== null && isFinite(r)) { s = r === i.original_rate ? "approved" : r < i.original_rate ? "cut" : "upgraded" } return { ...i, approved_rate: r, approval_status: s } })) }
  const approveAsIs = (eid) => { const i = approvalItems.find(x => x.id === eid); if (i) setApproved(eid, i.original_rate) }
  const markUseSame = (eid) => {
    const item = approvalItems.find(i => i.id === eid)
    if (item && item.category !== "replace") { tt("⚠️ U/S only applies to replace parts"); return }
    setApprovalItems(prev => prev.map(i => i.id === eid ? { ...i, approved_rate: 0, approval_status: "use_same", remarks: "U/S" } : i))
  }
  const approveAllCatAsIs = () => { setApprovalItems(prev => prev.map(i => i.category !== aCat.key || i.approved_rate !== null ? i : { ...i, approved_rate: i.original_rate, approval_status: "approved" })); tt(`All ${aCat.label} approved`) }
  const handleApprovalEnter = (eid) => { const ci = approvalItems.filter(i => i.category === aCat.key); const idx = ci.findIndex(i => i.id === eid); for (let n = idx + 1; n < ci.length; n++) { if (ci[n].approved_rate === null) { approvalRefs.current[ci[n].id]?.focus(); return } } tt("✓ Done") }
  const finalizeApproval = () => {
    // Check if parts quotation has unfilled prices (insurance only)
    const hasReplaceItems = approvalItems.some(i => i.category === "replace" && i.approval_status !== "use_same")
    const unfilledPQ = partsQuotation.filter(p => p.quotedPrice === null || p.quotedPrice === 0)
    if (isInsurance && hasReplaceItems && unfilledPQ.length > 0) {
      tt(`⚠️ ${unfilledPQ.length} part${unfilledPQ.length > 1 ? "s" : ""} missing supplier prices -- fill Parts Quotation`)
    }
    setEstimates(prev => prev.map(e => e.id !== selEst.id ? e : { ...e, status: "approved", approved_entries: approvalItems.map(i => ({ ...i, rate: i.approval_status === "use_same" ? 0 : (i.approved_rate ?? i.original_rate), remarks: i.approval_status === "use_same" ? "U/S" : (i.remarks || "") })), approved_total: approvalItems.filter(i => i.approval_status !== "use_same").reduce((s, i) => s + (i.approved_rate ?? i.original_rate) * i.qty, 0) }))
    tt(`${selEst.number} approved`)
    // Auto-advance: est_ready -> approved_dismantle (insurance)
    if (jobStage === "est_ready" && isInsurance) advanceStage("approved_dismantle")
    // If all estimates approved and direct job at est_ready -> in_progress
    if (jobStage === "est_ready" && isDirectJob) {
      const newPipeline = buildPipeline(false, estimates, workType, jobInfo.job_type)
      const nextInPipeline = newPipeline[newPipeline.indexOf("est_ready") + 1]
      if (nextInPipeline) advanceStage(nextInPipeline)
    }
    setScreen("job")
  }
  const aOrigT = approvalItems.reduce((s, i) => s + i.original_rate * i.qty, 0)
  const aApprT = approvalItems.reduce((s, i) => s + (i.approved_rate ?? i.original_rate) * i.qty, 0)
  const aEntCnt = approvalItems.filter(i => i.approved_rate !== null || i.approval_status === "use_same").length

  // ═══ INVOICE ═══
  const generateInvoice = () => {
    const ae = estimates.filter(e => e.status === "approved"); if (!ae.length) return
    const items = []; ae.forEach(est => {
      (est.approved_entries || est.entries).forEach((e, idx) => { const part = est.parts.find(p => p.id === e.part_id); items.push({ id: "ii_" + Date.now() + "_" + idx + "_" + Math.random().toString(36).slice(2, 4), description: part?.name || e.part_name || "Item", category: e.category, qty: e.qty, unit_price: e.rate || e.approved_rate || 0, remarks: e.remarks || "", is_modified: false, source_est: est.number }) })
      ;(est.sundries || []).forEach((s, idx) => { if (s.remarks !== "M/R" && s.rate > 0) items.push({ id: "ii_sun_" + Date.now() + "_" + idx + "_" + Math.random().toString(36).slice(2, 4), description: s.name, category: "sundry", qty: s.qty || 1, unit_price: s.rate, remarks: s.remarks || "", is_modified: false, source_est: est.number }) })
    })
    const inv = { id: "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), invoice_number: nextInvoiceNumber(), source_estimates: ae.map(e => e.number), status: "draft", items, payments: [], created_at: new Date().toISOString() }
    setInvoices(p => [...p, inv]); setSelInv(inv); setScreen("inv_detail"); tt("Invoice created")
  }
  // Year-aware invoice number — counts only THIS year's invoices
  const nextInvoiceNumber = () => {
    const yr = new Date().getFullYear()
    const prefix = `INV-${yr}-`
    const thisYearCount = jobs.reduce((c, j) => c + (j.invoices || []).filter(i => (i.invoice_number || "").startsWith(prefix)).length, 0) + invoices.filter(i => (i.invoice_number || "").startsWith(prefix)).length
    return `${prefix}${String(thisYearCount + 1).padStart(4, "0")}`
  }
  // Minor job invoice: from jobCosts
  const generateMinorInvoice = () => {
    const materialCosts = jobCosts.filter(c => c.type !== "labour")
    const unconfirmed = materialCosts.filter(c => !c.confirmed)
    if (unconfirmed.length > 0) { tt("⚠️ Confirm all material costs first"); return }
    const unnamed = jobCosts.filter(c => !c.name.trim())
    if (unnamed.length > 0) { tt("⚠️ Name all items first"); return }
    const items = jobCosts.map((c, idx) => ({
      id: "ii_minor_" + Date.now() + "_" + idx,
      description: c.name,
      category: c.type === "part" && c.source === "ex_stock" ? "sundry" : c.type === "outsource" ? "other" : c.type,
      qty: 1,
      unit_price: c.type === "labour" ? 0 : (c.cost || 0),
      remarks: c.source === "ex_stock" ? "Ex-Stock" : c.source === "purchased" ? "Purchased" : "",
      is_modified: false,
      source_est: "Quick Job"
    }))
    const inv = { id: "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), invoice_number: nextInvoiceNumber(), source_estimates: ["Quick Job"], status: "draft", items, payments: [], created_at: new Date().toISOString() }
    setInvoices(p => [...p, inv]); setSelInv(inv); setScreen("inv_detail"); tt("Invoice created -- set labour charges")
  }
  const invTotal = inv => (inv?.items || []).reduce((s, i) => s + i.qty * i.unit_price, 0)
  const invNet = inv => invTotal(inv) - (inv?.discount || 0)
  const invInsPayments = inv => (inv?.payments || []).filter(p => p.type === "insurance")
  const invCustPayments = inv => (inv?.payments || []).filter(p => p.type === "customer")
  // invInsTotal: ALL insurance payments (for display of "expected / recorded amount")
  const invInsTotal = inv => invInsPayments(inv).reduce((s, p) => s + p.amount, 0)
  // invInsReceivedTotal: only RECEIVED payments (for actual paid calculations)
  const invInsReceivedTotal = inv => invInsPayments(inv).filter(p => p.ins_status === "received").reduce((s, p) => s + p.amount, 0)
  const invCustPaidTotal = inv => invCustPayments(inv).reduce((s, p) => s + p.amount, 0)
  const invCustDiscount = inv => inv?.customer_discount || 0
  // Customer portion = what insurance is EXPECTED to cover deducted from net
  const invCustPortion = inv => invNet(inv) - invInsTotal(inv)
  const invCustOwes = inv => Math.max(0, invCustPortion(inv) - invCustDiscount(inv))
  const invCustBalance = inv => Math.max(0, invCustOwes(inv) - invCustPaidTotal(inv))
  // Outstanding from insurance (recorded but not yet received)
  const invInsOutstanding = inv => invInsTotal(inv) - invInsReceivedTotal(inv)
  const invTotalDiscount = inv => (inv?.discount || 0) + (inv?.customer_discount || 0)
  const invFullyPaid = inv => {
    if (invCustBalance(inv) > 0) return false
    const ip = invInsPayments(inv)
    if (ip.length === 0) return invCustPaidTotal(inv) >= invNet(inv) || invNet(inv) <= 0
    // All insurance payments must be actually received (not just recorded)
    return ip.every(p => p.ins_status === "received")
  }
  const updateInvItem = (iid, patch) => { const upd = inv => ({ ...inv, items: inv.items.map(i => i.id === iid ? { ...i, ...patch, is_modified: true } : i) }); setInvoices(p => p.map(inv => inv.id === selInv.id ? upd(inv) : inv)); setSelInv(prev => upd(prev)) }
  const removeInvItem = (iid) => {
    // Block removal if payments exist (recalc of balance gets messy)
    if ((selInv.payments || []).length > 0) { tt("⚠️ Delete all payments first"); return }
    if ((selInv.items || []).length <= 1) { tt("⚠️ Invoice must have at least one item"); return }
    setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, items: inv.items.filter(i => i.id !== iid) } : inv))
    setSelInv(prev => ({ ...prev, items: prev.items.filter(i => i.id !== iid) }))
  }
  const setInvStatus = (s) => { const patch = { status: s }; if (s === "finalized") patch.finalized_at = new Date().toISOString(); setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, ...patch } : inv)); setSelInv(prev => ({ ...prev, ...patch })); tt(`→ ${s}`) }
  const calcStatus = (inv) => {
    const ip = invInsPayments(inv); const cb = invCustBalance(inv)
    if (cb <= 0 && ip.length === 0 && invCustPaidTotal(inv) >= invNet(inv)) return "paid"
    if (cb <= 0 && ip.length > 0 && ip.every(p => p.ins_status === "received")) return "paid"
    if (cb <= 0 || invCustPaidTotal(inv) > 0 || ip.length > 0) return "partially_paid"
    return inv.finalized_at ? "finalized" : "draft"
  }
  const addPayment = () => {
    const amt = Number(payAmount)
    if (!isFinite(amt) || amt <= 0) { tt("⚠️ Enter a valid payment amount"); return }
    if (payType === "insurance" && !insPayPhoto) { tt("⚠️ Attach release letter/cheque photo"); return }
    const pay = { id: genId("pay"), amount: amt, type: payType, date: new Date().toISOString(), ...(payType === "insurance" ? { ins_status: "recorded", photo: insPayPhoto, reference: payRef } : { method: payMethod, reference: payRef }) }
    const np = [...(selInv.payments || []), pay]
    const updated = { ...selInv, payments: np }
    const ns = calcStatus(updated)
    setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, payments: np, status: ns } : inv))
    setSelInv(prev => ({ ...prev, payments: np, status: ns }))
    // Auto-add bank balance for bank/online customer payments
    if (payType !== "insurance" && (payMethod === "bank_transfer" || payMethod === "bank" || payMethod === "online")) {
      setCashBook(prev => ({ ...prev, bankBalance: (Number(prev.bankBalance) || 0) + amt }))
    }
    setShowPayForm(false); setPayAmount(""); setPayRef(""); setInsPayPhoto(null)
    tt(payType === "insurance" ? `🛡️ Insurance Rs.${fmt(amt)} recorded` : `💰 Rs.${fmt(amt)} received — nice!`)
  }
  const deletePayment = (pid) => {
    if (confirmDel !== pid) { setConfirmDel(pid); setTimeout(() => setConfirmDel(c => c === pid ? null : c), 3000); return }
    const removed = (selInv.payments || []).find(p => p.id === pid)
    const np = (selInv.payments || []).filter(p => p.id !== pid)
    const updated = { ...selInv, payments: np }
    const ns = np.length === 0 ? (selInv.finalized_at ? "finalized" : "draft") : calcStatus(updated)
    setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, payments: np, status: ns } : inv))
    setSelInv(prev => ({ ...prev, payments: np, status: ns }))
    // Reverse bank balance for deleted bank/online payments
    if (removed && removed.type !== "insurance" && (removed.method === "bank_transfer" || removed.method === "bank" || removed.method === "online")) {
      setCashBook(prev => ({ ...prev, bankBalance: (Number(prev.bankBalance) || 0) - (Number(removed.amount) || 0) }))
    }
    setConfirmDel(null); tt("Payment deleted")
  }
  const updateInsStatus = (pid, newStatus) => {
    const np = (selInv.payments || []).map(p => p.id === pid ? { ...p, ins_status: newStatus } : p)
    const updated = { ...selInv, payments: np }
    const ns = calcStatus(updated)
    setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, payments: np, status: ns } : inv))
    setSelInv(prev => ({ ...prev, payments: np, status: ns }))
    tt(`→ ${newStatus}`)
  }
  const applyCustomerDiscount = (d) => {
    const amt = Math.max(0, Number(d) || 0)
    // Validate discount doesn't exceed customer portion
    const portion = invCustPortion(selInv)
    if (amt > portion) { tt(`⚠️ Discount Rs.${fmt(amt)} exceeds customer portion Rs.${fmt(portion)}`); return }
    setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, customer_discount: amt } : inv))
    setSelInv(prev => ({ ...prev, customer_discount: amt }))
    setShowCustDiscInput(false); tt(amt > 0 ? `Customer discount Rs.${fmt(amt)}` : "Customer discount removed")
  }

  // ═══ RENDER support ═══
  const isDetailScreen = screen !== "home";
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const sidebarCollapsed = isTablet && isDetailScreen && !sidebarExpanded;

  const value = {
    // State
    screen, setScreen,
    toast, setToast, tt,
    jobs, setJobs,
    activeJobId, setActiveJobId,
    searchQuery, setSearchQuery,
    filterStage, setFilterStage,
    jobInfo, setJobInfo,
    jobStage, setJobStage,
    jobPaused, setJobPaused,
    partsOrdered, setPartsOrdered,
    partsArrived, setPartsArrived,
    showPaintWarn, setShowPaintWarn,
    makeSuggestions, setMakeSuggestions,
    showInsDropdown, setShowInsDropdown,
    estimates, setEstimates,
    selEst, setSelEst,
    estParts, setEstParts,
    estEntries, setEstEntries,
    sundryItems, setSundryItems,
    sundryInput, setSundryInput,
    partInput, setPartInput,
    suggestions, setSuggestions,
    activeCat, setActiveCat,
    partInputRef, rateRefs,
    approvalItems, setApprovalItems,
    approvalCat, setApprovalCat,
    approvalRefs,
    jobDocs, setJobDocs,
    qcChecks, setQcChecks,
    supplierInvoices, setSupplierInvoices,
    jobCosts, setJobCosts,
    showSupplierInvForm, setShowSupplierInvForm,
    suppInvPhotoRef,
    followUpNote, setFollowUpNote,
    followUpAttempts, setFollowUpAttempts,
    followUpLog, setFollowUpLog,
    showImage, setShowImage,
    showUploadMenu, setShowUploadMenu,
    photoTag, setPhotoTag,
    uploadRef,
    invoices, setInvoices,
    selInv, setSelInv,
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
    confirmDelEst, setConfirmDelEst,
    showSubFlowPrompt, setShowSubFlowPrompt,
    showArchived, setShowArchived,
    homeTab, setHomeTab,
    purchaseOrders, setPurchaseOrders,
    grns, setGrns,
    cashBook, setCashBook,
    partsQuotation, setPartsQuotation,
    pqStatus, setPqStatus,
    pqApprovalPhoto, setPqApprovalPhoto,
    pqLumpSum, setPqLumpSum,
    pqLumpMode, setPqLumpMode,
    customerConfirmed, setCustomerConfirmed,
    showPQScreen, setShowPQScreen,
    pqTab, setPqTab,
    pqPhotoRef,
    isTablet, setIsTablet,
    hoverJobId, setHoverJobId,
    hoverY, setHoverY,
    collapsedSections, setCollapsedSections, toggleSection,
    sortBy, setSortBy,
    isUploading, setIsUploading,
    closedLoaded, setClosedLoaded, closedCount, loadClosedJobs,
    loadError, loadJobs,
    newJobInfo, setNewJobInfo,
    newJobMakeSugg, setNewJobMakeSugg,
    newJobInsDD, setNewJobInsDD,
    insSearch, setInsSearch,
    newJobErrors, setNewJobErrors,
    customerMatch, setCustomerMatch,
    newJobPhoto, setNewJobPhoto,
    newJobPhotoRef,
    confirmDelJob, setConfirmDelJob,
    sidebarExpanded, setSidebarExpanded,
    // Derived values
    isInsurance, isDirectJob, workType, jobCats,
    cat, aCat,
    pipeline, isMinorJob,
    stageIdx, stageInfo, nextStage, prevStage,
    hasEntry, getEntry, catTotal,
    sundryTotal, grandTotal,
    activeJob,
    replaceParts, hasReplaceParts, arrivedCount, allPartsArrived, pendingParts,
    pqFilled, pqTotal, pqAllFilled, pqTotalPrice, pqApprovedTotal, pqAllApproved, pqHasApproval,
    aOrigT, aApprT, aEntCnt,
    customerRegistry,
    isDetailScreen, sidebarCollapsed,
    APP_VERSION,
    // Functions
    toggleQc,
    confirmCustomer,
    generatePOText, generatePQText, sharePQ,
    generateEstimatePDF, generateInvoicePDF, generatePQPDF, openPDF,
    saveCurrentJob, openJob, goHome,
    startNewJob, startWarrantyJob, validateAndCreateJob,
    toggleHold, deleteJob, deleteEstimate,
    advanceStage, goBackStage, getNextActionLabel, canAdvance,
    addPart, removePart, handlePartInput, toggleCheck, setRate, toggleRemarks, handleRateEnter,
    saveEstimate,
    startApproval, setApproved, approveAsIs, markUseSame, approveAllCatAsIs, handleApprovalEnter, finalizeApproval,
    generateInvoice, generateMinorInvoice,
    invTotal, invNet, invInsPayments, invCustPayments, invInsTotal, invInsReceivedTotal, invInsOutstanding, invCustPaidTotal,
    invCustDiscount, invCustPortion, invCustOwes, invCustBalance, invTotalDiscount, invFullyPaid,
    updateInvItem, removeInvItem, setInvStatus, calcStatus,
    addPayment, deletePayment, updateInsStatus, applyCustomerDiscount,
    uploadPhoto, deletePhoto,
  }

  return (
    <WorkshopContext.Provider value={value}>
      {loadError && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: C.red, color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: FONT, fontSize: 14, fontWeight: 500 }}>
          <span>{loadError}</span>
          <button onClick={loadJobs} style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "6px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Retry</button>
        </div>
      )}
      {children}
    </WorkshopContext.Provider>
  )
}
