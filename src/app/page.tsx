export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ListingCard } from "@/components/listings/ListingCard";
import { prisma } from "@/lib/prisma";
import {
  Gamepad2, ShieldCheck, Zap, Trophy, ArrowRight,
  Users, TrendingUp, Star, ChevronRight, CheckCircle,
} from "lucide-react";

async function getStats() {
  const [listings, users, completed] = await Promise.all([
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.transaction.count({ where: { status: "COMPLETED" } }),
  ]);
  return { listings, users, completed };
}

async function getFeaturedListings() {
  return prisma.listing.findMany({
    where: { status: "ACTIVE", isPrivateDeal: false },
    orderBy: { views: "desc" },
    take: 6,
    include: {
      seller: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, isVerifiedSeller: true, rating: true, role: true },
      },
      screenshots: { where: { isCover: true }, take: 1 },
    },
  });
}

export default async function HomePage() {
  const [stats, featured] = await Promise.all([getStats(), getFeaturedListings()]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden gaming-grid">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-neon-green/8 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-neon-blue/6 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-neon-blue/20 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-green/30 bg-neon-green/5 text-neon-green text-xs font-semibold mb-8 tracking-wide">
            <Zap size={12} className="fill-neon-green" />
            THE #1 eFOOTBALL ACCOUNT MARKETPLACE
          </div>

          <h1 className="text-5xl sm:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Trade eFootball{" "}
            <span className="gradient-text text-glow-green">Accounts</span>
            <br />
            <span className="text-text-subtle">with Zero Risk</span>
          </h1>

          <p className="text-text-subtle text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Every transaction is escrow-protected. Your funds are held safely until
            you confirm the account — or we refund you. No exceptions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/listings">
              <Button size="lg" className="glow-green text-base px-8 py-4 h-auto">
                Browse {stats.listings} Accounts <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="text-base px-8 py-4 h-auto">
                Start Selling Free
              </Button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {[
              { value: stats.listings, label: "Active Listings", color: "text-neon-green" },
              { value: stats.users, label: "Registered Users", color: "text-neon-blue" },
              { value: stats.completed, label: "Completed Sales", color: "text-neon-purple" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-4xl font-black ${s.color} tabular-nums`}>
                  {s.value.toLocaleString()}
                </p>
                <p className="text-sm text-text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust badges ── */}
      <section className="border-y border-bg-border bg-bg-surface/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-6">
          {[
            { icon: ShieldCheck, text: "Escrow Protected", color: "text-neon-green" },
            { icon: CheckCircle, text: "Verified Sellers", color: "text-neon-blue" },
            { icon: Star, text: "Rated Transactions", color: "text-neon-yellow" },
            { icon: Zap, text: "Instant Transfer", color: "text-neon-purple" },
            { icon: Users, text: "Dispute Resolution", color: "text-neon-orange" },
          ].map((b) => (
            <div key={b.text} className="flex items-center gap-1.5 text-sm text-text-muted">
              <b.icon size={14} className={b.color} />
              {b.text}
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Listings ── */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">
                Featured <span className="text-neon-green">Accounts</span>
              </h2>
              <p className="text-sm text-text-muted mt-1">Top picks from verified sellers</p>
            </div>
            <Link
              href="/listings"
              className="flex items-center gap-1 text-sm text-neon-blue hover:text-neon-green transition-colors font-medium"
            >
              View all <ChevronRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">
            How <span className="gradient-text">Eshabiki</span> Works
          </h2>
          <p className="text-text-muted">
            Safe, simple, and secure in 4 steps
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {[
            { step: "01", icon: Gamepad2, color: "text-neon-green", border: "border-neon-green/30", bg: "bg-neon-green/5", title: "Browse Listings", desc: "Find the perfect eFootball account with detailed stats and screenshots." },
            { step: "02", icon: ShieldCheck, color: "text-neon-blue", border: "border-neon-blue/30", bg: "bg-neon-blue/5", title: "Pay in Escrow", desc: "Your payment is held securely — the seller never gets it until you're happy." },
            { step: "03", icon: Zap, color: "text-neon-purple", border: "border-neon-purple/30", bg: "bg-neon-purple/5", title: "Receive Account", desc: "The seller delivers encrypted credentials directly through the platform." },
            { step: "04", icon: Trophy, color: "text-neon-yellow", border: "border-neon-yellow/30", bg: "bg-neon-yellow/5", title: "Confirm & Done", desc: "Confirm it works and funds release to the seller. Dispute if anything's wrong." },
          ].map((item, i) => (
            <div key={item.step} className="relative">
              <div className={`rounded-2xl border ${item.border} ${item.bg} p-5 h-full`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl border ${item.border} flex items-center justify-center`}>
                    <item.icon size={18} className={item.color} />
                  </div>
                  <span className="text-2xl font-black text-bg-border">{item.step}</span>
                </div>
                <h3 className="font-semibold mb-1.5">{item.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
              </div>
              {i < 3 && (
                <div className="hidden md:flex absolute top-1/2 -right-2 z-10 w-4 h-4 items-center justify-center">
                  <ChevronRight size={14} className="text-text-muted" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Why choose us ── */}
      <section className="bg-bg-surface border-y border-bg-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-center text-2xl font-bold mb-10">
            Why Gamers Choose <span className="text-neon-green">Eshabiki</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: ShieldCheck, color: "neon-green", title: "Zero Scam Risk", desc: "Escrow holds your money until you confirm the account works — if anything goes wrong, you get a full refund." },
              { icon: Gamepad2, color: "neon-blue", title: "Built for eFootball", desc: "List squad OVR, division rank, coin balance, GP, and featured players. We speak the game's language." },
              { icon: Users, color: "neon-purple", title: "Admin-Backed Disputes", desc: "Every dispute is reviewed by a real admin who makes a fair, informed decision — not an algorithm." },
            ].map((f) => (
              <div key={f.title} className="bg-bg-elevated border border-bg-border rounded-2xl p-6 listing-card-hover">
                <div className={`w-12 h-12 rounded-2xl bg-${f.color}/10 border border-${f.color}/20 flex items-center justify-center mb-4`}>
                  <f.icon size={22} className={`text-${f.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-16">
        <div className="neon-border rounded-2xl bg-bg-elevated p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 gaming-grid opacity-50 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-neon-green/10 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <Gamepad2 size={40} className="mx-auto mb-4 text-neon-green" />
            <h2 className="text-3xl font-black mb-3">
              Ready to trade safely?
            </h2>
            <p className="text-text-muted mb-8 max-w-md mx-auto">
              Join the most trusted eFootball marketplace. Free to join, safe to trade.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/listings">
                <Button size="lg" className="glow-green">
                  Shop Now <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
