export const dynamic = "force-dynamic";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "East Africa's #1 eFootball Platform | Eshabiki",
  description:
    "Play, compete, and trade on Kenya's biggest eFootball ecosystem. Buy & sell accounts with M-Pesa escrow, enter tournaments, challenge players for cash, push your rank, and shop in-game goods — all in one place.",
  keywords: [
    "eFootball Kenya",
    "eFootball platform Kenya",
    "buy eFootball account Kenya",
    "sell eFootball account Kenya",
    "eFootball tournament Kenya",
    "eFootball challenges wager Kenya",
    "eFootball rank push Kenya",
    "eFootball marketplace Kenya",
    "M-Pesa eFootball",
  ],
  openGraph: {
    title: "East Africa's #1 eFootball Platform | Eshabiki",
    description:
      "Kenya's full eFootball ecosystem — accounts marketplace, wager challenges, tournaments, rank push, and more. M-Pesa escrow. Free to join.",
  },
};

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ListingCard } from "@/components/listings/ListingCard";
import { AnnouncementBar } from "@/components/banners/AnnouncementBar";
import { HeroBanner } from "@/components/banners/HeroBanner";
import { FeatureBanner } from "@/components/banners/FeatureBanner";
import { OpenChallengeTeaser } from "@/components/challenges/OpenChallengeTeaser";
import { prisma } from "@/lib/prisma";
import {
  Gamepad2, ShieldCheck, Zap, Trophy, ArrowRight,
  Users, TrendingUp, Star, ChevronRight, CheckCircle,
  Swords, ShoppingBag, Store, Flame,
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
  const [stats, featured, bar, promoBanners] = await Promise.all([
    getStats(),
    getFeaturedListings(),
    prisma.promoBanner.findFirst({
      where: { isActive: true, variant: "ANNOUNCEMENT" },
      orderBy: { createdAt: "desc" },
    }).catch(() => null),
    prisma.promoBanner.findMany({
      where: { isActive: true, variant: { in: ["HERO", "FEATURE"] } },
      orderBy: { createdAt: "desc" },
      include: {
        tournament: {
          select: {
            game: true,
            prizePool: true,
            startDate: true,
            _count: { select: { participants: true } },
          },
        },
      },
    }).catch(() => []),
  ]);

  const heroBanner = promoBanners.find(b => b.variant === "HERO") ?? null;
  const featureBanners = promoBanners.filter(b => b.variant === "FEATURE");

  // Random open challenge teaser
  const now = new Date();
  const openCount = await prisma.challenge.count({
    where: { status: "OPEN", expiresAt: { gt: now } },
  }).catch(() => 0);
  const spotlightChallenge = openCount > 0
    ? await prisma.challenge.findFirst({
        where: { status: "OPEN", expiresAt: { gt: now } },
        skip: Math.floor(Math.random() * openCount),
        include: {
          host: { select: { username: true, displayName: true, avatarUrl: true } },
        },
      }).catch(() => null)
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      {bar && (
        <AnnouncementBar
          id={bar.id}
          title={bar.title}
          ctaLabel={bar.ctaLabel}
          ctaUrl={bar.ctaUrl}
          accentColor={bar.accentColor}
          badgeText={bar.badgeText}
        />
      )}
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden gaming-grid">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-neon-green/8 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-neon-blue/6 rounded-full blur-3xl" />
          <div className="absolute top-60 left-1/2 w-64 h-64 bg-neon-purple/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-neon-blue/20 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-green/30 bg-neon-green/5 text-neon-green text-xs font-semibold mb-8 tracking-wide">
            <Flame size={12} className="fill-neon-green" />
            EAST AFRICA&apos;S #1 eFOOTBALL PLATFORM
          </div>

          <h1 className="text-5xl sm:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            One Platform.{" "}
            <span className="gradient-text text-glow-green">Endless Game.</span>
            <br />
            <span className="text-text-subtle">Built for East Africa.</span>
          </h1>

          <p className="text-text-subtle text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Buy accounts. Challenge players. Enter tournaments. Push your rank. Shop in-game goods.
            Everything eFootball — protected by M-Pesa escrow and built for the Kenyan community.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/listings">
              <Button size="lg" className="glow-green text-base px-8 py-4 h-auto">
                Explore the Platform <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="text-base px-8 py-4 h-auto">
                Join Free — No Card Needed
              </Button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {[
              { value: stats.listings, label: "Active Listings", color: "text-neon-green" },
              { value: stats.users, label: "Community Members", color: "text-neon-blue" },
              { value: stats.completed, label: "Completed Trades", color: "text-neon-purple" },
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

      {/* ── Promo Banners + Challenge Teaser ── */}
      {(heroBanner || featureBanners.length > 0 || spotlightChallenge) && (
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pb-10 space-y-4">
          {heroBanner && (
            <HeroBanner
              title={heroBanner.title}
              subtitle={heroBanner.subtitle}
              badgeText={heroBanner.badgeText}
              ctaLabel={heroBanner.ctaLabel}
              ctaUrl={heroBanner.ctaUrl}
              accentColor={heroBanner.accentColor}
              countdownTo={heroBanner.countdownTo ? new Date(heroBanner.countdownTo).toISOString() : null}
              tournament={heroBanner.tournament ? {
                name: heroBanner.tournament.game,
                game: heroBanner.tournament.game,
                prizePool: Number(heroBanner.tournament.prizePool),
                participantCount: heroBanner.tournament._count.participants,
                startDate: heroBanner.tournament.startDate,
              } : null}
            />
          )}
          {featureBanners.length > 0 && (
            <div className={`grid gap-4 ${featureBanners.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
              {featureBanners.map(b => (
                <FeatureBanner
                  key={b.id}
                  title={b.title}
                  subtitle={b.subtitle}
                  badgeText={b.badgeText}
                  ctaLabel={b.ctaLabel}
                  ctaUrl={b.ctaUrl}
                  accentColor={b.accentColor}
                  countdownTo={b.countdownTo ? new Date(b.countdownTo).toISOString() : null}
                  tournament={b.tournament ? {
                    game: b.tournament.game,
                    prizePool: Number(b.tournament.prizePool),
                    participantCount: b.tournament._count.participants,
                  } : null}
                />
              ))}
            </div>
          )}
          {spotlightChallenge && (
            <OpenChallengeTeaser challenge={spotlightChallenge} totalOpen={openCount} />
          )}
        </section>
      )}

      {/* ── Trust badges ── */}
      <section className="border-y border-bg-border bg-bg-surface/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-6">
          {[
            { icon: ShieldCheck, text: "M-Pesa Escrow", color: "text-neon-green" },
            { icon: CheckCircle, text: "Verified Sellers", color: "text-neon-blue" },
            { icon: Swords, text: "Wager Challenges", color: "text-neon-orange" },
            { icon: Trophy, text: "Live Tournaments", color: "text-neon-yellow" },
            { icon: TrendingUp, text: "Rank Push Service", color: "text-neon-purple" },
            { icon: Users, text: "Dispute Resolution", color: "text-neon-red" },
          ].map((b) => (
            <div key={b.text} className="flex items-center gap-1.5 text-sm text-text-muted">
              <b.icon size={14} className={b.color} />
              {b.text}
            </div>
          ))}
        </div>
      </section>

      {/* ── What You Can Do on Eshabiki ── */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">
            What You Can Do on{" "}
            <span className="gradient-text">Eshabiki</span>
          </h2>
          <p className="text-text-muted text-lg max-w-xl mx-auto">
            Five ways to play, compete, and earn — all under one roof.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Marketplace */}
          <div className="bg-bg-elevated border border-bg-border rounded-2xl p-6 listing-card-hover flex flex-col gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/25 flex items-center justify-center">
              <Store size={22} className="text-neon-green" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Marketplace</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Buy or sell eFootball accounts safely. Every transaction is held in M-Pesa escrow until you confirm — guaranteed refund if anything goes wrong.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neon-green font-semibold tracking-wide">ESCROW PROTECTED</span>
              <Link href="/listings">
                <Button size="sm" className="glow-green h-8 px-4 text-xs">
                  Browse Accounts <ChevronRight size={13} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Challenges */}
          <div className="bg-bg-elevated border border-bg-border rounded-2xl p-6 listing-card-hover flex flex-col gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-neon-orange/10 border border-neon-orange/25 flex items-center justify-center">
              <Swords size={22} className="text-neon-orange" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Challenges</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Post or accept wager-based 1v1 eFootball matches. Both players put up a stake — winner takes the full prize pot. Think you&apos;re the best? Prove it.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neon-orange font-semibold tracking-wide">WINNER TAKES ALL</span>
              <Link href="/challenges">
                <Button size="sm" variant="outline" className="h-8 px-4 text-xs border-neon-orange/40 text-neon-orange hover:bg-neon-orange/10">
                  View Challenges <ChevronRight size={13} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Shop */}
          <div className="bg-bg-elevated border border-bg-border rounded-2xl p-6 listing-card-hover flex flex-col gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-neon-purple/10 border border-neon-purple/25 flex items-center justify-center">
              <ShoppingBag size={22} className="text-neon-purple" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Shop</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Pick up coins, digital items, and in-game goods directly on the platform. Fast delivery, M-Pesa payments, no middleman hassle.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neon-purple font-semibold tracking-wide">INSTANT DELIVERY</span>
              <Link href="/shop">
                <Button size="sm" variant="outline" className="h-8 px-4 text-xs border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10">
                  Visit Shop <ChevronRight size={13} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Tournaments */}
          <div className="bg-bg-elevated border border-bg-border rounded-2xl p-6 listing-card-hover flex flex-col gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-neon-yellow/10 border border-neon-yellow/25 flex items-center justify-center">
              <Trophy size={22} className="text-neon-yellow" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Tournaments</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Compete in community-run eFootball tournaments. Register, battle through the brackets, and claim your spot at the top of East African eFootball.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neon-yellow font-semibold tracking-wide">COMMUNITY EVENTS</span>
              <Link href="/tournaments">
                <Button size="sm" variant="outline" className="h-8 px-4 text-xs border-neon-yellow/40 text-neon-yellow hover:bg-neon-yellow/10">
                  See Tournaments <ChevronRight size={13} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Rank Push */}
          <div className="bg-bg-elevated border border-bg-border rounded-2xl p-6 listing-card-hover flex flex-col gap-4 group sm:col-span-2 lg:col-span-1">
            <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 border border-neon-blue/25 flex items-center justify-center">
              <TrendingUp size={22} className="text-neon-blue" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Rank Push</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Stuck in a division? Get professional help climbing the ranks. Our vetted boosters push your account to the next division — fast, safe, and guaranteed.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neon-blue font-semibold tracking-wide">VETTED BOOSTERS</span>
              <Link href="/rank-push">
                <Button size="sm" variant="outline" className="h-8 px-4 text-xs border-neon-blue/40 text-neon-blue hover:bg-neon-blue/10">
                  Push My Rank <ChevronRight size={13} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Listings ── */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-16 border-t border-bg-border">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">
                Marketplace: Featured <span className="text-neon-green">Accounts</span>
              </h2>
              <p className="text-sm text-text-muted mt-1">Top picks from verified sellers — escrow protected</p>
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

      {/* ── How it works (Marketplace) ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-green/30 bg-neon-green/5 text-neon-green text-xs font-semibold mb-4 tracking-wide">
            <Store size={11} />
            MARKETPLACE
          </div>
          <h2 className="text-3xl font-bold mb-3">
            How the <span className="gradient-text">Escrow</span> Works
          </h2>
          <p className="text-text-muted">
            Buy any eFootball account safely in 4 steps — your money is never at risk
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {[
            { step: "01", icon: Gamepad2, color: "text-neon-green", border: "border-neon-green/30", bg: "bg-neon-green/5", title: "Browse Listings", desc: "Find the perfect eFootball account with detailed stats and screenshots." },
            { step: "02", icon: ShieldCheck, color: "text-neon-blue", border: "border-neon-blue/30", bg: "bg-neon-blue/5", title: "Pay in Escrow", desc: "Your M-Pesa payment is held securely — the seller never gets it until you're happy." },
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
              { icon: ShieldCheck, color: "neon-green", title: "Zero Scam Risk", desc: "Escrow holds your money until you confirm the account works — if anything goes wrong, you get a full refund. No exceptions." },
              { icon: Gamepad2, color: "neon-blue", title: "Built for eFootball", desc: "List squad OVR, division rank, coin balance, GP, and featured players. We speak the game's language fluently." },
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

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="flex flex-col gap-3">
          {[
            {
              q: "How do I buy an eFootball account in Kenya?",
              a: "Browse listings on Eshabiki, choose an account, and pay via M-Pesa. Your payment goes into escrow — the seller delivers the account credentials, you verify it works, then confirm. Funds release to the seller only after you're satisfied.",
            },
            {
              q: "How do I sell my eFootball account in Kenya?",
              a: "Create a free Eshabiki account, click 'Sell Account', upload screenshots of your squad, set your price, and publish. When a buyer pays, you deliver the credentials through the platform. You receive your M-Pesa payout once the buyer confirms.",
            },
            {
              q: "Is it safe to buy and sell eFootball accounts?",
              a: "Yes — Eshabiki uses an escrow system. Money is never sent directly to the seller. It's held on the platform until the buyer confirms the account. If there's a dispute, our admin team reviews and resolves it fairly.",
            },
            {
              q: "What payment method is used?",
              a: "All payments are made via M-Pesa (NCBA STK Push). You receive a prompt on your phone, enter your PIN, and the transaction is complete. No cards or bank transfers needed.",
            },
            {
              q: "How do Challenges work?",
              a: "Post or accept a 1v1 challenge in the Challenges section. Both players deposit a wager via M-Pesa. You play the match and submit the result. Once verified, the winner receives the full prize pot. Disputes are handled by our admin team.",
            },
            {
              q: "How do Tournaments work?",
              a: "Tournaments are community events organised on Eshabiki. Register before the deadline, pay any entry fee via M-Pesa, and compete through the bracket. Results and standings are managed on the platform. Watch the Tournaments page for upcoming events.",
            },
          ].map(({ q, a }) => (
            <details
              key={q}
              className="group bg-bg-elevated border border-bg-border rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-semibold text-sm text-text-primary hover:text-neon-green transition-colors">
                {q}
                <ChevronRight size={15} className="shrink-0 text-text-muted group-open:rotate-90 transition-transform" />
              </summary>
              <p className="px-5 pb-4 text-sm text-text-muted leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-16">
        <div className="neon-border rounded-2xl bg-bg-elevated p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 gaming-grid opacity-50 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-neon-green/10 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <Gamepad2 size={40} className="mx-auto mb-4 text-neon-green" />
            <h2 className="text-3xl font-black mb-3">
              Your eFootball journey starts here.
            </h2>
            <p className="text-text-muted mb-2 max-w-lg mx-auto">
              Trade accounts. Win wagers. Dominate tournaments. Push your rank.
              Everything you need — one platform, one community.
            </p>
            <p className="text-neon-green text-sm font-semibold mb-8">
              Free to join. M-Pesa protected. Built for Kenya.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <Button size="lg" className="glow-green">
                  Join the Community <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/listings">
                <Button size="lg" variant="outline">
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── JSON-LD structured data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Eshabiki",
              url: "https://eshabiki.com",
              description: "East Africa's #1 eFootball platform — marketplace, challenges, tournaments, rank push, and shop.",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://eshabiki.com/listings?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Eshabiki",
              url: "https://eshabiki.com",
              logo: "https://eshabiki.com/logo.svg",
              description: "Kenya's full eFootball ecosystem with M-Pesa escrow payments, wager challenges, tournaments, and rank push services.",
              areaServed: "KE",
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "How do I buy an eFootball account in Kenya?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Browse listings on Eshabiki, choose an account, and pay via M-Pesa. Your payment goes into escrow — the seller delivers the account credentials, you verify it works, then confirm. Funds release to the seller only after you're satisfied.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How do I sell my eFootball account in Kenya?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Create a free Eshabiki account, click Sell Account, upload screenshots of your squad, set your price, and publish. When a buyer pays, you deliver the credentials through the platform. You receive your M-Pesa payout once the buyer confirms.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is it safe to buy and sell eFootball accounts?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes — Eshabiki uses an escrow system. Money is never sent directly to the seller. It's held on the platform until the buyer confirms the account. If there's a dispute, our admin team reviews and resolves it fairly.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What payment method is used?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "All payments are made via M-Pesa (NCBA STK Push). You receive a prompt on your phone, enter your PIN, and the transaction is complete.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How do Challenges work?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Post or accept a 1v1 challenge. Both players deposit a wager via M-Pesa. Play the match, submit the result, and the winner receives the full prize pot.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How do Tournaments work?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Register for community tournaments on Eshabiki, pay any entry fee via M-Pesa, and compete through the bracket. Results and standings are managed on the platform.",
                  },
                },
              ],
            },
          ]),
        }}
      />

      <Footer />
    </div>
  );
}
