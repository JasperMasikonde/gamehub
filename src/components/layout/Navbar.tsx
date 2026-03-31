"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { User, LogOut, Plus, ShieldCheck, Menu, X, Gamepad2, Swords, ShoppingBag, Trophy } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { MessagesIcon } from "@/components/layout/MessagesIcon";
import { CartIcon } from "@/components/shop/CartIcon";

export function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-bg-border bg-bg-surface/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Gamepad2
              size={28}
              className="text-neon-green group-hover:text-neon-blue transition-colors"
            />
            <span className="text-xl font-bold text-text-primary">
              Game<span className="text-neon-green text-glow-green">Hub</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/listings" className="text-sm text-text-subtle hover:text-text-primary transition-colors">
              Marketplace
            </Link>
            <Link href="/challenges" className="text-sm text-text-subtle hover:text-text-primary transition-colors flex items-center gap-1">
              <Swords size={13} />
              Challenges
            </Link>
            <Link href="/shop" className="text-sm text-text-subtle hover:text-text-primary transition-colors flex items-center gap-1">
              <ShoppingBag size={13} />
              Shop
            </Link>
            <Link href="/tournaments" className="text-sm text-text-subtle hover:text-text-primary transition-colors flex items-center gap-1">
              <Trophy size={13} />
              Tournaments
            </Link>
            {session?.user && (
              <Link href="/dashboard" className="text-sm text-text-subtle hover:text-text-primary transition-colors">
                Dashboard
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {session?.user ? (
              <>
                {session.user.role === "ADMIN" && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      <ShieldCheck size={15} />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link href="/listings/create">
                  <Button variant="primary" size="sm">
                    <Plus size={15} />
                    Sell Account
                  </Button>
                </Link>
                <CartIcon />
                <MessagesIcon />
                <NotificationBell />
                <div className="relative group">
                  <button className="flex items-center gap-2 text-sm text-text-subtle hover:text-text-primary transition-colors">
                    <div className="w-8 h-8 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center">
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <span className="max-w-[100px] truncate">
                      {session.user.username}
                    </span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-bg-elevated border border-bg-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-subtle hover:text-text-primary hover:bg-bg-surface rounded-t-xl transition-colors"
                    >
                      <User size={15} /> My Dashboard
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-subtle hover:text-neon-red w-full rounded-b-xl transition-colors"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-text-muted hover:text-text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-bg-border bg-bg-surface px-4 py-4 flex flex-col gap-3">
          <Link href="/listings" className="text-sm text-text-subtle hover:text-text-primary" onClick={() => setMobileOpen(false)}>
            Marketplace
          </Link>
          <Link href="/challenges" className="text-sm text-text-subtle hover:text-text-primary flex items-center gap-1" onClick={() => setMobileOpen(false)}>
            <Swords size={13} /> Challenges
          </Link>
          <Link href="/shop" className="text-sm text-text-subtle hover:text-text-primary flex items-center gap-1" onClick={() => setMobileOpen(false)}>
            <ShoppingBag size={13} /> Shop
          </Link>
          <Link href="/tournaments" className="text-sm text-text-subtle hover:text-text-primary flex items-center gap-1" onClick={() => setMobileOpen(false)}>
            <Trophy size={13} /> Tournaments
          </Link>
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-text-subtle hover:text-text-primary"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/listings/create"
                onClick={() => setMobileOpen(false)}
              >
                <Button variant="primary" size="sm" className="w-full">
                  <Plus size={15} /> Sell Account
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-neon-red"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut size={15} /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" size="sm" className="w-full">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
