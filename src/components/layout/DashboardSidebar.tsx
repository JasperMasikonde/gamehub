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
  { href: "/dashboard/purchases", label: "My Purchases", icon: ShoppingCart },
  { href: "/dashboard/sales", label: "My Sales", icon: Tag },
  { href: "/dashboard/disputes", label: "My Disputes", icon: AlertTriangle },
  { href: "/dashboard/escrow-requests", label: "Escrow Requests", icon: ShieldCheck },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-bg-border bg-bg-surface">
      <div className="p-4 border-b border-bg-border">
        <Link href="/" className="flex items-center">
          <img src="/logo.svg" alt="Eshabiki" className="h-7 w-auto" />
        </Link>
        <p className="text-xs text-text-muted mt-1">My Account</p>
      </div>

      <nav className="p-2 flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group",
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

      <div className="p-3 mt-2">
        <Link
          href="/listings/create"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm bg-neon-green/10 border border-neon-green/20 text-neon-green hover:bg-neon-green/20 transition-colors font-medium"
        >
          <Plus size={14} />
          New Listing
        </Link>
      </div>
    </aside>
  );
}
