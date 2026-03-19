"use client"
import { useState, useEffect } from "react"
import { useAuth, listUsers, addUser, updateUserRole, toggleUserActive, removeUser } from "../AuthGate"
import { C, FONT, card, btn, btnSm, inp, NavBar, Sheet } from "../WorkshopContext"

const ROLES = [
  { key: "viewer", label: "Viewer", desc: "Read-only access", icon: "👁️", color: C.muted },
  { key: "staff", label: "Staff", desc: "View & edit jobs", icon: "👷", color: C.accent },
  { key: "admin", label: "Admin", desc: "Full job access", icon: "🔑", color: C.orange },
  { key: "super_admin", label: "Super Admin", desc: "Full access + users", icon: "👑", color: C.red },
]

export default function UserManagement({ onBack }) {
  const { isSuperAdmin, user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState("staff")
  const [saving, setSaving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [tableError, setTableError] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listUsers()
      setUsers(data)
      setTableError(false)
    } catch (e) {
      if (e.code === "42P01") {
        setTableError(true)
        setError("The user_roles table doesn't exist yet. Create it in Supabase SQL Editor.")
      } else {
        setError(e.message)
      }
    }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const handleAdd = async () => {
    if (!newEmail.trim()) return
    setSaving(true)
    try {
      await addUser(newEmail, newRole, newName)
      setShowAdd(false)
      setNewEmail("")
      setNewName("")
      setNewRole("staff")
      loadUsers()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const handleRoleChange = async (email, role) => {
    try {
      await updateUserRole(email, role)
      loadUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleToggle = async (email, isActive) => {
    try {
      await toggleUserActive(email, isActive)
      loadUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRemove = async (email) => {
    try {
      await removeUser(email)
      setConfirmRemove(null)
      loadUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 20, fontFamily: FONT }}>
        <NavBar title="Access Denied" onBack={onBack} />
        <div style={{ ...card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🚫</div>
          <div style={{ fontSize: 17, color: C.sub }}>Only Super Admins can manage users.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, fontFamily: FONT, maxWidth: 600, margin: "0 auto" }}>
      <NavBar
        title="User Management"
        subtitle={`${users.length} user${users.length !== 1 ? "s" : ""}`}
        onBack={onBack}
        right={
          <button onClick={() => setShowAdd(true)} style={{ ...btnSm(C.accent), padding: "10px 16px", fontSize: 14, width: "auto" }}>
            + Add User
          </button>
        }
      />

      {/* Super admin notice */}
      <div style={{ ...card, background: "#007AFF10", border: "1px solid #007AFF30", display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 24 }}>👑</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>Super Admin</div>
          <div style={{ fontSize: 13, color: C.sub }}>{user?.email} (hardcoded — always has access)</div>
        </div>
      </div>

      {/* SQL Setup notice */}
      {tableError && (
        <div style={{ ...card, background: "#FF950015", border: "1px solid #FF950030" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.orange, marginBottom: 8 }}>⚠️ Setup Required</div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 12, lineHeight: 1.5 }}>
            Run this SQL in your Supabase SQL Editor to create the user_roles table:
          </div>
          <pre style={{ fontSize: 11, background: "#1a1a1a", color: "#4ade80", padding: 14, borderRadius: 10, overflow: "auto", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{`CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('viewer','staff','admin','super_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read roles
CREATE POLICY "Users can read roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Allow super admin to manage roles (by email)
CREATE POLICY "Super admin can insert"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Super admin can update"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can delete"
  ON user_roles FOR DELETE
  TO authenticated
  USING (true);`}</pre>
          <button onClick={loadUsers} style={{ ...btnSm(C.orange), marginTop: 12, width: "auto", padding: "10px 20px", fontSize: 14 }}>
            Retry After Creating Table
          </button>
        </div>
      )}

      {error && !tableError && (
        <div style={{ ...card, background: "#FF3B3015", color: C.red, fontSize: 14 }}>
          {error}
          <span onClick={() => setError(null)} style={{ float: "right", cursor: "pointer" }}>✕</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.sub }}>Loading users...</div>
      ) : (
        <div>
          {users.map(u => (
            <div key={u.email} style={{ ...card, display: "flex", alignItems: "center", gap: 12, opacity: u.is_active ? 1 : 0.5 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {ROLES.find(r => r.key === u.role)?.icon || "👤"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.name || u.email.split("@")[0]}
                  {!u.is_active && <span style={{ fontSize: 11, color: C.red, marginLeft: 8 }}>DISABLED</span>}
                </div>
                <div style={{ fontSize: 13, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
              </div>
              <select
                value={u.role}
                onChange={e => handleRoleChange(u.email, e.target.value)}
                style={{ fontSize: 13, padding: "6px 8px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontFamily: FONT, cursor: "pointer" }}
              >
                {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleToggle(u.email, !u.is_active)}
                  title={u.is_active ? "Disable" : "Enable"}
                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, padding: 4 }}
                >
                  {u.is_active ? "⏸️" : "▶️"}
                </button>
                <button
                  onClick={() => setConfirmRemove(u.email)}
                  title="Remove"
                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, padding: 4 }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && !tableError && (
            <div style={{ textAlign: "center", padding: 40, color: C.sub }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 15 }}>No users added yet.</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Add team members to give them access.</div>
            </div>
          )}
        </div>
      )}

      {/* Add User Sheet */}
      {showAdd && (
        <Sheet onClose={() => setShowAdd(false)}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: C.text }}>Add User</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 4, display: "block" }}>Email *</label>
            <input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="user@gmail.com"
              type="email"
              style={inp}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 4, display: "block" }}>Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Display name"
              style={inp}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 8, display: "block" }}>Role</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ROLES.filter(r => r.key !== "super_admin").map(r => (
                <div
                  key={r.key}
                  onClick={() => setNewRole(r.key)}
                  style={{
                    padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                    border: `2px solid ${newRole === r.key ? r.color : C.border}`,
                    background: newRole === r.key ? r.color + "10" : C.bg,
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{r.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: C.sub }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !newEmail.trim()}
            style={{ ...btn(C.accent), opacity: saving || !newEmail.trim() ? 0.5 : 1 }}
          >
            {saving ? "Adding..." : "Add User"}
          </button>
        </Sheet>
      )}

      {/* Confirm Remove */}
      {confirmRemove && (
        <Sheet onClose={() => setConfirmRemove(null)}>
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Remove User?</div>
            <div style={{ fontSize: 14, color: C.sub, marginBottom: 20 }}>
              Remove <strong>{confirmRemove}</strong> from Workshop Pulse? They won't be able to access the app.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmRemove(null)} style={{ ...btn(C.bg, C.text), border: `1px solid ${C.border}` }}>Cancel</button>
              <button onClick={() => handleRemove(confirmRemove)} style={btn(C.red)}>Remove</button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}
