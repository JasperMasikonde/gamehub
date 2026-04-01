"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Tag,
  AlertTriangle,
  Plus,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/dashboard/sales", label: "Sales", icon: Tag },
  { href: "/dashboard/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/dashboard/escrow-requests", label: "Escrow", icon: ShieldCheck },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-bg-border bg-bg-surface">
        <div className="p-4 border-b border-bg-border">
          <Link href="/" className="flex items-center">
            <img src="/logo.svg" alt="Eshabiki" className="h-7 w-auto" />
          </Link>
          <p className="text-xs text-text-muted mt-1">My Account</p>
        </div>

        <nav className="p-2 flex flex-col gap-1 flex-1">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                <Icon size={15} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={13} className="opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3">
          <Link
            href="/listings/create"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm bg-neon-green/10 border border-neon-green/20 text-neon-green hover:bg-neon-green/20 transition-colors font-medium"
          >
            <Plus size={14} />
            New Listing
          </Link>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-bg-border flex items-center justify-around px-1 h-16">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 flex-1 py-2 text-[10px] transition-colors",
                active ? "text-neon-green" : "text-text-muted"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
        <Link
          href="/listings/create"
          className="flex flex-col items-center gap-0.5 flex-1 py-2 text-[10px] text-neon-green"
        >
          <Plus size={20} strokeWidth={2} />
          <span>Sell</span>
        </Link>
      </nav>
    </>
  );
}
