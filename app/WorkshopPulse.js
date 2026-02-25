"use client"
import { useState, useRef, useEffect, useMemo } from "react";

const C = {
  bg: "#F2F2F7", card: "#FFFFFF", text: "#000000", sub: "#6C6C70", muted: "#AEAEB2",
  accent: "#007AFF", green: "#34C759", orange: "#FF9500", red: "#FF3B30", purple: "#AF52DE",
  border: "#E5E5EA", sheetBg: "rgba(0,0,0,0.4)",
}
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"
const MONO = "'SF Mono', ui-monospace, 'Menlo', monospace"
const fmt = n => Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })

const card = { background: C.card, borderRadius: 16, padding: "18px", marginBottom: 12, boxShadow: "0 0.5px 1px rgba(0,0,0,0.05)" }
const pill = (color) => ({ fontSize: 13, fontWeight: 600, color, background: color + "15", padding: "5px 12px", borderRadius: 20 })
const btn = (bg, color) => ({ border: "none", borderRadius: 14, padding: "16px 24px", fontSize: 18, fontWeight: 600, cursor: "pointer", color: color || "#fff", background: bg || C.accent, fontFamily: FONT, width: "100%", textAlign: "center", letterSpacing: "-0.3px" })
const btnSm = (bg, color) => ({ ...btn(bg, color), padding: "12px 18px", fontSize: 16, borderRadius: 12 })
const inp = { width: "100%", boxSizing: "border-box", padding: "16px 18px", background: C.bg, border: "none", borderRadius: 14, color: C.text, fontSize: 17, fontFamily: FONT, outline: "none", letterSpacing: "-0.2px" }

const CATS_PAINT = [
  { key: "remove_refix", label: "Remove-Refix", short: "R/R", icon: "🔩", color: C.accent },
  { key: "reshaping", label: "Reshaping", short: "Reshape", icon: "🔨", color: C.orange },
  { key: "booth_painting", label: "Booth Painting", short: "Paint", icon: "🎨", color: C.purple },
  { key: "replace", label: "Replace", short: "Replace", icon: "📦", color: C.green },
]
const CATS_MECH = [
  { key: "replace", label: "Replace", short: "Replace", icon: "📦", color: C.green },
  { key: "labour", label: "Labour", short: "Labour", icon: "👷", color: C.accent },
]
const CATS_ALL = [
  { key: "remove_refix", label: "Remove-Refix", short: "R/R", icon: "🔩", color: C.accent },
  { key: "reshaping", label: "Reshaping", short: "Reshape", icon: "🔨", color: C.orange },
  { key: "booth_painting", label: "Booth Painting", short: "Paint", icon: "🎨", color: C.purple },
  { key: "replace", label: "Replace", short: "Replace", icon: "📦", color: C.green },
  { key: "labour", label: "Labour", short: "Labour", icon: "👷", color: C.accent },
]
const getCats = (wt) => wt === "mechanical" ? CATS_MECH : wt === "both" ? CATS_ALL : CATS_PAINT
// Backward compat -- default to paint cats
const CATS = CATS_ALL
// Dynamic QC checks per category
const COMMON_PARTS = ["Front Bumper","Rear Bumper","Bumper Lip","Front Bumper with all accessories","Rear Bumper with all accessories","RHS Fender","LHS Fender","RHS Fender inner liner","LHS Fender inner liner","RHS Front Door","LHS Front Door","RHS Rear Door","LHS Rear Door","RHS Quarter Panel","LHS Quarter Panel","RHS A Post","LHS A Post","RHS Side Mirror","LHS Side Mirror","Bonnet","Boot Lid","Back Panel","Roof Panel","RHS Head Light","LHS Head Light","RHS Tail Light","LHS Tail Light","Windscreen","Rear Windscreen","RHS Front Wheel Arch","LHS Front Wheel Arch","RHS Rear Wheel Arch","LHS Rear Wheel Arch","Dashboard Complete","Front Retainer","Wiper Panel with Ends","RHS Fender Apron","LHS Fender Apron","Rear Number Plate Bracket","RHS Reflector Cover","LHS Reflector Cover"]
const WORKSHOP = { name: "MacForce Auto Engineering", address: "No.555, Pannipitiya Road, Thalawathugoda", phone: "+94 772 291 219", email: "macforceautoengineering@gmail.com" }
const VEHICLE_MAKES = ["Toyota","Nissan","Honda","Suzuki","Mitsubishi","Mazda","Subaru","Daihatsu","Isuzu","Lexus","Mercedes-Benz","BMW","Audi","Volkswagen","Porsche","Hyundai","Kia","MG","Perodua","Micro"]
const INSURANCE_COMPANIES = ["SLIC","Ceylinco General","Continental Insurance","LOLC General Insurance","Fairfirst Insurance","Allianz Insurance Lanka","AIA Insurance Lanka","Janashakthi Insurance","HNB General Insurance","Peoples Insurance","Amana Takaful","Cooperative Insurance"]

const INV_STATUS = { draft:{l:"Draft",c:C.sub}, finalized:{l:"Finalized",c:C.accent}, sent:{l:"Sent",c:C.orange}, partially_paid:{l:"Partial",c:C.orange}, paid:{l:"Paid",c:C.green}, cancelled:{l:"Cancelled",c:C.red} }

// ═══ ALL POSSIBLE STAGES ═══
const ALL_STAGES = {
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
}

// ═══ Components OUTSIDE App (prevents remount) ═══
const NavBar = ({title,subtitle,onBack,right}) => (
  <div style={{marginBottom:20,paddingTop:8}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div style={{flex:1}}>
        {onBack&&<div onClick={onBack} style={{fontSize:17,color:C.accent,cursor:"pointer",fontWeight:400,marginBottom:4,display:"inline-flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:22}}>‹</span> Back
        </div>}
        <div style={{fontSize:34,fontWeight:700,color:C.text,letterSpacing:"-0.7px",lineHeight:1.1}}>{title}</div>
        {subtitle&&<div style={{fontSize:17,color:C.sub,marginTop:4,letterSpacing:"-0.2px"}}>{subtitle}</div>}
      </div>
      {right&&<div style={{flexShrink:0,paddingTop:onBack?28:4}}>{right}</div>}
    </div>
  </div>
)

const Sheet = ({children, onClose}) => (
  <div style={{position:"fixed",inset:0,background:C.sheetBg,zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:600,padding:"8px 24px 36px"}}>
      <div style={{width:40,height:5,background:C.muted,borderRadius:3,margin:"8px auto 20px"}} />
      {children}
    </div>
  </div>
)

// ═══ Pipeline calculator ═══
function buildPipeline(isInsurance, estimates, workType, jobType) {
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
const normalizeReg = (raw) => {
  if (!raw) return "";
  const s = raw.toUpperCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
  const m = s.match(/^([A-Z]{2}\s)?([A-Z]{2,3})\s*(\d{4})$/);
  if (m) return (m[1] || "") + m[2] + " " + m[3];
  return s;
};
const regSearchKey = (raw) => normalizeReg(raw).replace(/\s/g, "").toLowerCase();
const normalizePhone = (raw) => {
  if (!raw) return { valid: false, normalized: "", error: "Phone required" };
  const d = raw.replace(/[\s\-()]/g, "");
  if (!/^\d+$/.test(d)) return { valid: false, normalized: d, error: "Numbers only" };
  if (d.length === 10 && d[0] === "0") return { valid: true, normalized: d.slice(1), error: "" };
  if (d.length === 9 && d[0] !== "0") return { valid: true, normalized: d, error: "" };
  if (d.length === 9 && d[0] === "0") return { valid: false, normalized: d, error: "9 digits starting with 0 invalid. Use 10 digits with leading 0" };
  if (d.length > 10) return { valid: false, normalized: d, error: "Too many digits" };
  return { valid: false, normalized: d, error: "Need 10 digits (with 0) or 9 (without). Got " + d.length };
};
const phoneSearchKey = (raw) => {
  const d = (raw || "").replace(/[\s\-()]/g, "");
  return (d.length === 10 && d[0] === "0") ? d.slice(1) : d;
};

export default function App() {
  const [screen, setScreen] = useState("home")
  const [toast, setToast] = useState(null)
  const tt = m => { setToast(m); setTimeout(() => setToast(null), 2000) }

  // ═══ JOBS LIST ═══
  const [jobs, setJobs] = useState([
    {id:"d1",jobNumber:"JOB-001",jobInfo:{customer_name:"Kasun Perera",customer_phone:"772345678",vehicle_reg:"CAB 3321",vehicle_make:"Toyota",vehicle_model:"Axio",insurance_name:"Ceylinco General",work_type:"paint",job_type:"insurance"},
      stage:"qc",paused:false,onHold:false,partsOrdered:true,
      partsArrived:{"p1_e1":true,"p2_e1":true},
      partsQuotation:[
        {id:"pq1",partId:"p1_e1",partName:"Front Bumper",estLabel:"EST-001",supplier:"Toyota Lanka",quotedPrice:45000,approvedPrice:42000,remarks:"S/H"},
        {id:"pq2",partId:"p2_e1",partName:"RHS Head Light",estLabel:"EST-001",supplier:"Nippon Auto",quotedPrice:28000,approvedPrice:null,remarks:"S/H"}
      ],pqStatus:"submitted",pqApprovalPhoto:null,pqLumpSum:null,pqLumpMode:false,customerConfirmed:false,
      estimates:[{id:"e1",number:"EST-001",label:"Insurance Claim",type:"initial",status:"approved",
        parts:[{id:"p1",name:"Front Bumper"},{id:"p2",name:"RHS Head Light"},{id:"p3",name:"Bonnet"}],
        entries:[
          {part_id:"p1",category:"replace",remarks:"S/H",qty:1,rate:45000},
          {part_id:"p2",category:"replace",remarks:"S/H",qty:1,rate:28000},
          {part_id:"p3",category:"reshaping",remarks:"M/R",qty:1,rate:15000}
        ],
        sundries:[{name:"Clips & Fasteners",rate:2500,qty:1,remarks:""}],
        total:90500,approved_total:85000,
        approved_entries:[
          {part_id:"p1",category:"replace",remarks:"S/H",qty:1,rate:42000},
          {part_id:"p2",category:"replace",remarks:"S/H",qty:1,rate:26000},
          {part_id:"p3",category:"reshaping",remarks:"M/R",qty:1,rate:14500}
        ],
        created_at:"2026-02-20T08:30:00Z"}],
      invoices:[],jobDocs:[],created_at:"2026-02-20T08:30:00Z"},
    {id:"d2",jobNumber:"JOB-002",jobInfo:{customer_name:"Nimali Fernando",customer_phone:"719876543",vehicle_reg:"KV 5587",vehicle_make:"Honda",vehicle_model:"Vezel",insurance_name:"",work_type:"paint",job_type:"direct"},
      stage:"job_received",paused:false,onHold:false,partsOrdered:false,partsArrived:{},
      partsQuotation:[],pqStatus:"draft",pqApprovalPhoto:null,pqLumpSum:null,pqLumpMode:false,customerConfirmed:false,
      estimates:[],invoices:[],jobDocs:[],created_at:"2026-02-21T10:15:00Z"},
    {id:"d3",jobNumber:"JOB-003",jobInfo:{customer_name:"Nuwan Bandara",customer_phone:"712234567",vehicle_reg:"WP KG 3456",vehicle_make:"Toyota",vehicle_model:"Vitz",insurance_name:"",work_type:"mechanical",job_type:"quick"},
      stage:"job_received",paused:false,onHold:false,partsOrdered:false,partsArrived:{},
      partsQuotation:[],pqStatus:"draft",pqApprovalPhoto:null,pqLumpSum:null,pqLumpMode:false,customerConfirmed:false,
      estimates:[],invoices:[],jobDocs:[],
      jobCosts:[
        {id:"jc1",name:"Oil Filter",type:"part",source:"ex_stock",cost:800,confirmed:true},
        {id:"jc2",name:"Engine Oil 4L",type:"sundry",source:"purchased",cost:3500,confirmed:true},
        {id:"jc3",name:"Oil Change Labour",type:"labour",source:null,cost:0,confirmed:false}
      ],created_at:"2026-02-24T14:00:00Z"}
  ])
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
  const [homeTab, setHomeTab] = useState("active") // active | on_hold | closed
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
  const APP_VERSION = "2.1.0"
  const pdfStyles = `@page{size:A4;margin:15mm}*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,Arial,sans-serif}body{padding:20px;color:#1a1a1a;font-size:13px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #007AFF}.shop-name{font-size:22px;font-weight:700;color:#007AFF}.shop-detail{font-size:12px;color:#666;margin-top:3px}.doc-title{font-size:28px;font-weight:700;text-align:right;color:#1a1a1a}.doc-sub{font-size:13px;color:#666;text-align:right;margin-top:2px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;background:#f8f8f8;padding:14px;border-radius:8px}.info-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px}.info-value{font-size:15px;font-weight:600;margin-top:2px}table{width:100%;border-collapse:collapse;margin-bottom:18px}th{background:#f0f0f0;padding:10px 12px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#555;border-bottom:2px solid #ddd}td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}.text-right{text-align:right}.text-center{text-align:center}.mono{font-family:'SF Mono','Courier New',monospace}.bold{font-weight:700}.cut{text-decoration:line-through;color:#999}.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}.tag-sh{background:#fff3e0;color:#e65100}.tag-mr{background:#e8f5e9;color:#2e7d32}.tag-us{background:#e3f2fd;color:#1565c0}.total-row td{font-weight:700;font-size:15px;border-top:2px solid #333;background:#fafafa}.summary-box{background:#f8f8f8;padding:16px;border-radius:8px;margin-bottom:18px}.footer{margin-top:30px;padding-top:15px;border-top:1px solid #ddd;font-size:11px;color:#888;display:flex;justify-content:space-between}.stamp{margin-top:40px;display:flex;justify-content:space-between}.stamp-box{text-align:center;width:200px}.stamp-line{border-top:1px solid #333;margin-top:50px;padding-top:5px;font-size:12px}@media print{body{padding:0}.no-print{display:none}}.print-btn{position:fixed;top:15px;right:15px;background:#007AFF;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;z-index:100}`;
  const openPDF = (title, bodyHtml) => {
    const w = window.open("", "_blank")
    if (!w) { tt("Allow pop-ups to generate PDF"); return }
    w.document.write("<!DOCTYPE html><html><head><title>" + title + "</title><style>" + pdfStyles + "</style></head><body><button class=\"print-btn no-print\" onclick=\"window.print()\">Print / Save PDF</button>" + bodyHtml + "</body></html>")
    w.document.close()
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
    const reg = {} // key: normalized vehicle_reg -> {name, phone, make, model, insurance_name, work_type}
    const byPhone = {} // key: normalized phone -> same
    jobs.forEach(j => {
      const ji = j.jobInfo
      const nReg = normalizeReg(ji.vehicle_reg)
      const nPhone = phoneSearchKey(ji.customer_phone)
      const entry = { customer_name: ji.customer_name, customer_phone: ji.customer_phone, vehicle_reg: nReg, vehicle_make: ji.vehicle_make, vehicle_model: ji.vehicle_model }
      if (nReg) reg[regSearchKey(ji.vehicle_reg)] = entry
      if (nPhone && nPhone.length >= 9) byPhone[nPhone] = entry
    })
    return { byReg: reg, byPhone }
  }, [jobs])
  const startNewJob = () => {
    setNewJobInfo({ customer_name:"", customer_phone:"", vehicle_reg:"", vehicle_make:"", vehicle_model:"", insurance_name:null, work_type:"paint", job_type:null })
    setNewJobErrors({}); setNewJobInsDD(false); setNewJobMakeSugg([]); setInsSearch(""); setNewJobPhoto(null); setCustomerMatch(null)
    setScreen("new_job")
  }
  const [newJobPhoto, setNewJobPhoto] = useState(null)
  const newJobPhotoRef = useRef(null)
  const validateAndCreateJob = () => {
    const errs = {}
    const isQuick = newJobInfo.job_type === "quick"
    // Normalize vehicle reg
    const normReg = normalizeReg(newJobInfo.vehicle_reg)
    if (!normReg.trim()) errs.vehicle_reg = true
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
    if (Object.keys(errs).length > 0) { tt(errs.phone_msg || (!newJobInfo.job_type ? "⚠️ Select job type" : errs.photo && Object.keys(errs).length === 1 ? "⚠️ Take a vehicle photo" : "⚠️ Fill all required fields")); return }
    const id = "job_" + Date.now()
    const jobNum = String(jobs.length + 1).padStart(3, "0")
    const jobDocs = []
    if (newJobPhoto) jobDocs.push({ id: "d" + Date.now(), dataUrl: newJobPhoto, estId: null, label: "Vehicle" })
    const finalInfo = { ...newJobInfo, vehicle_reg: normReg, customer_phone: ph.normalized, insurance_name: newJobInfo.job_type === "insurance" ? newJobInfo.insurance_name : "" }
    const newJob = { id, jobNumber: `JOB-${jobNum}`, jobInfo: finalInfo, stage: "job_received", paused: false, onHold: false, partsOrdered: false, partsArrived: {}, partsQuotation: [], pqStatus: "draft", pqApprovalPhoto: null, pqLumpSum: null, pqLumpMode: false, customerConfirmed: false, estimates: [], invoices: [], jobDocs, qcChecks: {}, supplierInvoices: [], followUpNote: "", followUpAttempts: 0, followUpLog: [], jobCosts: [], created_at: new Date().toISOString() }
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
      setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: toStage, onHold: true, holdUntil } : j))
      tt("📦 Delivered -- on hold for 2 weeks follow-up")
      setActiveJobId(null); setScreen("home"); setHomeTab("on_hold")
      return
    }
    if (toStage === "closed") {
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
      tt(`2190 Back to ${ALL_STAGES[prevStage].label}`)
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
    const validSundries = sundryItems.filter(s => s.rate > 0 || s.remarks === "M/R")
    const tot = estEntries.reduce((s, e) => s + e.qty * e.rate, 0) + validSundries.reduce((s, i) => s + (i.remarks === "M/R" ? 0 : (i.rate * (i.qty || 1))), 0)
    const isNewSupplementary = !selEst && estimates.length > 0

    if (selEst) {
      const autoApprove = isDirectJob
      setEstimates(p => p.map(e => e.id === selEst.id ? { ...e, parts: [...estParts], entries: [...estEntries], sundries: validSundries, total: tot, ...(autoApprove ? { status: "approved", approved_entries: estEntries.map(en => ({ ...en })), approved_total: tot } : {}) } : e))
      tt(`${selEst.number} updated`); setSelEst(null)
    } else {
      const num = estimates.length + 1
      const type = isDirectJob ? (num === 1 ? "quotation" : "supplementary") : (num === 1 ? "insurance_claim" : "supplementary")
      const label = isDirectJob ? (num === 1 ? "Quotation" : `Supplementary ${num - 1}`) : (type === "supplementary" ? `Supplementary ${num - 1}` : "Insurance Claim")
      const autoApprove = isDirectJob
      const est = { id: "est_" + Date.now(), number: num === 1 ? "EST-001" : `EST-001-S${num - 1}`, type, label, status: autoApprove ? "approved" : "draft", parts: [...estParts], entries: [...estEntries], sundries: validSundries, total: tot, ...(autoApprove ? { approved_entries: estEntries.map(en => ({ ...en })), approved_total: tot } : {}), created_at: new Date().toISOString() }
      setEstimates(p => [...p, est])
      tt(autoApprove ? `${est.number} saved` : `${est.number} saved`)
    }
    setEstParts([]); setEstEntries([]); setSundryItems([]); setSundryInput(""); setActiveCat(0)

    // Auto-create/update Parts Quotation entries for Replace parts
    const replaceEntries = estEntries.filter(e => e.category === "replace")
    if (replaceEntries.length > 0) {
      const estId = selEst ? selEst.id : "est_" + (Date.now() - 1) // match the est we just created
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
  const startApproval = (est) => { setSelEst(est); setApprovalItems(est.entries.map(e => { const part = est.parts.find(p => p.id === e.part_id); return { ...e, part_name: part?.name || "Unknown", original_rate: e.rate, approved_rate: null, approval_status: "pending" } })); setApprovalCat(0); setScreen("approve") }
  const setApproved = (eid, rate) => { setApprovalItems(prev => prev.map(i => { if (i.id !== eid) return i; const r = rate === "" ? null : Number(rate); let s = "pending"; if (r !== null) { s = r === i.original_rate ? "approved" : r < i.original_rate ? "cut" : "approved" } return { ...i, approved_rate: r, approval_status: s } })) }
  const approveAsIs = (eid) => { const i = approvalItems.find(x => x.id === eid); if (i) setApproved(eid, i.original_rate) }
  const markUseSame = (eid) => { setApprovalItems(prev => prev.map(i => i.id === eid ? { ...i, approved_rate: 0, approval_status: "use_same", remarks: "U/S" } : i)) }
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
    const inv = { id: "inv_" + Date.now(), invoice_number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, "0")}`, source_estimates: ae.map(e => e.number), status: "draft", items, payments: [], created_at: new Date().toISOString() }
    setInvoices(p => [...p, inv]); setSelInv(inv); setScreen("inv_detail"); tt("Invoice created")
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
    const inv = { id: "inv_" + Date.now(), invoice_number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, "0")}`, source_estimates: ["Quick Job"], status: "draft", items, payments: [], created_at: new Date().toISOString() }
    setInvoices(p => [...p, inv]); setSelInv(inv); setScreen("inv_detail"); tt("Invoice created -- set labour charges")
  }
  const invTotal = inv => (inv?.items || []).reduce((s, i) => s + i.qty * i.unit_price, 0)
  const invNet = inv => invTotal(inv) - (inv?.discount || 0)
  const invInsPayments = inv => (inv?.payments || []).filter(p => p.type === "insurance")
  const invCustPayments = inv => (inv?.payments || []).filter(p => p.type === "customer")
  const invInsTotal = inv => invInsPayments(inv).reduce((s, p) => s + p.amount, 0)
  const invCustPaidTotal = inv => invCustPayments(inv).reduce((s, p) => s + p.amount, 0)
  const invCustDiscount = inv => inv?.customer_discount || 0
  const invCustPortion = inv => invNet(inv) - invInsTotal(inv)
  const invCustOwes = inv => Math.max(0, invCustPortion(inv) - invCustDiscount(inv))
  const invCustBalance = inv => Math.max(0, invCustOwes(inv) - invCustPaidTotal(inv))
  const invTotalDiscount = inv => (inv?.discount || 0) + (inv?.customer_discount || 0)
  const invFullyPaid = inv => {
    if (invCustBalance(inv) > 0) return false
    const ip = invInsPayments(inv)
    if (ip.length === 0) return invCustPaidTotal(inv) >= invNet(inv) || invNet(inv) <= 0
    return ip.every(p => p.ins_status === "received")
  }
  const updateInvItem = (iid, patch) => { const upd = inv => ({ ...inv, items: inv.items.map(i => i.id === iid ? { ...i, ...patch, is_modified: true } : i) }); setInvoices(p => p.map(inv => inv.id === selInv.id ? upd(inv) : inv)); setSelInv(prev => upd(prev)) }
  const removeInvItem = (iid) => { setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, items: inv.items.filter(i => i.id !== iid) } : inv)); setSelInv(prev => ({ ...prev, items: prev.items.filter(i => i.id !== iid) })) }
  const setInvStatus = (s) => { const patch = { status: s }; if (s === "finalized") patch.finalized_at = new Date().toISOString(); setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, ...patch } : inv)); setSelInv(prev => ({ ...prev, ...patch })); tt(`→ ${s}`) }
  const calcStatus = (inv) => {
    const ip = invInsPayments(inv); const cb = invCustBalance(inv)
    if (cb <= 0 && ip.length === 0 && invCustPaidTotal(inv) >= invNet(inv)) return "paid"
    if (cb <= 0 && ip.length > 0 && ip.every(p => p.ins_status === "received")) return "paid"
    if (cb <= 0 || invCustPaidTotal(inv) > 0 || ip.length > 0) return "partially_paid"
    return inv.finalized_at ? "finalized" : "draft"
  }
  const addPayment = () => {
    const amt = Number(payAmount); if (!amt) return
    if (payType === "insurance" && !insPayPhoto) { tt("⚠️ Attach release letter/cheque photo"); return }
    const pay = { id: "pay_" + Date.now(), amount: amt, type: payType, date: new Date().toISOString(), ...(payType === "insurance" ? { ins_status: "recorded", photo: insPayPhoto, reference: payRef } : { method: payMethod, reference: payRef }) }
    const np = [...(selInv.payments || []), pay]
    const updated = { ...selInv, payments: np }
    const ns = calcStatus(updated)
    setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, payments: np, status: ns } : inv))
    setSelInv(prev => ({ ...prev, payments: np, status: ns }))
    setShowPayForm(false); setPayAmount(""); setPayRef(""); setInsPayPhoto(null)
    tt(payType === "insurance" ? `Insurance Rs.${fmt(amt)} recorded` : `Rs.${fmt(amt)} received`)
  }
  const deletePayment = (pid) => {
    if (confirmDel !== pid) { setConfirmDel(pid); setTimeout(() => setConfirmDel(c => c === pid ? null : c), 3000); return }
    const np = (selInv.payments || []).filter(p => p.id !== pid)
    const updated = { ...selInv, payments: np }
    const ns = np.length === 0 ? (selInv.finalized_at ? "finalized" : "draft") : calcStatus(updated)
    setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, payments: np, status: ns } : inv))
    setSelInv(prev => ({ ...prev, payments: np, status: ns }))
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
    setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, customer_discount: d } : inv))
    setSelInv(prev => ({ ...prev, customer_discount: d }))
    setShowCustDiscInput(false); tt(d > 0 ? `Customer discount Rs.${fmt(d)}` : "Customer discount removed")
  }

  // ═══════════ RENDER ═══════════
  const isDetailScreen = screen !== "home";
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const sidebarCollapsed = isTablet && isDetailScreen && !sidebarExpanded;

  // Job list panel (shared between phone home + tablet sidebar)
  function jobListPanel() { return (<div>
        <div style={{ paddingTop: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Workshop Pulse <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, letterSpacing: 0 }}>v{APP_VERSION}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: isTablet ? 28 : 36, fontWeight: 700, color: C.text, letterSpacing: "-1px" }}>Jobs</div>
            <div style={{ fontFamily: MONO, fontSize: 15, color: C.sub }}>{jobs.filter(j => !j.onHold && j.stage !== "closed").length} active</div>
          </div>
        </div>

        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search reg, customer, make..." style={{ ...inp, background: C.card, fontSize: isTablet ? 15 : 17, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }} />

        {/* Active / On Hold tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 12, background: C.card, borderRadius: 14, padding: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {[["active", "Active", jobs.filter(j => !j.onHold && j.stage !== "closed").length], ["on_hold", "📌 On Hold", jobs.filter(j => j.onHold).length], ["closed", "🏁 Closed", jobs.filter(j => j.stage === "closed").length]].map(([k, l, cnt]) => <div key={k} onClick={() => { setHomeTab(k); setFilterStage("all") }} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: homeTab === k ? (k === "on_hold" ? C.orange + "12" : k === "closed" ? C.sub + "12" : C.accent + "12") : "transparent", color: homeTab === k ? (k === "on_hold" ? C.orange : k === "closed" ? C.sub : C.accent) : C.muted, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>{l} ({cnt})</div>)}
        </div>

        {/* Stage filter pills -- active tab only */}
        {homeTab === "active" && <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, marginBottom: 4 }}>
          <div onClick={() => setFilterStage("all")} style={{ padding: "8px 16px", borderRadius: 20, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, background: filterStage === "all" ? C.accent : C.card, color: filterStage === "all" ? "#fff" : C.sub, border: `1px solid ${filterStage === "all" ? C.accent : C.border}` }}>All ({jobs.filter(j => !j.onHold && j.stage !== "closed").length})</div>
          {Object.entries(ALL_STAGES).filter(([, s]) => s.label !== "Closed").map(([key, s]) => { const cnt = jobs.filter(j => j.stage === key && !j.onHold).length; return cnt > 0 ? <div key={key} onClick={() => setFilterStage(filterStage === key ? "all" : key)} style={{ padding: "8px 16px", borderRadius: 20, fontSize: isTablet ? 13 : 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", background: filterStage === key ? s.color + "15" : C.card, color: filterStage === key ? s.color : C.sub, border: `1px solid ${filterStage === key ? s.color + "50" : C.border}` }}>{s.icon} {s.label} ({cnt})</div> : null })}
        </div>}

        {/* Job cards */}
        {(() => {
          let filtered = homeTab === "on_hold" ? jobs.filter(j => j.onHold) : homeTab === "closed" ? jobs.filter(j => j.stage === "closed") : jobs.filter(j => !j.onHold && j.stage !== "closed")
          if (homeTab === "active" && filterStage !== "all") filtered = filtered.filter(j => j.stage === filterStage)
          if (searchQuery.trim()) { const q = searchQuery.toLowerCase().replace(/[\s\-]/g, ""); filtered = filtered.filter(j => { const reg = regSearchKey(j.jobInfo.vehicle_reg); const phone = phoneSearchKey(j.jobInfo.customer_phone); const name = (j.jobInfo.customer_name || "").toLowerCase(); const make = (j.jobInfo.vehicle_make || "").toLowerCase(); const num = (j.jobNumber || "").toLowerCase(); return reg.includes(q) || phone.includes(q) || name.includes(q) || make.includes(q) || num.includes(q) }) }
          return filtered.length ? filtered.map(j => {
            const stage = ALL_STAGES[j.stage] || ALL_STAGES.job_received
            const estTotal = (j.estimates || []).reduce((s, e) => s + (e.approved_total || e.total || 0), 0)
            const jobReplaceCnt = (j.estimates || []).flatMap(est => (est.approved_entries || est.entries || []).filter(e => e.category === "replace")).length
            const jobArrivedCnt = Object.values(j.partsArrived || {}).filter(Boolean).length
            const isSelected = isTablet && activeJobId === j.id
            const thumb = (j.jobDocs || [])[0]?.dataUrl
            return <div key={j.id} onClick={() => openJob(j)} onMouseEnter={e => { if (isTablet) { setHoverJobId(j.id); setHoverY(e.clientY) } }} onMouseLeave={() => setHoverJobId(null)} style={{ ...card, cursor: "pointer", borderLeft: `4px solid ${stage.color}`, padding: isTablet ? "12px 14px" : "14px 16px", background: isSelected ? C.accent + "08" : C.card, border: isSelected ? `1px solid ${C.accent}40` : `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "center" }}>
              {/* Vehicle thumbnail */}
              {thumb ? <img src={thumb} style={{ width: isTablet ? 52 : 58, height: isTablet ? 52 : 58, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} alt="" /> : <div style={{ width: isTablet ? 52 : 58, height: isTablet ? 52 : 58, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>🚗</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: isTablet ? 17 : 20, fontWeight: 700 }}>{j.jobInfo.vehicle_reg || "New Job"}</span>
                  <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>{j.jobNumber}</span>
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                  {j.paused && <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, background: C.orange + "15", padding: "3px 8px", borderRadius: 6 }}>⏸</span>}
                  {j.onHold && <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, background: C.orange + "15", padding: "3px 8px", borderRadius: 6 }}>📌</span>}
                  <span style={{ fontSize: isTablet ? 11 : 12, fontWeight: 700, color: stage.color, background: stage.color + "12", padding: "3px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>{stage.icon} {stage.label}</span>
                </div>
              </div>
              <div style={{ fontSize: isTablet ? 14 : 15, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.jobInfo.customer_name || "--"}{j.jobInfo.vehicle_make ? ` · ${j.jobInfo.vehicle_make} ${j.jobInfo.vehicle_model || ""}` : ""}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                {j.jobInfo.insurance_name ? <span style={{ fontSize: 13, color: C.accent }}>🛡️ {j.jobInfo.insurance_name}</span> : j.jobInfo.job_type === "quick" ? <span style={{ fontSize: 13, color: C.orange, fontWeight: 600 }}>⚡ Quick</span> : <span style={{ fontSize: 13, color: C.green }}>💰 Direct</span>}
                {j.jobInfo.work_type === "mechanical" && <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>🔧</span>}
                {j.jobInfo.work_type === "both" && <span style={{ fontSize: 12, color: C.purple, fontWeight: 600 }}>🎨+🔧</span>}
                {j.jobInfo.work_type === "paint" && <span style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>🎨</span>}
                {jobReplaceCnt > 0 && <span style={{ fontSize: 13, color: jobArrivedCnt >= jobReplaceCnt ? C.green : C.orange }}>📦 {jobArrivedCnt}/{jobReplaceCnt}</span>}
                {estTotal > 0 && <span style={{ fontSize: 13, fontFamily: MONO, color: C.sub }}>Rs.{Number(estTotal).toLocaleString()}</span>}
              </div>
              {j.onHold && j.holdUntil && (() => {
                const ms = new Date(j.holdUntil) - new Date()
                const hours = Math.ceil(ms / (1000 * 60 * 60))
                const days = Math.ceil(ms / (1000 * 60 * 60 * 24))
                if (ms <= 0) return j.stage === "delivered" ? <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginTop: 4 }}>🔔 Follow-up due!</div> : <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginTop: 4 }}>🔔 Retry call now!</div>
                if (j.stage === "follow_up") return <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginTop: 4 }}>📵 No answer ({j.followUpAttempts}/3) · retry in {hours}h</div>
                return <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginTop: 4 }}>⏰ Follow-up in {days} day{days !== 1 ? "s" : ""}</div>
              })()}
              {j.stage === "closed" && j.followUpNote && <div style={{ fontSize: 12, color: C.sub, marginTop: 4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>💬 {j.followUpNote}</div>}
              </div>
            </div>
          }) : <div style={{ textAlign: "center", padding: 40, color: C.muted }}><div style={{ fontSize: 40, marginBottom: 12 }}>{homeTab === "on_hold" ? "📌" : homeTab === "closed" ? "🏁" : "🔧"}</div><div style={{ fontSize: 18, fontWeight: 600 }}>{homeTab === "on_hold" ? "No jobs on hold" : homeTab === "closed" ? "No closed jobs" : `No jobs${filterStage !== "all" ? " in this stage" : ""}`}</div><div style={{ fontSize: 16, marginTop: 6 }}>{homeTab === "on_hold" ? "Delivered jobs wait here for 2-week follow-up" : homeTab === "closed" ? "Completed jobs will appear here" : "Tap + to create a new job"}</div></div>
        })()}

        <button onClick={startNewJob} style={{ ...btn(C.accent, "#fff"), marginTop: 8, position: "sticky", bottom: 20 }}>+ New Job</button>
      </div>); }

  // Right panel placeholder when no job open (tablet only)
  function emptyDetail() { return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", color: C.muted }}><div style={{ fontSize: 60, marginBottom: 16, opacity: 0.3 }}>🔧</div><div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Select a job</div><div style={{ fontSize: 16 }}>Tap a job from the list to see details</div></div>); }

  return (
    <div style={{ fontFamily: FONT, background: C.bg, color: C.text, minHeight: "100vh", display: isTablet ? "flex" : "block" }}>
      {/* TABLET: Left sidebar */}
      {isTablet && <div onClick={() => { if (sidebarCollapsed) setSidebarExpanded(true) }} style={{ width: sidebarCollapsed ? 82 : 380, minWidth: sidebarCollapsed ? 82 : 380, height: "100vh", position: "sticky", top: 0, overflowY: "auto", overflowX: "hidden", borderRight: `1px solid ${C.border}`, padding: sidebarCollapsed ? "8px 6px" : "0 16px", background: C.bg, transition: "width 0.25s ease, min-width 0.25s ease, padding 0.25s ease", cursor: sidebarCollapsed ? "pointer" : "default" }}>
        {sidebarCollapsed ? <>
          {/* Collapsed: mini thumbnails + reg */}
          <div style={{ textAlign: "center", padding: "10px 0 8px", marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 1 }}>JOBS</div>
            <div style={{ fontSize: 11, color: C.muted }}>{jobs.filter(j => !j.onHold && j.stage !== "closed").length}</div>
          </div>
          {(() => {
            let filtered = homeTab === "on_hold" ? jobs.filter(j => j.onHold) : homeTab === "closed" ? jobs.filter(j => j.stage === "closed") : jobs.filter(j => !j.onHold && j.stage !== "closed")
            return filtered.map(j => {
              const stage = ALL_STAGES[j.stage] || ALL_STAGES.job_received
              const thumb = (j.jobDocs || [])[0]?.dataUrl
              const isSel = activeJobId === j.id
              return <div key={j.id} onClick={e => { e.stopPropagation(); openJob(j); setSidebarExpanded(false) }} onMouseEnter={e => { setHoverJobId(j.id); setHoverY(e.clientY) }} onMouseLeave={() => setHoverJobId(null)} style={{ marginBottom: 6, cursor: "pointer", borderRadius: 12, overflow: "hidden", border: isSel ? `2px solid ${C.accent}` : `2px solid transparent`, background: isSel ? C.accent + "08" : C.card, transition: "all 0.2s" }}>
                {thumb ? <img src={thumb} style={{ width: "100%", height: 52, objectFit: "cover", display: "block" }} alt="" /> : <div style={{ width: "100%", height: 52, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚗</div>}
                <div style={{ padding: "4px 4px 5px", textAlign: "center" }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.jobInfo.vehicle_reg || "--"}</div>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: stage.color, margin: "3px auto 0" }} />
                </div>
              </div>
            })
          })()}
          <div onClick={e => { e.stopPropagation(); setSidebarExpanded(true) }} style={{ textAlign: "center", padding: "10px 0", cursor: "pointer" }}>
            <div style={{ fontSize: 18, color: C.accent }}>▸</div>
          </div>
        </> : <>
          {/* Expanded: full job list */}
          {isDetailScreen && <div onClick={() => setSidebarExpanded(false)} style={{ textAlign: "right", padding: "10px 4px 0", cursor: "pointer" }}>
            <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>◂ Collapse</span>
          </div>}
          {jobListPanel()}
        </>}
      </div>}

      {/* TABLET: Vehicle photo popup on hover */}
      {isTablet && hoverJobId && (() => { const hj = jobs.find(j => j.id === hoverJobId); const photo = (hj?.jobDocs || [])[0]?.dataUrl; return photo ? <div style={{ position: "fixed", left: sidebarCollapsed ? 90 : 392, top: Math.min(hoverY - 40, window.innerHeight - 240), zIndex: 200, background: C.card, borderRadius: 16, padding: 6, boxShadow: "0 12px 40px rgba(0,0,0,0.22)", border: `1px solid ${C.border}`, pointerEvents: "none", transition: "left 0.25s ease, top 0.15s ease" }}>
        <img src={photo} style={{ width: 240, height: 180, objectFit: "cover", borderRadius: 12 }} alt="" />
        <div style={{ padding: "6px 8px", fontSize: 14, fontWeight: 700, color: C.sub, textAlign: "center" }}>{hj.jobInfo.vehicle_reg} · {hj.jobInfo.vehicle_make}</div>
      </div> : null })()}

      {/* Main content */}
      <div style={{ flex: isTablet ? 1 : undefined, maxWidth: isTablet ? undefined : 480, margin: isTablet ? undefined : "0 auto", padding: isTablet ? "16px 28px" : "16px 20px", paddingBottom: 100, minHeight: "100vh", overflowY: isTablet ? "auto" : undefined, maxHeight: isTablet ? "100vh" : undefined }}>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: C.text, color: "#fff", padding: "14px 28px", borderRadius: 16, fontWeight: 600, fontSize: 17, zIndex: 999, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>{toast}</div>}

      {/* Hidden file inputs */}
      <input ref={uploadRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) { const r = new FileReader(); r.onload = () => { const label = showUploadMenu === "approval" && selEst ? (selEst.type === "supplementary" ? selEst.label : "Estimate") : photoTag; setJobDocs(p => [...p, { id: "d" + Date.now(), dataUrl: r.result, estId: selEst?.id || null, label }]); tt(`📸 ${label} photo saved`); setShowUploadMenu(null); setPhotoTag("General") }; r.readAsDataURL(e.target.files[0]) } e.target.value = "" }} />
      <input id="camInput" type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) { const r = new FileReader(); r.onload = () => { const label = showUploadMenu === "approval" && selEst ? (selEst.type === "supplementary" ? selEst.label : "Estimate") : photoTag; setJobDocs(p => [...p, { id: "d" + Date.now(), dataUrl: r.result, estId: selEst?.id || null, label }]); tt(`📸 ${label} photo saved`); setShowUploadMenu(null); setPhotoTag("General") }; r.readAsDataURL(e.target.files[0]) } e.target.value = "" }} />

      {/* Image full screen */}
      {showImage && (() => { const d = jobDocs.find(x => x.id === showImage); return d ? <div onClick={() => setShowImage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        {d.label && <div style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>{d.label}</div>}
        <img src={d.dataUrl} style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 16 }} alt="" />
        <button onClick={() => setShowImage(null)} style={{ ...btnSm("#fff", C.text), width: "auto", marginTop: 20, padding: "14px 40px" }}>Close</button>
      </div> : null })()}

      {/* Upload sheet */}
      {showUploadMenu && <Sheet onClose={() => { setShowUploadMenu(null); setPhotoTag("General") }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>{showUploadMenu === "approval" ? "Upload Approved Copy" : "Add Photo"}</div>
        {showUploadMenu !== "approval" && <>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, textAlign: "center" }}>Tag this photo</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
            {["Vehicle", "Before", "After", ...estimates.flatMap(e => (e.parts || []).map(p => p.name)).filter((v, i, a) => a.indexOf(v) === i), "General"].map(tag => {
              const tagColor = tag === "Vehicle" ? C.accent : tag === "Before" ? C.orange : tag === "After" ? C.green : C.sub
              return <div key={tag} onClick={() => setPhotoTag(tag)} style={{ padding: "6px 14px", borderRadius: 20, background: photoTag === tag ? tagColor + "18" : C.bg, border: `2px solid ${photoTag === tag ? tagColor : C.border}`, color: photoTag === tag ? tagColor : C.muted, fontSize: 14, fontWeight: photoTag === tag ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>{tag}</div>
            })}
          </div>
        </>}
        <button onClick={() => document.getElementById("camInput").click()} style={{ ...btn(C.bg, C.text), marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 16 }}>
          <span style={{ fontSize: 26 }}>📷</span> Take Photo
        </button>
        <button onClick={() => uploadRef.current?.click()} style={{ ...btn(C.bg, C.text), marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 16 }}>
          <span style={{ fontSize: 26 }}>🖼️</span> Choose from Gallery
        </button>
        <button onClick={() => { setShowUploadMenu(null); setPhotoTag("General") }} style={{ ...btn("transparent", C.sub) }}>Cancel</button>
      </Sheet>}

      {/* Sub-flow pause/continue prompt */}
      {showSubFlowPrompt && <Sheet onClose={() => setShowSubFlowPrompt(false)}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Supplementary Added</div>
        <div style={{ fontSize: 16, color: C.sub, textAlign: "center", marginBottom: 20 }}>Should the main job pause while this supplementary is processed?</div>
        <button onClick={() => { setJobPaused(true); setShowSubFlowPrompt(false); tt("⏸ Main job paused") }} style={{ ...btn(C.orange, "#fff"), marginBottom: 10 }}>⏸ Pause Main Job</button>
        <button onClick={() => { setJobPaused(false); setShowSubFlowPrompt(false); tt("▶ Continuing alongside") }} style={{ ...btn(C.green, "#fff"), marginBottom: 10 }}>▶ Continue Alongside</button>
      </Sheet>}

      {/* Parts Quotation / PO Editor */}
      {showPQScreen && <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 999, overflowY: "auto", padding: "0 20px 40px" }}>
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
            {partsQuotation.map((p, idx) => <div key={p.id} style={{ ...card, padding: "14px 16px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 600 }}>{idx + 1}. {p.partName}</span>
                <span style={{ fontSize: 13, color: C.muted, background: C.bg, padding: "3px 8px", borderRadius: 6 }}>{p.remarks}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Supplier</div>
                  <input value={p.supplier} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, supplier: e.target.value } : x))} placeholder="Toyota Lanka" style={{ ...inp, fontSize: 16 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Quoted Price</div>
                  <input type="number" value={p.quotedPrice === null ? "" : p.quotedPrice} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, quotedPrice: e.target.value === "" ? null : Number(e.target.value) } : x))} placeholder="0" style={{ ...inp, fontSize: 20, fontFamily: MONO, fontWeight: 700, textAlign: "right" }} />
                </div>
              </div>
            </div>)}
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
            
            {/* Status badge */}
            <div style={{ ...card, textAlign: "center", padding: "12px 16px", border: `2px solid ${pqStatus === "approved" ? C.green : C.orange}30`, marginBottom: 12 }}>
              <span style={pill(pqStatus === "approved" ? C.green : pqStatus === "submitted" ? C.orange : C.muted)}>{pqStatus === "approved" ? "✓ Approved" : pqStatus === "submitted" ? "⏳ Awaiting Approval" : "Draft"}</span>
            </div>

            {/* Per-part vs Lump sum toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 14, background: C.card, borderRadius: 14, padding: 4 }}>
              <div onClick={() => setPqLumpMode(false)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: !pqLumpMode ? C.accent + "12" : "transparent", color: !pqLumpMode ? C.accent : C.muted, fontSize: 14, fontWeight: 600 }}>Per Part</div>
              <div onClick={() => setPqLumpMode(true)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: pqLumpMode ? C.accent + "12" : "transparent", color: pqLumpMode ? C.accent : C.muted, fontSize: 14, fontWeight: 600 }}>Lump Sum</div>
            </div>

            {!pqLumpMode ? <>
              {partsQuotation.map((p, idx) => <div key={p.id} style={{ ...card, padding: "12px 16px", marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 500 }}>{idx + 1}. {p.partName}</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, color: C.muted }}>Quoted: {p.quotedPrice?.toLocaleString() || "--"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, color: C.sub, width: 70 }}>Approved</span>
                  <input type="number" value={p.approvedPrice === null ? "" : p.approvedPrice} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, approvedPrice: e.target.value === "" ? null : Number(e.target.value) } : x))} placeholder={p.quotedPrice?.toString() || "0"} style={{ flex: 1, ...inp, fontSize: 20, fontFamily: MONO, fontWeight: 700, textAlign: "right", border: `2px solid ${p.approvedPrice !== null ? (p.approvedPrice < (p.quotedPrice || 0) ? C.red + "40" : C.green + "40") : C.border}` }} />
                </div>
                {p.approvedPrice !== null && p.approvedPrice < (p.quotedPrice || 0) && <div style={{ fontSize: 13, color: C.red, marginTop: 4 }}>Cut Rs.{((p.quotedPrice || 0) - p.approvedPrice).toLocaleString()}</div>}
              </div>)}
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

            {/* Approval Photo */}
            <div style={{ ...card, padding: "14px 16px", marginTop: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, marginBottom: 8 }}>📷 Approval Photo</div>
              {pqApprovalPhoto ? <div style={{ position: "relative" }}>
                <img src={pqApprovalPhoto} style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} alt="Approval" />
                <span onClick={() => setPqApprovalPhoto(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 20, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>×</span>
              </div> : <div onClick={() => pqPhotoRef.current?.click()} style={{ padding: "24px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.muted }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>📷</div>
                <div style={{ fontSize: 15 }}>Tap to attach approval photo</div>
              </div>}
              <input ref={pqPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setPqApprovalPhoto(ev.target.result); r.readAsDataURL(f) } }} />
            </div>

            {/* Confirm Approval */}
            {pqStatus !== "approved" && <button onClick={() => {
              if (!pqHasApproval) { tt("⚠️ Enter approved prices first"); return }
              if (!pqApprovalPhoto) { tt("⚠️ Attach approval photo first"); return }
              setPqStatus("approved"); tt("✓ Parts prices approved")
            }} style={{ ...btn(C.green, "#fff"), marginTop: 12 }}>✓ Confirm Prices Approved</button>}
            {pqStatus === "approved" && <div style={{ ...card, textAlign: "center", background: C.green + "06", marginTop: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.green }}>✓ Parts Prices Approved</span>
              <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>Rs.{pqApprovedTotal.toLocaleString()} approved · Photo attached</div>
            </div>}
          </>}

          {/* COST TAB -- Actual costs, margins & supplier invoices */}
          {pqTab === "cost" && <>
            {pqStatus !== "approved" ? <div style={{ ...card, textAlign: "center", padding: "30px 16px" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.sub }}>Prices not yet approved</div>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Complete the Approve tab first</div>
            </div> : <>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Enter actual cost per part. Supplier invoice is at approved price -- your margin is the difference.</div>
              
              {/* Per-part actual costs */}
              {partsQuotation.map((p, idx) => {
                const margin = (p.approvedPrice || 0) - (p.actualCost || 0)
                const hasMargin = p.actualCost > 0 && p.approvedPrice > 0
                return <div key={p.id} style={{ ...card, padding: "14px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{idx + 1}. {p.partName}</span>
                    <span style={{ fontFamily: MONO, fontSize: 14, color: C.green, fontWeight: 600 }}>Appr: {p.approvedPrice?.toLocaleString() || "--"}</span>
                  </div>
                  
                  {/* Supplied by toggle */}
                  <div style={{ display: "flex", gap: 0, marginBottom: 8, background: C.bg, borderRadius: 10, padding: 3 }}>
                    <div onClick={() => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, suppliedBy: "supplier" } : x))} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, cursor: "pointer", background: p.suppliedBy === "supplier" ? C.accent + "15" : "transparent", color: p.suppliedBy === "supplier" ? C.accent : C.muted, fontSize: 13, fontWeight: 600 }}>🏭 Supplier</div>
                    <div onClick={() => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, suppliedBy: "insurance", actualCost: 0 } : x))} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, cursor: "pointer", background: p.suppliedBy === "insurance" ? C.orange + "15" : "transparent", color: p.suppliedBy === "insurance" ? C.orange : C.muted, fontSize: 13, fontWeight: 600 }}>🛡️ Insurance Supplied</div>
                  </div>
                  
                  {p.suppliedBy === "supplier" && <div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Actual Cost (what you paid)</div>
                    <input type="number" value={p.actualCost || ""} onChange={e => setPartsQuotation(prev => prev.map(x => x.id === p.id ? { ...x, actualCost: e.target.value === "" ? 0 : Number(e.target.value) } : x))} placeholder="0" style={{ ...inp, fontSize: 20, fontFamily: MONO, fontWeight: 700, textAlign: "right" }} />
                    {hasMargin && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "6px 10px", background: margin > 0 ? C.green + "08" : C.red + "08", borderRadius: 8 }}>
                      <span style={{ fontSize: 14, color: margin > 0 ? C.green : C.red, fontWeight: 600 }}>Margin</span>
                      <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: margin > 0 ? C.green : C.red }}>Rs.{margin.toLocaleString()}</span>
                    </div>}
                  </div>}
                  
                  {p.suppliedBy === "insurance" && <div style={{ padding: "8px 12px", background: C.orange + "08", borderRadius: 8, fontSize: 14, color: C.orange, fontWeight: 500 }}>Insurance supplied this part directly -- no cost to workshop</div>}
                </div>
              })}
              
              {/* Margin Summary */}
              {(() => {
                const supplierParts = partsQuotation.filter(p => p.suppliedBy === "supplier" && p.actualCost > 0)
                const insParts = partsQuotation.filter(p => p.suppliedBy === "insurance")
                const totalApproved = supplierParts.reduce((s, p) => s + (p.approvedPrice || 0), 0)
                const totalActual = supplierParts.reduce((s, p) => s + (p.actualCost || 0), 0)
                const totalMargin = totalApproved - totalActual
                const allFilled = partsQuotation.every(p => p.suppliedBy)
                return <>
                  {supplierParts.length > 0 && <div style={{ ...card, background: totalMargin > 0 ? C.green + "06" : C.red + "06", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>Parts Margin Summary</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 6 }}>
                      <div><div style={{ fontSize: 11, color: C.muted }}>Approved</div><div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>Rs.{totalApproved.toLocaleString()}</div></div>
                      <div><div style={{ fontSize: 11, color: C.muted }}>Actual</div><div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>Rs.{totalActual.toLocaleString()}</div></div>
                      <div><div style={{ fontSize: 11, color: C.muted }}>Margin</div><div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: totalMargin > 0 ? C.green : C.red }}>Rs.{totalMargin.toLocaleString()}</div></div>
                    </div>
                    {insParts.length > 0 && <div style={{ fontSize: 13, color: C.orange }}>+ {insParts.length} part{insParts.length > 1 ? "s" : ""} supplied by insurance</div>}
                  </div>}
                  {!allFilled && <div style={{ fontSize: 13, color: C.orange, textAlign: "center", marginTop: 8 }}>⚠️ Select supplier/insurance for all parts</div>}
                </>
              })()}

              {/* Supplier Invoices (photos) */}
              <div style={{ ...card, padding: "14px 16px", marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.sub }}>📄 Supplier Invoices</span>
                  <span style={{ fontSize: 13, color: C.muted }}>{supplierInvoices.length} attached</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Invoices at insurance-approved prices to submit to insurance</div>
                
                {supplierInvoices.map((inv, idx) => <div key={inv.id} style={{ background: C.bg, borderRadius: 12, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{inv.supplierName || `Invoice ${idx + 1}`}</span>
                    <span onClick={() => setSupplierInvoices(prev => prev.filter(x => x.id !== inv.id))} style={{ fontSize: 13, color: C.red, cursor: "pointer", fontWeight: 600 }}>Remove</span>
                  </div>
                  {inv.photo && <img src={inv.photo} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 10, marginBottom: 6 }} alt="" />}
                </div>)}
                
                {/* Add supplier invoice */}
                {showSupplierInvForm ? <div style={{ background: C.bg, borderRadius: 12, padding: 12, border: `2px dashed ${C.accent}40` }}>
                  <input id="suppInvName" placeholder="Supplier name" style={{ ...inp, fontSize: 16, marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div onClick={() => { const inp2 = document.createElement("input"); inp2.type = "file"; inp2.accept = "image/*"; inp2.capture = "environment"; inp2.onchange = e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => { const name = document.getElementById("suppInvName")?.value || "Supplier"; setSupplierInvoices(prev => [...prev, { id: "si" + Date.now(), supplierName: name, photo: ev.target.result }]); setShowSupplierInvForm(false); tt("📄 Invoice attached") }; r.readAsDataURL(f) } }; inp2.click() }} style={{ flex: 1, padding: "20px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.muted }}>
                      <div style={{ fontSize: 24, marginBottom: 2 }}>📷</div>
                      <div style={{ fontSize: 13 }}>Camera</div>
                    </div>
                    <div onClick={() => { const inp2 = document.createElement("input"); inp2.type = "file"; inp2.accept = "image/*"; inp2.onchange = e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => { const name = document.getElementById("suppInvName")?.value || "Supplier"; setSupplierInvoices(prev => [...prev, { id: "si" + Date.now(), supplierName: name, photo: ev.target.result }]); setShowSupplierInvForm(false); tt("📄 Invoice attached") }; r.readAsDataURL(f) } }; inp2.click() }} style={{ flex: 1, padding: "20px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.muted }}>
                      <div style={{ fontSize: 24, marginBottom: 2 }}>🖼️</div>
                      <div style={{ fontSize: 13 }}>Gallery</div>
                    </div>
                  </div>
                  <div onClick={() => setShowSupplierInvForm(false)} style={{ textAlign: "center", fontSize: 14, color: C.muted, marginTop: 8, cursor: "pointer" }}>Cancel</div>
                </div> : <button onClick={() => setShowSupplierInvForm(true)} style={{ ...btn(C.bg, C.accent), border: `1px solid ${C.accent}30`, fontSize: 15 }}>+ Add Supplier Invoice</button>}
              </div>
            </>}
          </>}
        </>}

        {isDirectJob && <>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>Purchase order for your purchasing office. Share via WhatsApp.</div>
          {partsQuotation.map((p, idx) => <div key={p.id} style={{ ...card, padding: "12px 16px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 17, fontWeight: 500 }}>{idx + 1}. {p.partName}</span>
              <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>({p.remarks})</span>
            </div>
          </div>)}
          {!customerConfirmed && <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 14, color: C.orange, marginBottom: 8, fontWeight: 500 }}>⚠️ Customer hasn't confirmed -- PO not sent</div>
            <button onClick={() => { confirmCustomer(); setShowPQScreen(false) }} style={{ ...btn(C.accent, "#fff") }}>✓ Customer Confirmed</button>
          </div>}
          {customerConfirmed && <div style={{ fontSize: 14, color: C.green, fontWeight: 600, textAlign: "center", marginTop: 14 }}>✓ Customer confirmed -- share PO with purchasing</div>}
        </>}

        <button onClick={() => setShowPQScreen(false)} style={{ ...btn(C.bg, C.sub), marginTop: 16 }}>Done</button>
      </div>}

      {/* Floating doc ref */}
      {jobDocs.length > 0 && (screen === "approve_entry" || screen === "inv_detail") && (() => {
        const relevantDocs = screen === "approve_entry" && selEst ? jobDocs.filter(d => d.estId === selEst.id) : jobDocs
        const lastDoc = relevantDocs[relevantDocs.length - 1]
        return lastDoc ? <div onClick={() => setShowImage(lastDoc.id)} style={{ position: "fixed", bottom: 80, right: 20, width: 58, height: 58, borderRadius: 29, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 60, boxShadow: "0 6px 20px rgba(0,122,255,0.4)", fontSize: 24 }}>📋</div> : null
      })()}

      {/* ══════════════════════════════════════════ */}
      {/* HOME SCREEN */}
      {/* ══════════════════════════════════════════ */}
      {screen === "home" && <>
        {isTablet ? emptyDetail() : jobListPanel()}
      </>}

      {/* ══════════════════════════════════════════ */}
      {/* NEW JOB FORM */}
      {/* ══════════════════════════════════════════ */}
      {screen === "new_job" && <>
        <NavBar title="New Job" subtitle="Fill all details to create job" onBack={() => setScreen("home")} />
        {(() => { const nj = newJobInfo; const er = newJobErrors; const set = (k, v) => { setNewJobInfo(p => ({ ...p, [k]: v })); setNewJobErrors(p => { const n = { ...p }; delete n[k]; return n }) }; const errBorder = k => er[k] ? `2px solid ${C.red}` : "none"
          return <>
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Vehicle</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: er.vehicle_reg ? C.red : C.sub, marginBottom: 5, fontWeight: 500 }}>Vehicle Reg <span style={{ color: C.red }}>*</span></div>
                <input value={nj.vehicle_reg} onChange={e => {
                  const val = e.target.value.toUpperCase()
                  set("vehicle_reg", val)
                  // Lookup in registry
                  const key = regSearchKey(val)
                  if (key.length >= 4) {
                    const match = customerRegistry.byReg[key]
                    if (match) { setCustomerMatch(match) } else { setCustomerMatch(null) }
                  } else { setCustomerMatch(null) }
                }} onBlur={() => {
                  // Normalize on blur
                  const norm = normalizeReg(nj.vehicle_reg)
                  if (norm !== nj.vehicle_reg) set("vehicle_reg", norm)
                }} placeholder="CBB 5949" style={{ ...inp, fontFamily: MONO, fontWeight: 700, fontSize: 22, border: errBorder("vehicle_reg") }} />
                {nj.vehicle_reg && normalizeReg(nj.vehicle_reg) !== nj.vehicle_reg && <div style={{ fontSize: 12, color: C.accent, marginTop: 4 }}>→ {normalizeReg(nj.vehicle_reg)}</div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ fontSize: 14, color: er.vehicle_make ? C.red : C.sub, marginBottom: 5, fontWeight: 500 }}>Make <span style={{ color: C.red }}>*</span></div>
                  <input value={nj.vehicle_make} onChange={e => { set("vehicle_make", e.target.value); const q = e.target.value.toLowerCase(); setNewJobMakeSugg(q.length >= 1 ? VEHICLE_MAKES.filter(m => m.toLowerCase().includes(q)) : []) }} onFocus={() => { if (!nj.vehicle_make) setNewJobMakeSugg(VEHICLE_MAKES) }} onBlur={() => setTimeout(() => setNewJobMakeSugg([]), 200)} placeholder="Toyota" style={{ ...inp, border: errBorder("vehicle_make") }} />
                  {newJobMakeSugg.length > 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, zIndex: 20, maxHeight: 200, overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", marginTop: 4 }}>
                    {newJobMakeSugg.map(m => <div key={m} onMouseDown={() => { set("vehicle_make", m); setNewJobMakeSugg([]) }} style={{ padding: "14px 18px", fontSize: 17, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>{m}</div>)}
                  </div>}
                </div>
                <div>
                  <div style={{ fontSize: 14, color: er.vehicle_model ? C.red : C.sub, marginBottom: 5, fontWeight: 500 }}>Model <span style={{ color: C.red }}>*</span></div>
                  <input value={nj.vehicle_model} onChange={e => set("vehicle_model", e.target.value)} placeholder="Aqua" style={{ ...inp, border: errBorder("vehicle_model") }} />
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Customer</div>
              {/* Customer match banner */}
              {customerMatch && <div style={{ padding: "10px 14px", background: C.accent + "08", borderRadius: 12, border: `1px solid ${C.accent}30`, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>🔍 Returning customer found</span>
                  <span onClick={() => {
                    setNewJobInfo(p => ({ ...p, customer_name: customerMatch.customer_name, customer_phone: customerMatch.customer_phone, vehicle_make: customerMatch.vehicle_make, vehicle_model: customerMatch.vehicle_model }))
                    setCustomerMatch(null); tt("✓ Customer details filled")
                  }} style={{ fontSize: 14, fontWeight: 700, color: C.accent, cursor: "pointer", padding: "4px 12px", background: C.accent + "15", borderRadius: 8 }}>Fill</span>
                </div>
                <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>{customerMatch.customer_name} · {customerMatch.customer_phone} · {customerMatch.vehicle_make} {customerMatch.vehicle_model}</div>
              </div>}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 14, color: er.customer_name ? C.red : C.sub, marginBottom: 5, fontWeight: 500 }}>Name <span style={{ color: C.red }}>*</span></div>
                <input value={nj.customer_name} onChange={e => set("customer_name", e.target.value)} placeholder="Mr. Kasun" style={{ ...inp, border: errBorder("customer_name") }} />
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
                }} placeholder="0771234567" style={{ ...inp, fontFamily: MONO, border: errBorder("customer_phone") }} />
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
                <span style={{ fontSize: 15, color: C.green, fontWeight: 600 }}>💰 Non-insurance -- estimate + full pipeline</span>
              </div>}
              {nj.job_type === "quick" && <div style={{ padding: "12px 16px", background: C.orange + "08", borderRadius: 12, border: `1px solid ${C.orange}30` }}>
                <span style={{ fontSize: 15, color: C.orange, fontWeight: 600 }}>⚡ Quick job -- no estimate, no pipeline, no photo needed</span>
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
                <div onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment"; inp.onchange = e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => { setNewJobPhoto(ev.target.result); setNewJobErrors(p => { const n = {...p}; delete n.photo; return n }) }; r.readAsDataURL(f) } }; inp.click() }} style={{ flex: 1, padding: "28px 0", textAlign: "center", border: `2px dashed ${er.photo ? C.red : C.border}`, borderRadius: 14, cursor: "pointer", color: er.photo ? C.red : C.muted }}>
                  <div style={{ fontSize: 32, marginBottom: 4 }}>📷</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>Camera</div>
                </div>
                <div onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => { setNewJobPhoto(ev.target.result); setNewJobErrors(p => { const n = {...p}; delete n.photo; return n }) }; r.readAsDataURL(f) } }; inp.click() }} style={{ flex: 1, padding: "28px 0", textAlign: "center", border: `2px dashed ${er.photo ? C.red : C.border}`, borderRadius: 14, cursor: "pointer", color: er.photo ? C.red : C.muted }}>
                  <div style={{ fontSize: 32, marginBottom: 4 }}>🖼️</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>Gallery</div>
                </div>
              </div>}
            </div>}

            <button onClick={validateAndCreateJob} style={{ ...btn(C.accent, "#fff"), marginTop: 8 }}>Create Job</button>
          </>
        })()}
      </>}

      {/* ══════════════════════════════════════════ */}
      {/* JOB DASHBOARD */}
      {/* ══════════════════════════════════════════ */}
      {screen === "job" && <>
        <div style={{ paddingTop: 8, marginBottom: 14 }}>
          <div onClick={goHome} style={{ fontSize: 17, color: C.accent, cursor: "pointer", fontWeight: 400, marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 22 }}>‹</span> Jobs</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: "-0.7px" }}>{jobInfo.vehicle_reg || "New Job"}</div>
              <div style={{ fontSize: 14, color: C.sub }}>{activeJob?.jobNumber}</div>
            </div>
            {isInsurance && <span style={pill(C.accent)}>🛡️ {jobInfo.insurance_name}</span>}
            {isDirectJob && !isMinorJob && <span style={pill(C.green)}>💰 Direct</span>}
            {isMinorJob && <span style={pill(C.orange)}>⚡ Quick Job</span>}
            {workType === "paint" && <span style={pill(C.orange)}>🎨 Paint</span>}
            {workType === "mechanical" && <span style={pill(C.accent)}>🔧 Mech</span>}
            {workType === "both" && <span style={pill(C.purple)}>🎨+🔧</span>}
            {activeJob?.onHold && <span style={pill(C.orange)}>📌 On Hold</span>}
            {activeJob?.onHold && activeJob?.holdUntil && (() => {
              const ms = new Date(activeJob.holdUntil) - new Date()
              const hours = Math.ceil(ms / (1000 * 60 * 60))
              const days = Math.ceil(ms / (1000 * 60 * 60 * 24))
              if (ms <= 0) return <span style={pill(C.red)}>🔔 Due!</span>
              if (activeJob.stage === "follow_up") return <span style={pill(C.orange)}>📵 {hours}h</span>
              return <span style={pill(C.orange)}>⏰ {days}d</span>
            })()}
          </div>
        </div>

        {/* ═══ STAGE PIPELINE ═══ */}
        {!isMinorJob && <div style={{ ...card, padding: "12px 10px", marginBottom: 12 }}>
          {jobPaused && <div style={{ background: C.orange + "15", border: `1px solid ${C.orange}40`, borderRadius: 12, padding: "10px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.orange }}>⏸ Main job paused</span>
            <span onClick={() => { setJobPaused(false); tt("▶ Resumed") }} style={{ fontSize: 14, fontWeight: 600, color: C.accent, cursor: "pointer" }}>▶ Resume</span>
          </div>}
          <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4 }}>
            {pipeline.map((key, i) => { const s = ALL_STAGES[key]; const active = key === jobStage; const past = i < stageIdx; return <div key={key} style={{ flex: "0 0 auto", textAlign: "center", padding: "5px 8px", borderRadius: 10, background: active ? s.color + "15" : past ? C.green + "06" : "transparent", border: active ? `2px solid ${s.color}` : "1px solid transparent", minWidth: 52, opacity: past ? 0.7 : 1 }}>
              <div style={{ fontSize: 16 }}>{past ? "✓" : s.icon}</div>
              <div style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? s.color : past ? C.green : C.muted, marginTop: 1, whiteSpace: "nowrap" }}>{s.label}</div>
            </div> })}
          </div>
          {/* Next action */}
          {canAdvance() && <button onClick={() => { 
            if (jobStage === "qc" && !qcChecks["qc_passed"]) { tt("⚠️ Tick QC Checked first"); return }
            if (jobStage === "qc") {
              // After photos required
              if (!jobDocs.some(d => d.label === "After")) { tt("⚠️ Add After photos before marking ready"); return }
              // PQ approval check (insurance with replace parts)
              const hasReplace = estimates.flatMap(e => e.approved_entries || e.entries || []).some(e => e.category === "replace")
              if (isInsurance && hasReplace && pqStatus !== "approved") { tt("⚠️ Parts Quotation not yet approved by insurance"); return }
              // Workshop invoice check
              if (invoices.length === 0) { tt("⚠️ Create a workshop invoice first"); return }
              // Parts cost & supplier invoice check (insurance)
              if (isInsurance && hasReplace && partsQuotation.length > 0) {
                const unfilled = partsQuotation.filter(p => !p.suppliedBy)
                if (unfilled.length > 0) { tt(`⚠️ ${unfilled.length} part${unfilled.length > 1 ? "s" : ""} need supplier/insurance selection`); setPqTab("cost"); setShowPQScreen(true); return }
                const supplierParts = partsQuotation.filter(p => p.suppliedBy === "supplier")
                if (supplierParts.length > 0 && supplierInvoices.length === 0) { tt("⚠️ Attach supplier invoice photo"); setPqTab("cost"); setShowPQScreen(true); return }
              }
            }
            if (nextStage && jobStage === "paint_stage" && pendingParts.length > 0 && !showPaintWarn) { setShowPaintWarn(true); return }
            if (nextStage) { advanceStage(nextStage); setShowPaintWarn(false) }
          }} style={{ ...btn(stageInfo.color, "#fff"), marginTop: 10, padding: "14px 20px", fontSize: 16 }}>{showPaintWarn ? "⚠️ Continue Anyway" : getNextActionLabel()}</button>}
          {showPaintWarn && <div style={{ background: C.orange + "12", border: `1px solid ${C.orange}40`, borderRadius: 12, padding: "10px 14px", marginTop: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.orange, marginBottom: 4 }}>⚠️ {pendingParts.length} part{pendingParts.length > 1 ? "s" : ""} not yet arrived:</div>
            {pendingParts.map(p => <div key={p.id} style={{ fontSize: 13, color: C.sub, marginLeft: 8 }}>• {p.partName}</div>)}
            <div onClick={() => setShowPaintWarn(false)} style={{ fontSize: 13, color: C.muted, marginTop: 6, cursor: "pointer" }}>Cancel</div>
          </div>}
          {prevStage && jobStage !== "job_received" && <div onClick={goBackStage} style={{ fontSize: 14, color: C.muted, textAlign: "center", marginTop: 8, cursor: "pointer" }}>2190 Undo: back to {ALL_STAGES[prevStage].label}</div>}
          {jobPaused && <div style={{ fontSize: 14, color: C.orange, textAlign: "center", marginTop: 8, fontWeight: 500 }}>Resume to advance stages</div>}
        </div>}

        {/* ═══ QC CHECK ═══ */}
        {jobStage === "qc" && <div style={{ ...card, padding: "14px 16px", border: `2px solid ${qcChecks["qc_passed"] ? C.green : C.orange}40` }}>
          <div onClick={() => toggleQc("qc_passed")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: qcChecks["qc_passed"] ? C.green + "08" : C.bg, borderRadius: 12, cursor: "pointer", border: `2px solid ${qcChecks["qc_passed"] ? C.green + "40" : C.border}`, transition: "all 0.15s" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, border: `3px solid ${qcChecks["qc_passed"] ? C.green : C.muted}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: qcChecks["qc_passed"] ? C.green : "transparent", transition: "all 0.15s" }}>
              {qcChecks["qc_passed"] && <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: qcChecks["qc_passed"] ? C.green : C.text }}>QC Checked</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Quality inspection completed</div>
            </div>
          </div>
          {qcChecks["qc_passed"] && <div style={{ background: C.green + "10", borderRadius: 10, padding: "8px 12px", marginTop: 10, textAlign: "center", fontSize: 15, color: C.green, fontWeight: 600 }}>✓ QC passed -- ready to advance</div>}
        </div>}

        {/* ═══ FOLLOW UP ═══ */}
        {(jobStage === "follow_up" || jobStage === "closed") && <div style={{ ...card, padding: "14px 16px", border: `2px solid ${jobStage === "follow_up" ? C.orange : C.green}40` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>📞 Follow Up</span>
            {jobStage === "follow_up" && followUpAttempts > 0 && <span style={{ fontSize: 12, color: followUpAttempts >= 2 ? C.red : C.orange, fontWeight: 700 }}>Attempt {followUpAttempts + 1}/3</span>}
            {jobStage === "closed" && <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>✓ Closed</span>}
          </div>
          
          {jobStage === "follow_up" && <>
            <div style={{ fontSize: 14, color: C.sub, marginBottom: 10 }}>Call customer and record feedback before closing the job.</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <a href={`tel:${jobInfo.customer_phone}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", background: C.green + "10", borderRadius: 12, color: C.green, fontWeight: 600, fontSize: 15, textDecoration: "none", border: `1px solid ${C.green}30` }}>📞 Call {jobInfo.customer_name?.split(" ")[0] || "Customer"}</a>
              <a href={`https://wa.me/${(jobInfo.customer_phone || "").replace(/\D/g, "")}`} target="_blank" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", background: "#25d366" + "10", borderRadius: 12, color: "#25d366", fontWeight: 600, fontSize: 15, textDecoration: "none", border: "1px solid #25d36630" }}>💬 WhatsApp</a>
            </div>
          </>}

          {/* Attempt log */}
          {followUpLog.length > 0 && <div style={{ marginBottom: 10 }}>
            {followUpLog.map((entry, idx) => <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: idx < followUpLog.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap", marginTop: 1 }}>{new Date(entry.time).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {new Date(entry.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              <span style={{ fontSize: 13, color: entry.text.includes("No answer") ? C.orange : C.sub }}>{entry.text}</span>
            </div>)}
          </div>}

          <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Comment</div>
          <textarea value={followUpNote} onChange={e => setFollowUpNote(e.target.value)} readOnly={jobStage === "closed"} placeholder={jobStage === "follow_up" ? "e.g. Customer happy with work, no issues reported..." : "No comment recorded"} rows={3} style={{ ...inp, fontSize: 15, resize: "vertical", minHeight: 70, background: jobStage === "closed" ? C.bg : C.card, color: jobStage === "closed" ? C.sub : C.text }} />
          
          {jobStage === "follow_up" && <>
            <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
              {["No issues -- happy", "Minor concern noted", "Warranty callback needed"].map(q => <div key={q} onClick={() => setFollowUpNote(prev => prev ? prev + ". " + q : q)} style={{ padding: "6px 12px", borderRadius: 20, background: C.bg, border: `1px solid ${C.border}`, fontSize: 13, color: C.sub, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{q}</div>)}
            </div>
            
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {/* No Answer -- retry in 4h */}
              <button onClick={() => {
                const newAttempts = followUpAttempts + 1
                const now = new Date().toISOString()
                const logEntry = { text: `No answer -- attempt ${newAttempts}`, time: now }
                const newLog = [...followUpLog, logEntry]
                setFollowUpAttempts(newAttempts)
                setFollowUpLog(newLog)
                if (newAttempts >= 3) {
                  // 3rd no-answer -> auto-close
                  const closeNote = (followUpNote ? followUpNote + ". " : "") + "Auto-closed: 3 no-answer attempts"
                  setFollowUpNote(closeNote)
                  const closeLog = [...newLog, { text: "Auto-closed after 3 no-answer attempts", time: now }]
                  setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: "closed", onHold: false, holdUntil: null, followUpNote: closeNote, followUpAttempts: newAttempts, followUpLog: closeLog } : j))
                  setJobStage("closed")
                  tt("🏁 3 no-answers -- job auto-closed")
                  setActiveJobId(null); setScreen("home"); setHomeTab("closed")
                } else {
                  // Hold for 4 hours
                  const holdUntil = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
                  setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, onHold: true, holdUntil, followUpAttempts: newAttempts, followUpLog: newLog, followUpNote } : j))
                  tt(`📵 No answer (${newAttempts}/3) -- retry in 4 hours`)
                  setActiveJobId(null); setScreen("home"); setHomeTab("on_hold")
                }
              }} style={{ ...btn(C.orange + "15", C.orange), flex: 1, border: `1px solid ${C.orange}40`, fontSize: 15 }}>📵 No Answer {followUpAttempts > 0 ? `(${followUpAttempts}/3)` : ""}</button>
              
              {/* Close Job */}
              <button onClick={() => {
                if (!followUpNote.trim()) { tt("⚠️ Add a follow-up comment first"); return }
                const now = new Date().toISOString()
                const newLog = [...followUpLog, { text: followUpNote, time: now }]
                setFollowUpLog(newLog)
                setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: "closed", onHold: false, holdUntil: null, followUpNote, followUpAttempts, followUpLog: newLog } : j))
                setJobStage("closed")
                tt("🏁 Job closed")
                setActiveJobId(null); setScreen("home"); setHomeTab("closed")
              }} style={{ ...btn(C.green, "#fff"), flex: 1, fontSize: 15 }}>🏁 Close Job</button>
            </div>
          </>}
        </div>}

        {/* Vehicle & Customer */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Vehicle &amp; Customer</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Vehicle Reg</div><input value={jobInfo.vehicle_reg} onChange={e => setJobInfo({ ...jobInfo, vehicle_reg: e.target.value })} placeholder="CBB-9636" style={{ ...inp, fontFamily: MONO, fontWeight: 700, fontSize: 20 }} /></div>
            <div><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Customer</div><input value={jobInfo.customer_name} onChange={e => setJobInfo({ ...jobInfo, customer_name: e.target.value })} placeholder="Mr. Kasun" style={inp} /></div>
            <div style={{ position: "relative" }}><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Make</div>
              <input value={jobInfo.vehicle_make} onChange={e => { setJobInfo({ ...jobInfo, vehicle_make: e.target.value }); const q = e.target.value.toLowerCase(); setMakeSuggestions(q.length >= 1 ? VEHICLE_MAKES.filter(m => m.toLowerCase().includes(q)) : []) }} onFocus={() => { if (!jobInfo.vehicle_make) setMakeSuggestions(VEHICLE_MAKES) }} onBlur={() => setTimeout(() => setMakeSuggestions([]), 200)} placeholder="Toyota" style={inp} />
              {makeSuggestions.length > 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, zIndex: 20, maxHeight: 200, overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", marginTop: 4 }}>
                {makeSuggestions.map(m => <div key={m} onMouseDown={() => { setJobInfo(j => ({ ...j, vehicle_make: m })); setMakeSuggestions([]) }} style={{ padding: "14px 18px", fontSize: 17, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>{m}</div>)}
              </div>}
            </div>
            <div><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Model</div><input value={jobInfo.vehicle_model} onChange={e => setJobInfo({ ...jobInfo, vehicle_model: e.target.value })} placeholder="Aqua" style={inp} /></div>
            <div><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Phone</div><input value={jobInfo.customer_phone} onChange={e => setJobInfo({ ...jobInfo, customer_phone: e.target.value })} placeholder="077 331 3557" style={inp} /></div>
            <div style={{ position: "relative" }}><div style={{ fontSize: 14, color: C.sub, marginBottom: 5, fontWeight: 500 }}>Insurance</div>
              <div onClick={() => setShowInsDropdown(!showInsDropdown)} style={{ ...inp, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: jobInfo.insurance_name ? C.text : C.muted }}>{jobInfo.insurance_name || "No insurance (direct)"}</span>
                <span style={{ color: C.muted, fontSize: 18 }}>›</span>
              </div>
              {showInsDropdown && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, zIndex: 20, maxHeight: 240, overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", marginTop: 4 }}>
                <div onMouseDown={() => { setJobInfo(j => ({ ...j, insurance_name: "" })); setShowInsDropdown(false) }} style={{ padding: "14px 18px", fontSize: 17, cursor: "pointer", color: C.sub, borderBottom: `1px solid ${C.border}` }}>No insurance (direct)</div>
                {INSURANCE_COMPANIES.map(c => <div key={c} onMouseDown={() => { setJobInfo(j => ({ ...j, insurance_name: c })); setShowInsDropdown(false) }} style={{ padding: "14px 18px", fontSize: 17, cursor: "pointer", borderBottom: `1px solid ${C.border}`, fontWeight: jobInfo.insurance_name === c ? 600 : 400, color: jobInfo.insurance_name === c ? C.accent : C.text }}>{c}</div>)}
              </div>}
            </div>
          </div>
        </div>

        {/* Photos */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: jobDocs.length ? 14 : 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>📷 Photos ({jobDocs.length})</span>
            <div onClick={() => setShowUploadMenu("job")} style={{ fontSize: 17, fontWeight: 500, color: C.accent, cursor: "pointer" }}>+ Add</div>
          </div>
          {jobDocs.length > 0 && <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, alignItems: "flex-end" }}>
            {jobDocs.map((d, i) => {
              const tagColor = d.label === "Vehicle" ? C.accent : d.label === "Before" ? C.orange : d.label === "After" ? C.green : C.sub
              return <div key={d.id} style={{ flexShrink: 0, position: "relative" }}>
              <img src={d.dataUrl} onClick={() => setShowImage(d.id)} style={{ width: i === 0 ? 180 : 90, height: i === 0 ? 136 : 68, objectFit: "cover", borderRadius: i === 0 ? 14 : 12, cursor: "pointer", border: i === 0 ? `2px solid ${C.accent}30` : `2px solid ${tagColor}25` }} alt="" />
              <div style={{ position: "absolute", bottom: 4, left: 4, right: 4, background: tagColor + "dd", color: "#fff", fontSize: i === 0 ? 11 : 10, fontWeight: 600, borderRadius: 6, padding: "2px 6px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label || "General"}</div>
            </div>})}
          </div>}
          {/* QC After photos prompt */}
          {jobStage === "qc" && !jobDocs.some(d => d.label === "After") && <div style={{ background: C.orange + "08", border: `2px dashed ${C.orange}40`, borderRadius: 12, padding: "14px 16px", marginTop: 10, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.orange, marginBottom: 6 }}>📸 After photos required</div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>Take photos of completed work before marking ready</div>
            <div onClick={() => { setPhotoTag("After"); setShowUploadMenu("job") }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: C.green, color: "#fff", borderRadius: 12, cursor: "pointer", fontWeight: 600, fontSize: 15 }}>📷 Add After Photos</div>
          </div>}
          {!jobDocs.length && <div onClick={() => setShowUploadMenu("job")} style={{ padding: "24px 0", textAlign: "center", color: C.muted, cursor: "pointer" }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>📷</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Take a vehicle photo first</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>Helps identify the correct vehicle</div>
          </div>}
        </div>

        {/* ═══ MINOR JOB -- Direct Cost Entry + Close ═══ */}
        {isMinorJob && <div style={{ ...card, padding: "14px 16px", border: `2px solid ${C.orange}40` }}>
          {(() => {
            const materialItems = jobCosts.filter(c => c.type !== "labour")
            const confirmedCount = materialItems.filter(c => c.confirmed).length
            const allConfirmed = materialItems.length > 0 && confirmedCount === materialItems.length
            return <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>⚡ Quick Job -- Costs</span>
              {jobCosts.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: allConfirmed ? C.green : C.orange }}>{allConfirmed ? "✓ All confirmed" : `${confirmedCount}/${materialItems.length} materials confirmed`}</span>}
            </div>
          
            {jobCosts.length === 0 && <div style={{ padding: "20px 0", textAlign: "center", color: C.muted, fontSize: 15 }}>No costs added yet. Tap below to add parts, sundries, or labour.</div>}

            {jobCosts.map(item => <div key={item.id} style={{ padding: "10px 12px", background: item.type === "labour" ? C.accent + "04" : item.confirmed ? C.green + "06" : C.bg, borderRadius: 10, border: `1px solid ${item.type === "labour" ? C.accent + "20" : item.confirmed ? C.green + "30" : C.border}`, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <input value={item.name} placeholder="Item name..." onChange={e => setJobCosts(prev => prev.map(c => c.id === item.id ? { ...c, name: e.target.value } : c))} style={{ flex: 1, padding: "6px 10px", fontSize: 15, fontWeight: 600, background: item.name ? "transparent" : C.orange + "08", border: item.name ? "none" : `1px solid ${C.orange}40`, borderRadius: 8, color: C.text, fontFamily: FONT, outline: "none" }} />
                <span onClick={() => setJobCosts(prev => prev.filter(c => c.id !== item.id))} style={{ fontSize: 12, color: C.red, cursor: "pointer", marginLeft: 8, flexShrink: 0 }}>Remove</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                {["part", "sundry", "outsource", "labour"].map(t => <div key={t} onClick={() => setJobCosts(prev => prev.map(c => c.id === item.id ? { ...c, type: t, source: t === "labour" ? null : c.source, confirmed: t === "labour" ? false : c.confirmed } : c))} style={{ padding: "5px 10px", borderRadius: 16, fontSize: 12, fontWeight: item.type === t ? 700 : 500, background: item.type === t ? (t === "part" ? C.green : t === "sundry" ? C.purple : t === "outsource" ? C.orange : C.accent) + "15" : C.bg, color: item.type === t ? (t === "part" ? C.green : t === "sundry" ? C.purple : t === "outsource" ? C.orange : C.accent) : C.muted, border: `1px solid ${item.type === t ? "transparent" : C.border}`, cursor: "pointer" }}>{t === "part" ? "🔧 Part" : t === "sundry" ? "📎 Sundry" : t === "outsource" ? "📦 Outsource" : "👷 Labour"}</div>)}
              </div>
              {item.type !== "labour" ? <>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  {["purchased", "ex_stock"].map(s => <div key={s} onClick={() => setJobCosts(prev => prev.map(c => c.id === item.id ? { ...c, source: s } : c))} style={{ padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: item.source === s ? 700 : 500, background: item.source === s ? (s === "purchased" ? C.green : C.purple) + "15" : C.bg, color: item.source === s ? (s === "purchased" ? C.green : C.purple) : C.muted, border: `1px solid ${item.source === s ? "transparent" : C.border}`, cursor: "pointer" }}>{s === "purchased" ? "🛒 Purchased" : "📎 Ex-Stock"}</div>)}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: C.muted, flexShrink: 0 }}>Cost Rs.</span>
                  <input type="number" value={item.cost || ""} onChange={e => setJobCosts(prev => prev.map(c => c.id === item.id ? { ...c, cost: Number(e.target.value) || 0, confirmed: false } : c))} style={{ ...inp, flex: 1, fontSize: 17, fontFamily: MONO, padding: "10px 14px" }} placeholder="0" />
                  <div onClick={() => { if (!item.name.trim()) { tt("⚠️ Enter item name first"); return } setJobCosts(prev => prev.map(c => c.id === item.id ? { ...c, confirmed: !c.confirmed } : c)) }} style={{ padding: "8px 14px", borderRadius: 10, background: item.confirmed ? C.green : C.bg, color: item.confirmed ? "#fff" : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer", border: `1px solid ${item.confirmed ? C.green : C.border}`, flexShrink: 0 }}>{item.confirmed ? "✓" : "Confirm"}</div>
                </div>
              </> : <div style={{ fontSize: 13, color: C.accent, fontWeight: 500 }}>👷 No cost -- charge set freely on invoice</div>}
            </div>)}
          
            {/* Add item buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <div onClick={() => setJobCosts(prev => [...prev, { id: "jc" + Date.now(), name: "", type: "part", source: "purchased", cost: 0, confirmed: false }])} style={{ flex: 1, padding: "12px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.green, fontWeight: 600, fontSize: 14 }}>+ 🔧 Part</div>
              <div onClick={() => setJobCosts(prev => [...prev, { id: "jc" + Date.now(), name: "", type: "labour", source: null, cost: 0, confirmed: false }])} style={{ flex: 1, padding: "12px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.accent, fontWeight: 600, fontSize: 14 }}>+ 👷 Labour</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <div onClick={() => setJobCosts(prev => [...prev, { id: "jc" + Date.now(), name: "", type: "sundry", source: "ex_stock", cost: 0, confirmed: false }])} style={{ flex: 1, padding: "12px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.purple, fontWeight: 600, fontSize: 14 }}>+ 📎 Sundry</div>
              <div onClick={() => setJobCosts(prev => [...prev, { id: "jc" + Date.now(), name: "", type: "outsource", source: "purchased", cost: 0, confirmed: false }])} style={{ flex: 1, padding: "12px 0", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.orange, fontWeight: 600, fontSize: 14 }}>+ 📦 Outsource</div>
            </div>
          
            {/* Summary */}
            {jobCosts.length > 0 && <div style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.sub }}>
                <span>Material Cost</span>
                <span style={{ fontFamily: MONO, fontWeight: 700, color: C.text }}>Rs. {materialItems.reduce((s, c) => s + (c.cost || 0), 0).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginTop: 4 }}>
                <span>{materialItems.length} material{materialItems.length !== 1 ? "s" : ""} + {jobCosts.filter(c => c.type === "labour").length} labour</span>
              </div>
            </div>}

            {/* Create Invoice */}
            {!invoices.length && jobCosts.length > 0 && <button onClick={generateMinorInvoice} style={{ ...btn(allConfirmed ? C.accent : C.muted, "#fff"), marginTop: 10, fontSize: 16, opacity: allConfirmed ? 1 : 0.6 }}>📄 Create Invoice</button>}
            {invoices.length > 0 && <button onClick={() => { setSelInv(invoices[0]); setScreen("inv_detail") }} style={{ ...btn(C.accent + "15", C.accent), marginTop: 10, fontSize: 16 }}>📄 View Invoice</button>}
            {invoices.length > 0 && invoices[0].payments?.length > 0 && <button onClick={() => {
              setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, stage: "closed", onHold: false, jobCosts: [...jobCosts] } : j))
              tt("🏁 Quick job closed"); setActiveJobId(null); setScreen("home"); setHomeTab("closed")
            }} style={{ ...btn(C.green, "#fff"), marginTop: 8, fontSize: 16 }}>🏁 Close Job</button>}
          </>})()}
        </div>}

        {/* Parts Tracker */}
        {hasReplaceParts && <div style={{ ...card, padding: "14px 16px", border: allPartsArrived ? `2px solid ${C.green}30` : `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>📦 Parts Tracker</span>
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: allPartsArrived ? C.green : C.orange }}>{arrivedCount}/{replaceParts.length}</span>
          </div>
          {!partsOrdered ? <button onClick={() => { 
            if (isInsurance && pqStatus !== "approved") { 
              if (!confirm("⚠️ Parts prices not yet approved by insurance. Order anyway?")) return 
            }
            setPartsOrdered(true); tt("🛒 Parts ordered") 
          }} style={{ ...btnSm(C.purple, "#fff"), marginBottom: 10 }}>🛒 Mark Parts Ordered</button>
            : <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 10 }}>✓ Parts ordered</div>}
          {replaceParts.map(p => {
            const arrived = !!partsArrived[p.id]
            return <div key={p.id} onClick={() => setPartsArrived(prev => ({ ...prev, [p.id]: !prev[p.id] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${arrived ? C.green : C.border}`, background: arrived ? C.green + "12" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {arrived && <span style={{ color: C.green, fontSize: 16, fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: arrived ? 400 : 600, color: arrived ? C.sub : C.text, textDecoration: arrived ? "line-through" : "none" }}>{p.partName}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{p.estLabel}{p.remarks ? ` · ${p.remarks}` : ""}</div>
              </div>
              {arrived && <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>Arrived</span>}
            </div>
          })}
          {allPartsArrived && <div style={{ textAlign: "center", color: C.green, fontSize: 14, fontWeight: 600, marginTop: 10 }}>✓ All parts received</div>}
        </div>}

        {/* Parts Quotation (insurance) / PO (direct) */}
        {partsQuotation.length > 0 && <div style={{ ...card, padding: "14px 16px", border: `1px solid ${pqStatus === "approved" ? C.green : isInsurance ? C.purple : C.accent}30` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>{isInsurance ? "📄 Parts Quotation" : "📋 Purchase Order"}</span>
            <span style={pill(pqStatus === "approved" ? C.green : pqStatus === "submitted" ? C.orange : C.muted)}>{pqStatus === "approved" ? "✓ Approved" : pqStatus === "submitted" ? "Submitted" : "Draft"}</span>
          </div>
          {isInsurance && pqStatus === "draft" && !pqAllFilled && <div style={{ background: C.orange + "10", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 13, color: C.orange, fontWeight: 500 }}>⚠️ Fill supplier names & prices before submitting</div>}
          {isInsurance && pqStatus === "submitted" && <div style={{ background: C.orange + "10", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 13, color: C.orange, fontWeight: 500 }}>⏳ Awaiting insurance price approval</div>}
          {partsQuotation.slice(0, 3).map(p => <div key={p.id} style={{ fontSize: 15, color: C.sub, padding: "4px 0", display: "flex", justifyContent: "space-between" }}>
            <span>{p.partName} <span style={{ fontSize: 12, color: C.muted }}>({p.remarks})</span></span>
            {isInsurance && <span style={{ fontFamily: MONO, fontSize: 14, color: pqStatus === "approved" ? C.green : p.quotedPrice ? C.text : C.muted }}>{pqStatus === "approved" ? `Rs.${(pqLumpMode ? "--" : (p.approvedPrice?.toLocaleString() || "--"))}` : (p.quotedPrice ? `Rs.${p.quotedPrice.toLocaleString()}` : "--")}</span>}
          </div>)}
          {partsQuotation.length > 3 && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>+{partsQuotation.length - 3} more</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => { setShowPQScreen(true); setPqTab(pqStatus === "submitted" || pqStatus === "approved" ? "approve" : "quote") }} style={{ ...btnSm(isInsurance ? C.purple : C.accent, "#fff"), flex: 1 }}>{pqStatus === "approved" ? "View" : isInsurance ? (pqStatus === "submitted" ? "Record Approval" : "Edit Prices") : "View PO"}</button>
            {isInsurance && pqStatus === "approved" && <button onClick={() => { setShowPQScreen(true); setPqTab("cost") }} style={{ ...btnSm(C.accent + "12", C.accent), flex: 1 }}>💰 Costs</button>}
            <button onClick={() => sharePQ("whatsapp")} style={{ ...btnSm(C.green + "12", C.green), flex: 1 }}>WhatsApp</button>
            <button onClick={() => sharePQ("copy")} style={{ ...btnSm(C.bg, C.sub), flex: 0 }}>📋</button>
          </div>
          {pqStatus === "approved" && (() => {
            const filled = partsQuotation.filter(p => p.suppliedBy)
            const supplierP = partsQuotation.filter(p => p.suppliedBy === "supplier" && p.actualCost > 0)
            const totalMargin = supplierP.reduce((s, p) => s + ((p.approvedPrice || 0) - (p.actualCost || 0)), 0)
            return <div style={{ marginTop: 8, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: C.green, fontWeight: 600 }}>✓ Approved -- Rs.{pqApprovedTotal.toLocaleString()}{pqApprovalPhoto ? " · 📷" : ""}</div>
              {filled.length === partsQuotation.length && supplierP.length > 0 && <div style={{ fontSize: 13, color: totalMargin > 0 ? C.green : C.red, fontWeight: 600, marginTop: 2 }}>Parts margin: Rs.{totalMargin.toLocaleString()}</div>}
              {filled.length < partsQuotation.length && <div style={{ fontSize: 13, color: C.orange, marginTop: 2 }}>⚠️ {partsQuotation.length - filled.length} parts need cost info</div>}
              {supplierP.length > 0 && supplierInvoices.length === 0 && <div style={{ fontSize: 13, color: C.orange, marginTop: 2 }}>⚠️ No supplier invoice attached</div>}
            </div>
          })()}
        </div>}

        {/* Customer Confirmation (direct jobs) */}
        {isDirectJob && estimates.length > 0 && !customerConfirmed && <div style={{ ...card, padding: "14px 16px", border: `2px dashed ${C.orange}40`, background: C.orange + "04" }}>
          <div style={{ fontSize: 15, color: C.sub, marginBottom: 8 }}>Customer hasn't confirmed yet. Share quotation then mark confirmed to create PO.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => sharePQ("whatsapp")} style={{ ...btnSm(C.green + "12", C.green), flex: 1 }}>📱 Send Quotation</button>
            <button onClick={confirmCustomer} style={{ ...btnSm(C.accent, "#fff"), flex: 1 }}>✓ Customer Confirmed</button>
          </div>
        </div>}
        {isDirectJob && customerConfirmed && <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 8 }}>✓ Customer confirmed</div>}

        {/* Estimates */}
        {!isMinorJob && <>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 8 }}>Estimates</div>
        {estimates.filter(e => e.status !== "archived").map(est => (
          <div key={est.id} style={{ ...card, position: "relative", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO }}>{est.number}</span>
                  <span style={pill(est.status === "approved" ? C.green : C.orange)}>{est.status}</span>
                </div>
                <div style={{ fontSize: 16, color: C.sub }}>{est.label} · {est.entries.length} items{(est.sundries || []).length > 0 ? ` + ${est.sundries.length} sundries` : ""}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                  <span onClick={() => { setSelEst(est); setEstParts([...est.parts]); setEstEntries([...est.entries]); setSundryItems([...(est.sundries || [])]); setActiveCat(0); setScreen("est_review") }} style={{ fontSize: 16, fontWeight: 500, color: C.accent, cursor: "pointer" }}>View -></span>
                  {est.status === "draft" && isInsurance && <span onClick={() => startApproval(est)} style={{ fontSize: 16, fontWeight: 500, color: C.green, cursor: "pointer" }}>Approve -></span>}
                  <span onClick={() => generateEstimatePDF(est)} style={{ fontSize: 15, fontWeight: 500, color: C.purple, cursor: "pointer" }}>📄 PDF</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>{(est.status === "approved" ? est.approved_total : est.total).toLocaleString()}</div>
                <span onClick={(e) => { e.stopPropagation(); deleteEstimate(est.id) }} style={{ fontSize: confirmDelEst === est.id ? 13 : 22, color: C.red, cursor: "pointer", opacity: confirmDelEst === est.id ? 1 : 0.35, background: confirmDelEst === est.id ? C.red + "15" : "none", padding: confirmDelEst === est.id ? "4px 12px" : "4px", borderRadius: 8, fontWeight: confirmDelEst === est.id ? 700 : 400, lineHeight: 1 }}>{confirmDelEst === est.id ? (est.status === "approved" ? "Archive?" : "Delete?") : "×"}</span>
              </div>
            </div>
          </div>
        ))}
        {estimates.some(e => e.status === "archived") && <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 8, cursor: "pointer" }} onClick={() => setShowArchived(!showArchived)}>{showArchived ? "▲ Hide" : "▼ Show"} {estimates.filter(e => e.status === "archived").length} archived</div>}
        {showArchived && estimates.filter(e => e.status === "archived").map(est => (
          <div key={est.id} style={{ ...card, opacity: 0.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, fontFamily: MONO }}>{est.number}</span>
                <span style={pill(C.sub)}>archived</span>
              </div>
              <div style={{ fontSize: 14, color: C.muted }}>{est.label} · Rs.{(est.approved_total || est.total).toLocaleString()}</div>
            </div>
            <span onClick={() => { setEstimates(prev => prev.map(e => e.id === est.id ? { ...e, status: "approved" } : e)); tt("Restored") }} style={{ fontSize: 14, color: C.accent, cursor: "pointer", fontWeight: 500 }}>Restore</span>
          </div>
        ))}

        <button onClick={() => { setSelEst(null); setEstParts([]); setEstEntries([]); setSundryItems([]); setSundryInput(""); setActiveCat(0); setScreen("est_parts") }} style={{ ...btn(C.card, C.accent), border: `2px dashed ${C.border}`, marginBottom: 16, background: C.card }}>
          + {estimates.length === 0 ? (isDirectJob ? "Create Quotation" : "Create Estimate") : "Add Supplementary"}
        </button>

        {estimates.some(e => e.status === "approved") && !invoices.length && <button onClick={generateInvoice} style={{ ...btn(C.accent, "#fff"), marginBottom: 12 }}>Generate Invoice ({estimates.filter(e => e.status === "approved").length} approved)</button>}
        </>}

        {/* Invoices -- visible for all job types */}
        {invoices.map(inv => { const st = INV_STATUS[inv.status]; return <div key={inv.id} onClick={() => { setSelInv(inv); setScreen("inv_detail") }} style={{ ...card, cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO }}>{inv.invoice_number}</span><span style={pill(st.c)}>{st.l}</span></div><span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>Rs.{fmt(invTotal(inv))}</span></div>{isDirectJob ? <div style={{ fontSize: 14, color: C.sub, marginTop: 6 }}>Balance: Rs.{fmt(invCustBalance(inv))}</div> : invInsTotal(inv) > 0 && <div style={{ fontSize: 14, color: C.sub, marginTop: 6 }}>Ins: Rs.{fmt(invInsTotal(inv))} {invInsPayments(inv).some(p => p.ins_status !== "received") ? "⏳" : "✓"} · Cust bal: Rs.{fmt(invCustBalance(inv))}</div>}</div> })}

        {/* On Hold / Reactivate / Delete */}
        <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          {activeJob?.onHold
            ? <button onClick={toggleHold} style={{ ...btn(C.green + "12", C.green) }}>▶ Reactivate Job</button>
            : <button onClick={toggleHold} style={{ ...btn(C.bg, C.orange), border: `1px solid ${C.orange}30` }}>📌 Put On Hold</button>}
          {estimates.length === 0 && <button onClick={deleteJob} style={{ ...btn(confirmDelJob ? C.red : "transparent", confirmDelJob ? "#fff" : C.red), marginTop: 8, fontSize: 15, padding: "12px 20px", border: confirmDelJob ? "none" : `1px solid ${C.red}30` }}>{confirmDelJob ? "Tap again to confirm delete" : "🗑 Delete Job"}</button>}
        </div>
      </>}

      {/* ══════ PARTS ══════ */}
      {screen === "est_parts" && <>
        <NavBar title={selEst ? "Edit Parts" : "Add Parts"} subtitle={selEst ? `${selEst.number} · ${estParts.length} parts` : "Enter part names -- prices come next"} onBack={() => { if (selEst) setScreen("est_review"); else setScreen("job") }} />
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
        {estParts.length > 0 && <button onClick={() => { setActiveCat(0); setScreen("est_cat") }} style={{ ...btn(C.accent, "#fff"), marginTop: 10 }}>Next -> {jobCats[0].icon} {jobCats[0].label}</button>}
        {selEst && estParts.length > 0 && <button onClick={() => setScreen("est_review")} style={{ ...btn(C.bg, C.accent), marginTop: 8 }}>2190 Back to Review</button>}
      </>}

      {/* ══════ CATEGORY ══════ */}
      {screen === "est_cat" && <>
        <NavBar title={`${cat.icon} ${cat.label}`} subtitle="Check, rate, enter, next" onBack={() => { if (activeCat === 0) { if (selEst) setScreen("est_review"); else setScreen("est_parts") } else setActiveCat(activeCat - 1) }} />
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
            <div onClick={() => toggleCheck(p)} style={{ width: 32, height: 32, borderRadius: 10, border: `2px solid ${checked ? cat.color : C.border}`, background: checked ? cat.color + "12" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              {checked && <span style={{ color: cat.color, fontSize: 18, fontWeight: 700 }}>✓</span>}
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
          {activeCat < jobCats.length - 1 ? <button onClick={() => setActiveCat(activeCat + 1)} style={{ ...btn(jobCats[activeCat + 1].color, "#fff") }}>Next -> {jobCats[activeCat + 1].icon} {jobCats[activeCat + 1].label}</button>
            : <button onClick={() => setScreen("est_review")} style={{ ...btn(C.accent, "#fff") }}>Review Estimate</button>}
        </div>
      </>}

      {/* ══════ REVIEW ══════ */}
      {screen === "est_review" && <>
        <NavBar title={selEst ? `${selEst.number}` : "Review"} subtitle={`${estParts.length} parts · ${estEntries.length} entries${sundryItems.length ? ` + ${sundryItems.length} sundries` : ""}`} onBack={() => { if (selEst && estimates.find(e => e.id === selEst.id)) { setSelEst(null); setScreen("job") } else { setActiveCat(0); setScreen("est_cat") } }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          {jobCats.map((c, i) => { const ct = catTotal(c.key); const entries = estEntries.filter(e => e.category === c.key); const hasRemarks = entries.filter(e => !e.rate && e.remarks); const hasEntries = entries.length > 0; return <div key={c.key} onClick={() => { setActiveCat(i); setScreen("est_cat") }} style={{ ...card, textAlign: "center", padding: "12px 4px", marginBottom: 0, cursor: "pointer", border: (ct > 0 || hasEntries) ? `2px solid ${c.color}20` : `1px solid ${C.border}` }}>
            <div style={{ fontSize: 22 }}>{c.icon}</div>
            {ct > 0 ? <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: c.color, marginTop: 4 }}>{ct.toLocaleString()}</div>
              : hasRemarks.length > 0 ? <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginTop: 4 }}>{hasRemarks.map(e => e.remarks).join(", ")}</div>
                : <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: c.color, marginTop: 4 }}>0</div>}
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, marginTop: 2 }}>{c.short}</div>
            <div style={{ fontSize: 10, color: C.accent, marginTop: 4 }}>tap to edit</div>
          </div> })}
        </div>
        <div style={{ ...card, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16 }}>
            <thead><tr style={{ borderBottom: `2px solid ${C.border}` }}><th style={{ textAlign: "left", padding: "10px 6px", color: C.sub, fontSize: 14 }}>Part</th>{jobCats.map(c => <th key={c.key} style={{ textAlign: "right", padding: "10px 6px", color: c.color, fontSize: 15 }}>{c.icon}</th>)}</tr></thead>
            <tbody>
              {estParts.map(p => <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: "8px 6px", fontSize: 16 }}>{p.name}</td>{jobCats.map(c => { const e = getEntry(p.id, c.key); return <td key={c.key} style={{ textAlign: "right", padding: "8px 6px", fontFamily: MONO, fontSize: 15, color: e ? (e.rate > 0 ? c.color : (e.remarks ? C.accent : C.muted)) : C.muted, fontWeight: e && e.remarks && !e.rate ? 600 : 400 }}>{e ? (e.rate > 0 ? e.rate.toLocaleString() : (e.remarks || "0")) : "--"}</td> })}</tr>)}
              <tr style={{ borderTop: `2px solid ${C.border}` }}><td style={{ padding: "10px 6px", fontWeight: 700, color: C.sub, fontSize: 14 }}>TOTAL</td>{jobCats.map(c => <td key={c.key} style={{ textAlign: "right", padding: "10px 6px", fontFamily: MONO, fontWeight: 700, fontSize: 16, color: c.color }}>{catTotal(c.key).toLocaleString()}</td>)}</tr>
            </tbody>
          </table>
        </div>

        {/* Sundries */}
        <div style={{ ...card, padding: "14px 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.sub, marginBottom: 10 }}>🧴 OTHER ITEMS / SUNDRIES</div>
          <div style={{ display: "flex", gap: 8, marginBottom: sundryItems.length ? 10 : 0 }}>
            <input value={sundryInput} onChange={e => setSundryInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && sundryInput.trim()) { setSundryItems(p => [...p, { id: "sun_" + Date.now(), name: sundryInput.trim(), rate: 0, qty: 1, remarks: "" }]); setSundryInput("") } }} placeholder="Type item name..." style={{ ...inp, flex: 1, padding: "12px 14px" }} />
            {sundryInput.trim() && <button onClick={() => { setSundryItems(p => [...p, { id: "sun_" + Date.now(), name: sundryInput.trim(), rate: 0, qty: 1, remarks: "" }]); setSundryInput("") }} style={{ ...btnSm(C.accent, "#fff"), width: "auto", padding: "10px 16px" }}>Add</button>}
          </div>
          {sundryItems.map(si => <div key={si.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <input value={si.name} onChange={e => setSundryItems(p => p.map(x => x.id === si.id ? { ...x, name: e.target.value } : x))} style={{ flex: 1, padding: "8px 10px", background: C.bg, border: "none", borderRadius: 8, color: C.text, fontSize: 16, fontFamily: FONT, outline: "none" }} />
            {si.remarks === "M/R" ? <span onClick={() => setSundryItems(p => p.map(x => x.id === si.id ? { ...x, remarks: "", rate: 0 } : x))} style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.accent, background: C.accent + "12", padding: "4px 12px", borderRadius: 8, cursor: "pointer" }}>M/R</span>
              : <><input type="number" value={si.rate || ""} onChange={e => setSundryItems(p => p.map(x => x.id === si.id ? { ...x, rate: Number(e.target.value) || 0 } : x))} placeholder="0" style={{ width: 80, padding: "8px 10px", background: C.bg, border: "none", borderRadius: 8, color: C.text, fontSize: 16, fontFamily: MONO, fontWeight: 700, textAlign: "right", outline: "none" }} />
                <span onClick={() => setSundryItems(p => p.map(x => x.id === si.id ? { ...x, remarks: "M/R", rate: 0 } : x))} style={{ fontSize: 12, color: C.accent, cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: C.accent + "12", fontWeight: 700, flexShrink: 0 }}>M/R</span></>}
            <span onClick={() => setSundryItems(p => p.filter(x => x.id !== si.id))} style={{ color: C.red, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</span>
          </div>)}
        </div>

        {/* Grand Total */}
        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20 }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 700 }}>Grand Total</span>
            {sundryTotal > 0 && <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>Parts & Labour: {(grandTotal - sundryTotal).toLocaleString()} + Sundries: {sundryTotal.toLocaleString()}</div>}
          </div>
          <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700 }}>Rs. {fmt(grandTotal)}</span>
        </div>
        <button onClick={() => { setSelEst(null); setEstParts([]); setEstEntries([]); setScreen("est_parts") }} style={{ ...btn(C.bg, C.accent), marginBottom: 8 }}>✏️ Edit Parts List</button>
        <button onClick={saveEstimate} style={{ ...btn(C.accent, "#fff"), marginTop: 4 }}>{selEst ? "Update Estimate" : "Save Estimate"}</button>
      </>}

      {/* ══════ APPROVAL HOME ══════ */}
      {screen === "approve" && selEst && <>
        <NavBar title="Assessor Approval" subtitle={`${selEst.number} · ${selEst.type === "supplementary" ? selEst.label : "Estimate"} · Rs.${fmt(selEst.total)}`} onBack={() => setScreen("job")} />
        {(() => { const estDocs = jobDocs.filter(d => d.estId === selEst.id); return <>
          <div onClick={() => setShowUploadMenu("approval")} style={{ ...card, cursor: "pointer", border: `2px ${estDocs.length > 0 ? "solid " + C.green + "30" : "dashed " + C.orange + "50"}`, textAlign: estDocs.length ? "left" : "center", padding: estDocs.length ? 18 : 32 }}>
            {estDocs.length > 0 ? <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: C.green }}>✓ {estDocs.length} photo{estDocs.length > 1 ? "s" : ""} · {selEst.type === "supplementary" ? selEst.label : "Estimate"}</span>
                <span style={{ fontSize: 17, color: C.accent, fontWeight: 500 }}>+ Add</span>
              </div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>{estDocs.map(d => <img key={d.id} src={d.dataUrl} onClick={e => { e.stopPropagation(); setShowImage(d.id) }} style={{ width: 90, height: 68, objectFit: "cover", borderRadius: 12, flexShrink: 0 }} alt="" />)}</div>
            </> : <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Approved Copy</div>
              <div style={{ fontSize: 16, color: C.sub, marginTop: 4 }}>{selEst.type === "supplementary" ? selEst.label : "Estimate"}</div>
              <div style={{ fontSize: 16, color: C.red, marginTop: 6, fontWeight: 500 }}>Required before entering prices</div>
            </>}
          </div>
          {estDocs.length > 0 ? <>
            <button onClick={() => { setApprovalCat(0); setScreen("approve_entry") }} style={{ ...btn(C.accent, "#fff"), marginBottom: 10 }}>Enter Approved Prices</button>
            <button onClick={() => { approvalItems.forEach(i => { if (i.approved_rate === null && i.approval_status !== "use_same") approveAsIs(i.id) }); setScreen("approve_summary") }} style={{ ...btn(C.green + "12", C.green) }}>Approve All As-Is</button>
          </> : <div style={{ ...card, textAlign: "center", opacity: 0.35, padding: 22 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.sub }}>Enter Approved Prices</div>
            <div style={{ fontSize: 16, color: C.sub, marginTop: 6 }}>Upload the approved copy first</div>
          </div>}
        </> })()}
      </>}

      {/* ══════ APPROVAL ENTRY ══════ */}
      {screen === "approve_entry" && <>
        <NavBar title={`${aCat.icon} ${aCat.label}`} subtitle="Your price vs Approved price" onBack={() => setScreen("approve")} />
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.card, borderRadius: 14, padding: 5, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {jobCats.map((c, i) => { const ci = approvalItems.filter(x => x.category === c.key); const done = ci.filter(x => x.approved_rate !== null || x.approval_status === "use_same").length; return ci.length ? <div key={c.key} onClick={() => setApprovalCat(i)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, cursor: "pointer", background: i === approvalCat ? c.color + "12" : "transparent" }}>
            <div style={{ fontSize: 22 }}>{c.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: i === approvalCat ? c.color : C.muted }}>{done}/{ci.length}</div>
          </div> : null })}
        </div>
        {approvalItems.filter(i => i.category === aCat.key).some(i => i.approved_rate === null && i.approval_status !== "use_same") && <button onClick={approveAllCatAsIs} style={{ ...btn(C.green + "12", C.green), marginBottom: 12 }}>✓ Approve all {aCat.label} as-is</button>}
        {approvalItems.filter(i => i.category === aCat.key).map(item => { const isUS = item.approval_status === "use_same"; const done = item.approved_rate !== null || isUS; const wasCut = done && !isUS && item.approved_rate < item.original_rate;
          return <div key={item.id} style={{ ...card, padding: "14px 16px", marginBottom: 6, borderLeft: `4px solid ${isUS ? C.accent : done ? (wasCut ? C.red : C.green) : "transparent"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 500 }}>{item.part_name}</span>
              <span style={{ fontFamily: MONO, fontSize: 17, color: C.sub, textDecoration: wasCut || isUS ? "line-through" : "none" }}>Rs.{item.original_rate.toLocaleString()}</span>
            </div>
            {isUS ? <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.accent, background: C.accent + "12", padding: "6px 14px", borderRadius: 10 }}>U/S -- Use Same</span>
              <span onClick={() => { setApprovalItems(prev => prev.map(i => i.id === item.id ? { ...i, approved_rate: null, approval_status: "pending", remarks: item.category === "replace" ? "S/H" : "" } : i)) }} style={{ fontSize: 14, color: C.muted, cursor: "pointer" }}>Undo</span>
            </div> : <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, color: C.sub, width: 70 }}>Approved</span>
                <input ref={el => approvalRefs.current[item.id] = el} type="number" value={item.approved_rate === null ? "" : item.approved_rate} onChange={e => setApproved(item.id, e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleApprovalEnter(item.id) } }} placeholder={item.original_rate.toString()} style={{ flex: 1, padding: "12px 14px", background: C.bg, border: `2px solid ${done ? (wasCut ? C.red + "40" : C.green + "40") : C.border}`, borderRadius: 12, color: wasCut ? C.red : C.text, fontSize: 22, fontFamily: MONO, fontWeight: 700, textAlign: "right", outline: "none" }} />
                <button onClick={() => approveAsIs(item.id)} style={{ padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer", background: done && !wasCut ? C.green + "12" : C.bg, color: done && !wasCut ? C.green : C.muted, fontWeight: 700, fontSize: 18 }}>✓</button>
              </div>
              {item.category === "replace" && <button onClick={() => markUseSame(item.id)} style={{ marginTop: 8, padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.accent}30`, background: C.accent + "06", color: C.accent, fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%" }}>U/S -- Use Same Part</button>}
              {wasCut && <div style={{ fontSize: 15, color: C.red, marginTop: 6, fontWeight: 500 }}>Cut Rs.{(item.original_rate - item.approved_rate).toLocaleString()} ({Math.round(((item.original_rate - item.approved_rate) / item.original_rate) * 100)}%)</div>}
            </>}
          </div>
        })}
        <div style={{ marginTop: 16 }}>
          {approvalCat < 3 && approvalItems.some(i => i.category === CATS[approvalCat + 1]?.key) ? <button onClick={() => setApprovalCat(approvalCat + 1)} style={{ ...btn(CATS[approvalCat + 1].color, "#fff") }}>Next -> {CATS[approvalCat + 1].icon} {CATS[approvalCat + 1].label}</button>
            : <button onClick={() => setScreen("approve_summary")} style={{ ...btn(C.accent, "#fff") }}>View Summary</button>}
        </div>
        <div style={{ position: "fixed", bottom: 0, left: isTablet ? 380 : 0, right: 0, background: C.card, borderTop: `1px solid ${C.border}`, padding: "14px 24px", maxWidth: isTablet ? undefined : 480, margin: isTablet ? undefined : "0 auto", zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, color: C.sub }}>{aEntCnt}/{approvalItems.length}</span>
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700 }}>Approved: Rs.{fmt(aApprT)}</span>
        </div>
      </>}

      {/* ══════ APPROVAL SUMMARY ══════ */}
      {screen === "approve_summary" && <>
        <NavBar title="Summary" onBack={() => setScreen("approve_entry")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ ...card, textAlign: "center", marginBottom: 0, padding: 16 }}><div style={{ fontSize: 14, color: C.sub, marginBottom: 4 }}>Your Estimate</div><div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700 }}>Rs.{aOrigT.toLocaleString()}</div></div>
          <div style={{ ...card, textAlign: "center", marginBottom: 0, padding: 16, border: `2px solid ${aApprT < aOrigT ? C.red + "30" : C.green + "30"}` }}><div style={{ fontSize: 14, color: C.sub, marginBottom: 4 }}>Approved</div><div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: aApprT < aOrigT ? C.red : C.green }}>Rs.{aApprT.toLocaleString()}</div></div>
        </div>
        {aApprT < aOrigT && <div style={{ ...card, textAlign: "center", background: C.red + "06" }}><div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.red }}>-Rs.{(aOrigT - aApprT).toLocaleString()}</div><div style={{ fontSize: 16, color: C.red, marginTop: 2 }}>{Math.round(((aOrigT - aApprT) / aOrigT) * 100)}% cut</div></div>}
        {approvalItems.filter(i => i.approval_status === "use_same").length > 0 && <>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.accent, marginBottom: 6, marginTop: 8 }}>U/S -- USE SAME</div>
          {approvalItems.filter(i => i.approval_status === "use_same").map(item => (<div key={item.id} style={{ ...card, padding: "12px 16px", marginBottom: 6, borderLeft: `4px solid ${C.accent}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><span style={{ fontSize: 17 }}>{item.part_name}</span> <span style={{ fontSize: 14, color: C.sub }}>(Replace)</span></div><span style={{ fontWeight: 700, color: C.accent, fontSize: 15 }}>Use Same</span></div>))}
        </>}
        {approvalItems.filter(i => i.approval_status !== "use_same" && i.approved_rate !== null && i.approved_rate < i.original_rate).length > 0 && <>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.red, marginBottom: 6, marginTop: 8 }}>CUTS</div>
          {approvalItems.filter(i => i.approval_status !== "use_same" && i.approved_rate !== null && i.approved_rate < i.original_rate).map(item => (<div key={item.id} style={{ ...card, padding: "12px 16px", marginBottom: 6, borderLeft: `4px solid ${C.red}30`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><span style={{ fontSize: 17 }}>{item.part_name}</span> <span style={{ fontSize: 14, color: C.sub }}>({CATS_ALL.find(c => c.key === item.category)?.short})</span></div><div><span style={{ fontFamily: MONO, color: C.muted, textDecoration: "line-through", marginRight: 8, fontSize: 15 }}>{item.original_rate.toLocaleString()}</span><span style={{ fontFamily: MONO, fontWeight: 700, color: C.red, fontSize: 17 }}>{item.approved_rate?.toLocaleString()}</span></div></div>))}
        </>}
        <button onClick={finalizeApproval} style={{ ...btn(C.accent, "#fff"), marginTop: 14 }}>Confirm Approved Prices</button>
      </>}

      {/* ══════ INVOICE ══════ */}
      {screen === "inv_detail" && selInv && <>
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
                <input type="number" value={discount || ""} onChange={e => setDiscount(Number(e.target.value) || 0)} placeholder="0" style={{ flex: 1, padding: "8px 10px", background: C.bg, border: `2px solid ${C.orange}`, borderRadius: 8, color: C.text, fontSize: 18, fontFamily: MONO, fontWeight: 700, textAlign: "right", outline: "none" }} onKeyDown={e => { if (e.key === "Enter") { const d = Number(discount) || 0; setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, discount: d } : inv)); setSelInv(prev => ({ ...prev, discount: d })); setShowDiscountInput(false); tt(d > 0 ? `Discount Rs.${fmt(d)}` : "Removed") } }} />
                <button onClick={() => { const d = Number(discount) || 0; setInvoices(p => p.map(inv => inv.id === selInv.id ? { ...inv, discount: d } : inv)); setSelInv(prev => ({ ...prev, discount: d })); setShowDiscountInput(false); tt(d > 0 ? `Discount Rs.${fmt(d)}` : "Removed") }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: C.orange, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>✓</button>
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
                  {p.ins_status === "recorded" && <button onClick={() => updateInsStatus(p.id, "pending")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: C.accent + "15", color: C.accent, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>-> Mark Pending</button>}
                  {p.ins_status === "pending" && <button onClick={() => updateInsStatus(p.id, "received")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: C.green + "15", color: C.green, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>✓ Received</button>}
                  {p.ins_status === "received" && <span style={{ fontSize: 13, color: C.green }}>✓ Money received</span>}
                </div>
              </div>
            </div> })}
          {invInsPayments(selInv).length === 0 && <div style={{ ...card, textAlign: "center", color: C.sub, fontSize: 14, padding: 16 }}>No insurance payment recorded</div>}
          <button onClick={() => { setPayType("insurance"); setPayAmount(""); setPayRef(""); setInsPayPhoto(null); setShowPayForm(true) }} style={{ ...btn(C.accent + "15", C.accent), marginTop: 4, fontSize: 14, border: `1px solid ${C.accent}30` }}>+ Record Insurance Payment</button>
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
          {selInv.status !== "draft" && <button onClick={() => setInvStatus("draft")} style={{ ...btn(C.bg, C.accent) }}>Edit Invoice</button>}
        </div>

        {/* Payment Form */}
        <input ref={insPhotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) { const r = new FileReader(); r.onload = () => setInsPayPhoto(r.result); r.readAsDataURL(e.target.files[0]) }; e.target.value = "" }} />
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
      </>}

      <style>{`input[type=number]::-webkit-inner-spin-button{opacity:1}input[type=number]{-moz-appearance:textfield}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}`}</style>
    </div>
    </div>
  )
}
