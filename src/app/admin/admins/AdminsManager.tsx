"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AdminPermission } from "@prisma/client";
import { UserPlus, Trash2, ShieldCheck } from "lucide-react";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  adminPermissions: AdminPermission[];
  createdAt: string;
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
  const [email, setEmail] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    const res = await fetch("/api/admin/admins");
    if (res.ok) setAdmins(await res.json());
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const promote = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoting(true);
    setError("");
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setPromoting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed");
      return;
    }
    setEmail("");
    fetchAdmins();
  };

  const togglePermission = async (admin: AdminUser, perm: AdminPermission) => {
    const current = admin.adminPermissions;
    const next = current.includes(perm)
      ? current.filter((p) => p !== perm)
      : [...current, perm];

    // Optimistic update
    setAdmins((prev) =>
      prev.map((a) => (a.id === admin.id ? { ...a, adminPermissions: next } : a))
    );

    setSavingId(admin.id);
    await fetch(`/api/admin/admins/${admin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPermissions: next }),
    });
    setSavingId(null);
  };

  const demote = async (id: string) => {
    if (!confirm("Demote this admin back to a regular user?")) return;
    await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    fetchAdmins();
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Admin Management</h1>
        <p className="text-sm text-text-muted">Promote users to admin and control their permissions</p>
      </div>

      {/* Promote form */}
      <Card>
        <form onSubmit={promote} className="p-4 flex flex-col gap-3">
          <p className="text-sm font-medium">Promote a user to Admin</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
              className="flex-1 px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue"
            />
            <button
              type="submit"
              disabled={promoting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-blue text-bg-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <UserPlus size={14} />
              {promoting ? "Promoting..." : "Promote"}
            </button>
          </div>
        </form>
      </Card>

      {/* Admins list */}
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
                  <p className="text-xs text-text-muted mb-2">Permissions</p>
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
  );
}
