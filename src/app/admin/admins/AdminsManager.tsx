"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { AdminPermission } from "@prisma/client";
import { UserPlus, Trash2, ShieldCheck, Search } from "lucide-react";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  adminPermissions: AdminPermission[];
  createdAt: string;
};

type PickableUser = {
  id: string;
  username: string;
  email: string;
};

const ALL_PERMISSIONS: { value: AdminPermission; label: string }[] = [
  { value: "MANAGE_USERS", label: "Users" },
  { value: "MANAGE_LISTINGS", label: "Listings" },
  { value: "MANAGE_TRANSACTIONS", label: "Transactions" },
  { value: "MANAGE_DISPUTES", label: "Disputes" },
  { value: "MANAGE_CHALLENGES", label: "Challenges" },
  { value: "MANAGE_MESSAGES", label: "Messages" },
  { value: "SEND_SUPPORT_EMAIL", label: "Support Email" },
  { value: "MANAGE_SHOP", label: "Shop" },
  { value: "MANAGE_TOURNAMENTS", label: "Tournaments" },
  { value: "MANAGE_FEES", label: "Platform Fees" },
];

export function AdminsManager() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [users, setUsers] = useState<PickableUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<PickableUser | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    const res = await fetch("/api/admin/admins");
    if (res.ok) setAdmins(await res.json());
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/admins?type=users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    fetchAdmins();
    fetchUsers();
  }, [fetchAdmins, fetchUsers]);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const promote = async () => {
    if (!selectedUser) return;
    setPromoting(true);
    setPromoteError("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedUser.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoteError(data.error ?? "Failed to promote");
        return;
      }
      setSelectedUser(null);
      setSearch("");
      await Promise.all([fetchAdmins(), fetchUsers()]);
    } catch {
      setPromoteError("Network error. Please try again.");
    } finally {
      setPromoting(false);
    }
  };

  const togglePermission = async (admin: AdminUser, perm: AdminPermission) => {
    const next = admin.adminPermissions.includes(perm)
      ? admin.adminPermissions.filter((p) => p !== perm)
      : [...admin.adminPermissions, perm];

    setAdmins((prev) =>
      prev.map((a) => (a.id === admin.id ? { ...a, adminPermissions: next } : a))
    );
    setSavingId(admin.id);
    try {
      await fetch(`/api/admin/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPermissions: next }),
      });
    } finally {
      setSavingId(null);
    }
  };

  const demote = async (id: string) => {
    if (!confirm("Demote this admin back to a regular user?")) return;
    await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    await Promise.all([fetchAdmins(), fetchUsers()]);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Admin Management</h1>
        <p className="text-sm text-text-muted">Promote users to admin and control their permissions</p>
      </div>

      {/* Promote section */}
      <Card>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm font-medium">Promote a user to Admin</p>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedUser(null); }}
              placeholder="Search by name or email..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue"
            />
          </div>

          {/* User list */}
          {search && (
            <div className="rounded-lg border border-bg-border bg-bg-elevated max-h-48 overflow-y-auto divide-y divide-bg-border">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-text-muted">No users found</p>
              ) : (
                filtered.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setSearch(""); }}
                    className="w-full text-left px-3 py-2 hover:bg-bg-surface transition-colors"
                  >
                    <p className="text-sm text-text-primary">{u.username}</p>
                    <p className="text-xs text-text-muted">{u.email}</p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected user */}
          {selectedUser && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20">
              <div>
                <p className="text-sm font-medium text-neon-blue">{selectedUser.username}</p>
                <p className="text-xs text-text-muted">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-xs text-text-muted hover:text-text-primary">
                Clear
              </button>
            </div>
          )}

          {promoteError && <p className="text-xs text-red-400">{promoteError}</p>}

          <button
            onClick={promote}
            disabled={!selectedUser || promoting}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-neon-blue text-bg-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <UserPlus size={14} />
            {promoting ? "Promoting..." : "Promote to Admin"}
          </button>
        </div>
      </Card>

      {/* Current admins */}
      <div>
        <p className="text-sm font-medium mb-3">Current Admins</p>
        {admins.length === 0 ? (
          <p className="text-sm text-text-muted">No other admins yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {admins.map((admin) => (
              <Card key={admin.id}>
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={15} className="text-neon-blue" />
                      <div>
                        <p className="text-sm font-medium">{admin.username}</p>
                        <p className="text-xs text-text-muted">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {savingId === admin.id && (
                        <span className="text-xs text-text-muted">Saving...</span>
                      )}
                      <button
                        onClick={() => demote(admin.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Demote to user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-text-muted mb-2">Permissions — click to toggle</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_PERMISSIONS.map(({ value, label }) => {
                        const active = admin.adminPermissions.includes(value);
                        return (
                          <button
                            key={value}
                            onClick={() => togglePermission(admin, value)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                              active
                                ? "bg-neon-blue/10 text-neon-blue border-neon-blue/30"
                                : "bg-bg-elevated text-text-muted border-bg-border hover:border-neon-blue/30"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {admin.adminPermissions.length === 0 && (
                    <p className="text-xs text-yellow-400">No permissions assigned — this admin can only view the dashboard.</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
