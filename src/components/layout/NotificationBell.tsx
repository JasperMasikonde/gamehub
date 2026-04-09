"use client";

import { useState } from "react";
import useSWR from "swr";
import { Bell } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data, mutate } = useSWR("/api/notifications?unread=true", fetcher, {
    refreshInterval: 30000,
  });

  const notifications = data?.notifications ?? [];
  const count = notifications.length;

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: "all" }),
    });
    mutate();
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        className="relative text-text-muted hover:text-text-primary transition-colors p-1"
        onClick={() => setOpen(!open)}
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-neon-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-bg-elevated border border-bg-border rounded-xl shadow-2xl z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
              <span className="text-sm font-semibold">Notifications</span>
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-neon-blue hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center text-text-muted text-sm py-8">
                  No new notifications
                </p>
              ) : (
                notifications.map(
                  (n: {
                    id: string;
                    title: string;
                    body: string;
                    createdAt: string;
                    linkUrl?: string;
                  }) => (
                    <div
                      key={n.id}
                      className="px-4 py-3 border-b border-bg-border last:border-0 hover:bg-bg-surface transition-colors"
                    >
                      {n.linkUrl ? (
                        <Link
                          href={n.linkUrl}
                          onClick={() => setOpen(false)}
                        >
                          <p className="text-sm font-medium text-text-primary hover:text-neon-blue">
                            {n.title}
                          </p>
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">{n.title}</p>
                      )}
                      <p className="text-xs text-text-muted mt-0.5">{n.body}</p>
                      <p className="text-xs text-text-muted/60 mt-1">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
