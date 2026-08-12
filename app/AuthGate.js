"use client"
import { useState, useEffect, createContext, useContext } from "react"
import { supabase } from "./supabase"

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"

// Brand mark — wrench in a blue rounded square (no emoji)
const LogoMark = ({ size = 56 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: "linear-gradient(135deg, #007AFF, #0a5fd4)", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,122,255,0.35)" }}>
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  </div>
)

// ═══ ROLE DEFINITIONS ═══
// super_admin: full access + user management
// admin: full access to jobs, estimates, invoices
// staff: can view/edit jobs, create estimates, but no delete or settings
// viewer: read-only access
const ROLE_HIERARCHY = ["viewer", "staff", "admin", "super_admin"]

// Hardcoded super admin — always has access even if DB is empty
const SUPER_ADMIN_EMAIL = "smgiroshana@gmail.com"

// ═══ AUTH CONTEXT ═══
const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    // Fallback for components that call useAuth outside AuthGate
    const [session, setSession] = useState(null)
    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
      return () => subscription.unsubscribe()
    }, [])
    const signOut = () => supabase.auth.signOut()
    return { session, signOut, user: session?.user, role: null, isSuperAdmin: false, isAdmin: false, isStaff: false, hasRole: () => false }
  }
  return ctx
}

// ═══ ROLE HELPERS ═══
function roleLevel(role) {
  const idx = ROLE_HIERARCHY.indexOf(role)
  return idx === -1 ? -1 : idx
}

// ═══ ENSURE user_roles TABLE EXISTS ═══
async function ensureRolesTable() {
  // Try to query the table — if it doesn't exist, create it
  const { error } = await supabase.from("user_roles").select("id").limit(1)
  if (error && error.code === "42P01") {
    // Table doesn't exist — we can't create it with anon key
    // User needs to create it in Supabase dashboard
    console.warn("user_roles table not found. Using hardcoded super admin only.")
    return false
  }
  return !error
}

// ═══ GET USER ROLE ═══
async function getUserRole(email) {
  // Super admin always works
  if (email === SUPER_ADMIN_EMAIL) return "super_admin"

  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role, is_active")
      .eq("email", email)
      .single()

    if (error || !data) return null // No role assigned
    if (!data.is_active) return "disabled" // Account disabled
    return data.role
  } catch {
    return null
  }
}

// ═══ AUTH GATE COMPONENT ═══
export default function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [tableExists, setTableExists] = useState(true)

  useEffect(() => {
    let resolved = false
    // settle() always applies the latest session — auth events after first
    // resolution (sign-out, token refresh failure, late arrival on a slow
    // connection) must keep updating state, not be ignored.
    const settle = (s) => { setSession(s || null); if (!resolved) { resolved = true; setLoading(false) } }
    // Hard timeout only ends the loading spinner — it must NOT discard a real
    // session that arrives moments later (slow connections were bounced to login)
    const timeout = setTimeout(() => { if (!resolved) { resolved = true; setLoading(false) } }, 5000)
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      settle(session)
    }).catch(() => {
      clearTimeout(timeout)
      settle(null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(timeout)
      settle(session)
    })
    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  // Check role when session changes
  useEffect(() => {
    if (!session?.user?.email) {
      setUserRole(null)
      setAccessDenied(false)
      return
    }

    const email = session.user.email
    setRoleLoading(true)
    setAccessDenied(false)

    // Check if super admin first (always works)
    if (email === SUPER_ADMIN_EMAIL) {
      setUserRole("super_admin")
      setRoleLoading(false)
      return
    }

    // Check DB for role (with timeout)
    const roleTimeout = setTimeout(() => { setRoleLoading(false); setAccessDenied(true) }, 8000)
    ensureRolesTable().then(exists => {
      setTableExists(exists)
      if (!exists) {
        // No table — only super admin can access
        if (email === SUPER_ADMIN_EMAIL) {
          setUserRole("super_admin")
        } else {
          setAccessDenied(true)
        }
        clearTimeout(roleTimeout)
        setRoleLoading(false)
        return
      }

      getUserRole(email).then(role => {
        clearTimeout(roleTimeout)
        if (!role) {
          setAccessDenied(true)
        } else if (role === "disabled") {
          setAccessDenied(true)
        } else {
          setUserRole(role)
        }
        setRoleLoading(false)
      })
    })
  }, [session])

  // Email + password sign-in (same Supabase project as kuruma.lk, so the
  // owner's existing kuruma admin credentials work here). Google OAuth was
  // dropped when migrating projects — its client config was unrecoverable.
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [signingIn, setSigningIn] = useState(false)
  const signIn = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError(null)
    if (!email.trim() || !password) { setError("Enter your email and password"); return }
    setSigningIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) setError(/invalid login credentials/i.test(error.message) ? "Wrong email or password" : error.message)
    setSigningIn(false)
  }

  const signOut = async () => {
    try { await supabase.auth.signOut() } catch {}
    setSession(null)
    setUserRole(null)
    setAccessDenied(false)
  }

  // Loading state
  if (loading || roleLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F2F2F7", fontFamily: FONT }}>
        <div style={{ textAlign: "center", color: "#6C6C70" }}>
          <div style={{ marginBottom: 14 }}><LogoMark size={48} /></div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Loading…</div>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!session) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F2F2F7", fontFamily: FONT }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "44px 32px 36px", textAlign: "center", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", border: "1px solid #E5E5EA80" }}>
          <div style={{ marginBottom: 18 }}><LogoMark /></div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.6px" }}>Workshop Pulse</div>
          <div style={{ fontSize: 14, color: "#6E6E73", marginTop: 4, marginBottom: 30 }}>MacForce Auto Engineering</div>
          <form onSubmit={signIn} style={{ textAlign: "left" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#6E6E73", display: "block", marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" autoCapitalize="none" placeholder="you@example.com"
              style={{ width: "100%", padding: "13px 14px", border: "1px solid #E5E5EA", borderRadius: 12, fontSize: 16, fontFamily: FONT, outline: "none", marginBottom: 14, boxSizing: "border-box" }} />
            <label style={{ fontSize: 13, fontWeight: 600, color: "#6E6E73", display: "block", marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••"
              style={{ width: "100%", padding: "13px 14px", border: "1px solid #E5E5EA", borderRadius: 12, fontSize: 16, fontFamily: FONT, outline: "none", marginBottom: 18, boxSizing: "border-box" }} />
            <button type="submit" disabled={signingIn}
              style={{ width: "100%", padding: "14px 20px", background: "#007AFF", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, color: "#fff", cursor: signingIn ? "wait" : "pointer", fontFamily: FONT, opacity: signingIn ? 0.7 : 1 }}>
              {signingIn ? "Signing in…" : "Sign In"}
            </button>
          </form>
          {error && <div style={{ color: "#FF3B30", fontSize: 13, marginTop: 12 }}>{error}</div>}
        </div>
      </div>
    )
  }

  // Access denied — logged in but no role assigned
  if (accessDenied) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F2F2F7", fontFamily: FONT }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", textAlign: "center", maxWidth: 400, width: "90%", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#FF3B3014", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#FF3B30", marginBottom: 8 }}>Access Denied</div>
          <div style={{ fontSize: 15, color: "#6C6C70", marginBottom: 8, lineHeight: 1.5 }}>
            Your account <strong>{session.user.email}</strong> doesn't have access to Workshop Pulse.
          </div>
          <div style={{ fontSize: 13, color: "#AEAEB2", marginBottom: 24 }}>
            Contact the admin to get access.
          </div>
          {!tableExists && (
            <div style={{ fontSize: 12, color: "#FF9500", background: "#FF950015", padding: "10px 14px", borderRadius: 10, marginBottom: 16, textAlign: "left" }}>
              ⚠️ The <code>user_roles</code> table hasn't been created in Supabase yet. Only the super admin can access the app until it's set up.
            </div>
          )}
          <button
            onClick={signOut}
            style={{ border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 16, fontWeight: 600, cursor: "pointer", color: "#fff", background: "#FF3B30", fontFamily: FONT, width: "100%" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // Authenticated + authorized
  const authValue = {
    session,
    signOut,
    user: session?.user,
    role: userRole,
    isSuperAdmin: userRole === "super_admin",
    isAdmin: roleLevel(userRole) >= roleLevel("admin"),
    isStaff: roleLevel(userRole) >= roleLevel("staff"),
    isViewer: roleLevel(userRole) >= roleLevel("viewer"),
    hasRole: (minRole) => roleLevel(userRole) >= roleLevel(minRole),
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  )
}

// ═══ USER MANAGEMENT FUNCTIONS (for admin panel) ═══
export async function listUsers() {
  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data || []
}

export async function addUser(email, role, name = "") {
  const { data, error } = await supabase
    .from("user_roles")
    .upsert({
      email: email.toLowerCase().trim(),
      role,
      name: name || email.split("@")[0],
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateUserRole(email, role) {
  const { error } = await supabase
    .from("user_roles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("email", email)
  if (error) throw error
}

export async function toggleUserActive(email, isActive) {
  const { error } = await supabase
    .from("user_roles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("email", email)
  if (error) throw error
}

export async function removeUser(email) {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("email", email)
  if (error) throw error
}
