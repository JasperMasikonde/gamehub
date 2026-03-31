"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListOrdered,
  Users,
  CreditCard,
  AlertTriangle,
  Gamepad2,
  ArrowLeft,
  MessageSquare,
  Swords,
  ShoppingBag,
  Package,
  Tag,
  ClipboardList,
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
];

const shopLinks = [
  { href: "/admin/shop", label: "Overview", icon: ShoppingBag, exact: true },
  { href: "/admin/shop/products", label: "Products", icon: Package },
  { href: "/admin/shop/categories", label: "Categories", icon: Tag },
  { href: "/admin/shop/orders", label: "Orders", icon: ClipboardList },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-bg-border bg-bg-surface flex flex-col min-h-screen">
      <div className="p-4 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <Gamepad2 size={20} className="text-neon-green" />
          <span className="font-bold text-sm">
            Game<span className="text-neon-green">Hub</span>
          </span>
        </div>
        <p className="text-xs text-neon-red font-semibold mt-1">Admin Panel</p>
      </div>

      <nav className="p-2 flex flex-col gap-1 flex-1">
        {mainLinks.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
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
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-bg-border">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <ArrowLeft size={14} />
          Back to site
        </Link>
      </div>
    </aside>
  );
}
