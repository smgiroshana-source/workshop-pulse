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

  const signIn = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
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
          <button
            onClick={signIn}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "14px 20px", background: "#fff", border: "1px solid #E5E5EA", borderRadius: 12, fontSize: 16, fontWeight: 600, color: "#1a1a1a", cursor: "pointer", fontFamily: FONT, transition: "background 0.15s" }}
            onMouseOver={e => e.currentTarget.style.background = "#f8f8f8"}
            onMouseOut={e => e.currentTarget.style.background = "#fff"}
          >
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Sign in with Google
          </button>
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
