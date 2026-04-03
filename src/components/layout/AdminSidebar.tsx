"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ListOrdered,
  Users,
  CreditCard,
  AlertTriangle,
  ArrowLeft,
  MessageSquare,
  Swords,
  ShoppingBag,
  Package,
  Tag,
  ClipboardList,
  Trophy,
  DollarSign,
  HeadphonesIcon,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const mainLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/listings", label: "Listings", icon: ListOrdered },
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/admin/challenges", label: "Challenges", icon: Swords },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/support", label: "Support", icon: HeadphonesIcon },
];

const shopLinks = [
  { href: "/admin/shop", label: "Overview", icon: ShoppingBag, exact: true },
  { href: "/admin/shop/products", label: "Products", icon: Package },
  { href: "/admin/shop/categories", label: "Categories", icon: Tag },
  { href: "/admin/shop/orders", label: "Orders", icon: ClipboardList },
];

const tournamentLinks = [
  { href: "/admin/tournaments", label: "Tournaments", icon: Trophy, exact: true },
  { href: "/admin/fees", label: "Platform Fees", icon: DollarSign, exact: true },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-bg-border bg-bg-surface flex flex-col h-full">
      <div className="p-4 border-b border-bg-border">
        <img src="/logo-icon.svg" alt="Eshabiki" className="w-8 h-8" />
        <p className="text-xs text-neon-red font-semibold mt-1">Admin Panel</p>
      </div>

      <nav className="p-2 flex flex-col gap-1 flex-1 overflow-y-auto">
        {mainLinks.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-neon-blue/10 text-neon-blue border border-neon-blue/20"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}

        <div className="mx-3 my-2 border-t border-bg-border" />
        <p className="px-3 text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-1">Shop</p>
        {shopLinks.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors", active ? "bg-neon-green/10 text-neon-green border border-neon-green/20" : "text-text-muted hover:text-text-primary hover:bg-bg-elevated")}>
              <Icon size={15} />{label}
            </Link>
          );
        })}

        <div className="mx-3 my-2 border-t border-bg-border" />
        <p className="px-3 text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-1">Tournaments</p>
        {tournamentLinks.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors", active ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "text-text-muted hover:text-text-primary hover:bg-bg-elevated")}>
              <Icon size={15} />{label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-bg-border">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <ArrowLeft size={14} />
          Back to site
        </Link>
      </div>
    </aside>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex min-h-screen">
        <SidebarContent />
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-bg-surface border-b border-bg-border">
        <div className="flex items-center gap-2">
          <img src="/logo-icon.svg" alt="Eshabiki" className="w-7 h-7" />
          <p className="text-xs text-neon-red font-semibold">Admin Panel</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </div>
    </>
  );
}
