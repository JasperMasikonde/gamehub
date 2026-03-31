"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface UserResult {
  id: string;
  username: string;
  displayName: string | null;
}

export function AdminComposeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [selected, setSelected] = useState<UserResult | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setUsers([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const send = async () => {
    if (!selected || !content.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/messages/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        setOpen(false);
        setSelected(null);
        setContent("");
        setSearch("");
        router.push(`/messages/${selected.id}`);
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> New Message
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-bg-elevated border border-bg-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
              <h3 className="font-semibold">New Message</h3>
              <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Recipient */}
              {selected ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20">
                  <span className="text-sm font-medium text-neon-blue flex-1">
                    {selected.displayName ?? selected.username}
                    <span className="text-text-muted font-normal ml-1">@{selected.username}</span>
                  </span>
                  <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search user by username…"
                    className="w-full bg-bg-surface border border-bg-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/40"
                  />
                  {users.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-bg-elevated border border-bg-border rounded-lg shadow-xl overflow-hidden">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-bg-surface transition-colors flex items-center gap-2"
                          onClick={() => { setSelected(u); setSearch(""); setUsers([]); }}
                        >
                          <span className="font-medium">{u.displayName ?? u.username}</span>
                          <span className="text-text-muted">@{u.username}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your message…"
                rows={4}
                className="w-full resize-none bg-bg-surface border border-bg-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/40 transition-colors"
              />

              <Button
                variant="primary"
                className="w-full"
                onClick={send}
                disabled={!selected || !content.trim() || sending}
              >
                <Send size={14} />
                {sending ? "Sending…" : "Send Message"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
