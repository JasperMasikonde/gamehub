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
  ShieldCheck,
  TrendingUp,
  BookOpen,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { AdminPermission } from "@prisma/client";

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  permission?: AdminPermission;
  superAdminOnly?: boolean;
};

const mainLinks: NavLink[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/listings", label: "Listings", icon: ListOrdered, permission: "MANAGE_LISTINGS" },
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard, permission: "MANAGE_TRANSACTIONS" },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle, permission: "MANAGE_DISPUTES" },
  { href: "/admin/challenges", label: "Challenges", icon: Swords, permission: "MANAGE_CHALLENGES" },
  { href: "/admin/users", label: "Users", icon: Users, permission: "MANAGE_USERS" },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare, permission: "MANAGE_MESSAGES" },
  { href: "/admin/support", label: "Support", icon: HeadphonesIcon, permission: "SEND_SUPPORT_EMAIL" },
  { href: "/admin/admins", label: "Admins", icon: ShieldCheck, superAdminOnly: true },
];

const shopLinks: NavLink[] = [
  { href: "/admin/shop", label: "Overview", icon: ShoppingBag, exact: true, permission: "MANAGE_SHOP" },
  { href: "/admin/shop/products", label: "Products", icon: Package, permission: "MANAGE_SHOP" },
  { href: "/admin/shop/categories", label: "Categories", icon: Tag, permission: "MANAGE_SHOP" },
  { href: "/admin/shop/orders", label: "Orders", icon: ClipboardList, permission: "MANAGE_SHOP" },
];

const tournamentLinks: NavLink[] = [
  { href: "/admin/tournaments", label: "Tournaments", icon: Trophy, exact: true, permission: "MANAGE_TOURNAMENTS" },
  { href: "/admin/fees", label: "Platform Fees", icon: DollarSign, exact: true, permission: "MANAGE_FEES" },
];

const rankPushLinks: NavLink[] = [
  { href: "/admin/rank-push", label: "Overview", icon: TrendingUp, exact: true },
  { href: "/admin/rank-push/categories", label: "Categories", icon: Tag },
  { href: "/admin/rank-push/providers", label: "Providers", icon: Users },
  { href: "/admin/rank-push/orders", label: "Orders", icon: ClipboardList },
];

const accountingLinks: NavLink[] = [
  { href: "/admin/accounting", label: "Overview", icon: BookOpen, exact: true, superAdminOnly: true },
  { href: "/admin/accounting/ledger", label: "Ledger", icon: Receipt, superAdminOnly: true },
];

function canSee(link: NavLink, isSuperAdmin: boolean, adminPermissions: AdminPermission[]) {
  if (isSuperAdmin) return true;
  if (link.superAdminOnly) return false;
  if (!link.permission) return true; // overview — always visible
  return adminPermissions.includes(link.permission);
}

function NavItem({
  link,
  activeColor,
  onNavigate,
  isSuperAdmin,
  adminPermissions,
}: {
  link: NavLink;
  activeColor: string;
  onNavigate?: () => void;
  isSuperAdmin: boolean;
  adminPermissions: AdminPermission[];
}) {
  const pathname = usePathname();
  if (!canSee(link, isSuperAdmin, adminPermissions)) return null;
  const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
        active ? activeColor : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
      )}
    >
      <Icon size={15} />
      {link.label}
    </Link>
  );
}

function SidebarContent({
  onNavigate,
  isSuperAdmin,
  adminPermissions,
}: {
  onNavigate?: () => void;
  isSuperAdmin: boolean;
  adminPermissions: AdminPermission[];
}) {
  const shopVisible = shopLinks.some((l) => canSee(l, isSuperAdmin, adminPermissions));
  const tournamentVisible = tournamentLinks.some((l) => canSee(l, isSuperAdmin, adminPermissions));
  const rankPushVisible = rankPushLinks.some((l) => canSee(l, isSuperAdmin, adminPermissions));
  const accountingVisible = accountingLinks.some((l) => canSee(l, isSuperAdmin, adminPermissions));

  return (
    <aside className="w-56 shrink-0 border-r border-bg-border bg-bg-surface flex flex-col h-full">
      <div className="p-4 border-b border-bg-border">
        <img src="/logo-icon.svg" alt="Eshabiki" className="w-8 h-8" />
        <p className="text-xs text-neon-red font-semibold mt-1">Admin Panel</p>
      </div>

      <nav className="p-2 flex flex-col gap-1 flex-1 overflow-y-auto">
        {mainLinks.map((link) => (
          <NavItem
            key={link.href}
            link={link}
            activeColor="bg-neon-blue/10 text-neon-blue border border-neon-blue/20"
            onNavigate={onNavigate}
            isSuperAdmin={isSuperAdmin}
            adminPermissions={adminPermissions}
          />
        ))}

        {shopVisible && (
          <>
            <div className="mx-3 my-2 border-t border-bg-border" />
            <p className="px-3 text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-1">Shop</p>
            {shopLinks.map((link) => (
              <NavItem
                key={link.href}
                link={link}
                activeColor="bg-neon-green/10 text-neon-green border border-neon-green/20"
                onNavigate={onNavigate}
                isSuperAdmin={isSuperAdmin}
                adminPermissions={adminPermissions}
              />
            ))}
          </>
        )}

        {tournamentVisible && (
          <>
            <div className="mx-3 my-2 border-t border-bg-border" />
            <p className="px-3 text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-1">Tournaments</p>
            {tournamentLinks.map((link) => (
              <NavItem
                key={link.href}
                link={link}
                activeColor="bg-purple-500/10 text-purple-400 border border-purple-500/20"
                onNavigate={onNavigate}
                isSuperAdmin={isSuperAdmin}
                adminPermissions={adminPermissions}
              />
            ))}
          </>
        )}

        {rankPushVisible && (
          <>
            <div className="mx-3 my-2 border-t border-bg-border" />
            <p className="px-3 text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-1">Rank Push</p>
            {rankPushLinks.map((link) => (
              <NavItem
                key={link.href}
                link={link}
                activeColor="bg-neon-purple/10 text-neon-purple border border-neon-purple/20"
                onNavigate={onNavigate}
                isSuperAdmin={isSuperAdmin}
                adminPermissions={adminPermissions}
              />
            ))}
          </>
        )}

        {accountingVisible && (
          <>
            <div className="mx-3 my-2 border-t border-bg-border" />
            <p className="px-3 text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-1">Accounting</p>
            {accountingLinks.map((link) => (
              <NavItem
                key={link.href}
                link={link}
                activeColor="bg-neon-green/10 text-neon-green border border-neon-green/20"
                onNavigate={onNavigate}
                isSuperAdmin={isSuperAdmin}
                adminPermissions={adminPermissions}
              />
            ))}
          </>
        )}
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

export function AdminSidebar({
  isSuperAdmin,
  adminPermissions,
}: {
  isSuperAdmin: boolean;
  adminPermissions: AdminPermission[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex min-h-screen">
        <SidebarContent isSuperAdmin={isSuperAdmin} adminPermissions={adminPermissions} />
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

      {/* Mobile backdrop */}
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
        <SidebarContent
          onNavigate={() => setOpen(false)}
          isSuperAdmin={isSuperAdmin}
          adminPermissions={adminPermissions}
        />
      </div>
    </>
  );
}
