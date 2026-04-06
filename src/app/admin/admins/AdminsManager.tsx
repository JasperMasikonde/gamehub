"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { AdminPermission, AgentStatus } from "@prisma/client";
import {
  UserPlus, Trash2, ShieldCheck, Search, Bot, Plus, Play, Square,
  Copy, Check, AlertCircle, Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type AgentUser = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  adminPermissions: AdminPermission[];
  agentHostUrl: string | null;
  agentStatus: AgentStatus;
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

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

const STATUS_META: Record<AgentStatus, { label: string; color: string }> = {
  RUNNING:  { label: "Running",  color: "text-green-400 bg-green-400/10 border-green-400/20" },
  STOPPED:  { label: "Stopped",  color: "text-text-muted bg-bg-elevated border-bg-border" },
  STARTING: { label: "Starting", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  STOPPING: { label: "Stopping", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  ERROR:    { label: "Error",    color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

// ─── Permission pill (shared) ──────────────────────────────────────────────────

function PermissionPills({
  permissions,
  savingId,
  ownerId,
  onToggle,
}: {
  permissions: AdminPermission[];
  savingId: string | null;
  ownerId: string;
  onToggle: (perm: AdminPermission) => void;
}) {
  return (
    <div>
      <p className="text-xs text-text-muted mb-2 flex items-center gap-1">
        Permissions — click to toggle
        {savingId === ownerId && <Loader2 size={11} className="animate-spin" />}
      </p>
      <div className="flex flex-wrap gap-2">
        {ALL_PERMISSIONS.map(({ value, label }) => {
          const active = permissions.includes(value);
          return (
            <button
              key={value}
              onClick={() => onToggle(value)}
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
      {permissions.length === 0 && (
        <p className="text-xs text-yellow-400 mt-2">No permissions assigned — this admin can only view the dashboard.</p>
      )}
    </div>
  );
}

// ─── Human admins tab ─────────────────────────────────────────────────────────

function HumanAdminsTab() {
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
      if (!res.ok) { setPromoteError(data.error ?? "Failed to promote"); return; }
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
    setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, adminPermissions: next } : a)));
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
    <div className="flex flex-col gap-6">
      <Card>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm font-medium">Promote a user to Admin</p>
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
          {selectedUser && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20">
              <div>
                <p className="text-sm font-medium text-neon-blue">{selectedUser.username}</p>
                <p className="text-xs text-text-muted">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-xs text-text-muted hover:text-text-primary">Clear</button>
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
                    <button
                      onClick={() => demote(admin.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Demote to user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <PermissionPills
                    permissions={admin.adminPermissions}
                    savingId={savingId}
                    ownerId={admin.id}
                    onToggle={(perm) => togglePermission(admin, perm)}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Agents tab ────────────────────────────────────────────────────────────

function AgentsTab() {
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [hostUrl, setHostUrl] = useState("");
  const [hostApiKey, setHostApiKey] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newToken, setNewToken] = useState<{ agentId: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/admin/agents");
    if (res.ok) setAgents(await res.json());
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const createAgent = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hostUrl, hostApiKey }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? "Failed to create agent"); return; }
      setNewToken({ agentId: data.id, token: data.agentToken });
      setName(""); setHostUrl(""); setHostApiKey("");
      setShowCreate(false);
      await fetchAgents();
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const copyToken = async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePermission = async (agent: AgentUser, perm: AdminPermission) => {
    const next = agent.adminPermissions.includes(perm)
      ? agent.adminPermissions.filter((p) => p !== perm)
      : [...agent.adminPermissions, perm];
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, adminPermissions: next } : a)));
    setSavingId(agent.id);
    try {
      await fetch(`/api/admin/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPermissions: next }),
      });
    } finally {
      setSavingId(null);
    }
  };

  const launch = async (agent: AgentUser) => {
    setActioningId(agent.id);
    setActionError((e) => ({ ...e, [agent.id]: "" }));
    setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, agentStatus: "STARTING" } : a));
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}/launch`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setActionError((e) => ({ ...e, [agent.id]: data.error ?? "Launch failed" }));
        setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, agentStatus: "ERROR" } : a));
      } else {
        setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, agentStatus: data.agentStatus } : a));
      }
    } catch {
      setActionError((e) => ({ ...e, [agent.id]: "Network error" }));
      setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, agentStatus: "ERROR" } : a));
    } finally {
      setActioningId(null);
    }
  };

  const stop = async (agent: AgentUser) => {
    setActioningId(agent.id);
    setActionError((e) => ({ ...e, [agent.id]: "" }));
    setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, agentStatus: "STOPPING" } : a));
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}/stop`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setActionError((e) => ({ ...e, [agent.id]: data.error ?? "Stop failed" }));
        setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, agentStatus: "ERROR" } : a));
      } else {
        setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, agentStatus: data.agentStatus } : a));
      }
    } catch {
      setActionError((e) => ({ ...e, [agent.id]: "Network error" }));
      setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, agentStatus: "ERROR" } : a));
    } finally {
      setActioningId(null);
    }
  };

  const deleteAgent = async (id: string, displayName: string | null) => {
    if (!confirm(`Delete agent "${displayName ?? id}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/agents/${id}`, { method: "DELETE" });
    setAgents((prev) => prev.filter((a) => a.id !== id));
    if (newToken?.agentId === id) setNewToken(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* One-time token banner */}
      {newToken && (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-yellow-400">Agent created — copy the API token now</p>
          <p className="text-xs text-text-muted">This token is shown only once. Configure it on your remote machine as the agent&apos;s bearer token.</p>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-xs font-mono text-text-primary truncate">
              {newToken.token}
            </code>
            <button
              onClick={copyToken}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-medium hover:bg-yellow-400/20 transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={() => setNewToken(null)} className="text-xs text-text-muted hover:text-text-primary px-2">Dismiss</button>
          </div>
        </div>
      )}

      {/* Create form toggle */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-sm font-medium hover:bg-neon-blue/15 transition-colors"
        >
          <Plus size={14} /> Create AI Agent
        </button>
      ) : (
        <Card>
          <div className="p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold">New AI Agent</p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent name (e.g. Fraud Detector)"
                className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue"
              />
              <input
                type="url"
                value={hostUrl}
                onChange={(e) => setHostUrl(e.target.value)}
                placeholder="Host URL (e.g. https://agent.example.com)"
                className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue"
              />
              <input
                type="password"
                value={hostApiKey}
                onChange={(e) => setHostApiKey(e.target.value)}
                placeholder="Host API key (stored encrypted)"
                className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue"
              />
            </div>
            {createError && <p className="text-xs text-red-400">{createError}</p>}
            <div className="flex gap-2">
              <button
                onClick={createAgent}
                disabled={creating || !name || !hostUrl || !hostApiKey}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-blue text-bg-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Bot size={14} />
                {creating ? "Creating..." : "Create Agent"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setCreateError(""); }}
                className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Agent list */}
      {agents.length === 0 ? (
        <p className="text-sm text-text-muted">No AI agents yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {agents.map((agent) => {
            const status = STATUS_META[agent.agentStatus];
            const isActioning = actioningId === agent.id;
            const canLaunch = agent.agentStatus === "STOPPED" || agent.agentStatus === "ERROR";
            const canStop = agent.agentStatus === "RUNNING" || agent.agentStatus === "ERROR";

            return (
              <Card key={agent.id}>
                <div className="p-4 flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bot size={15} className="text-neon-blue shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{agent.displayName ?? agent.username}</p>
                        <p className="text-xs text-text-muted font-mono">{agent.agentHostUrl}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                        {status.label}
                      </span>
                      <button
                        onClick={() => deleteAgent(agent.id, agent.displayName)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete agent"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Launch / Stop */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => launch(agent)}
                      disabled={!canLaunch || isActioning}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isActioning && agent.agentStatus === "STARTING"
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Play size={12} />}
                      Launch
                    </button>
                    <button
                      onClick={() => stop(agent)}
                      disabled={!canStop || isActioning}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isActioning && agent.agentStatus === "STOPPING"
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Square size={12} />}
                      Stop
                    </button>
                    {actionError[agent.id] && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <AlertCircle size={11} /> {actionError[agent.id]}
                      </span>
                    )}
                  </div>

                  {/* Permissions */}
                  <PermissionPills
                    permissions={agent.adminPermissions}
                    savingId={savingId}
                    ownerId={agent.id}
                    onToggle={(perm) => togglePermission(agent, perm)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function AdminsManager() {
  const [tab, setTab] = useState<"admins" | "agents">("admins");

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Admin Management</h1>
        <p className="text-sm text-text-muted">Manage human admins and AI agent admins</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-bg-elevated border border-bg-border w-fit">
        {(["admins", "agents"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-neon-blue text-bg-base"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t === "admins" ? <ShieldCheck size={13} /> : <Bot size={13} />}
            {t === "admins" ? "Admins" : "AI Agents"}
          </button>
        ))}
      </div>

      {tab === "admins" ? <HumanAdminsTab /> : <AgentsTab />}
    </div>
  );
}
