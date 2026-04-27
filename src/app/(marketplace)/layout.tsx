import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VisitorTracker } from "@/components/layout/VisitorTracker";
import { AnnouncementBar } from "@/components/banners/AnnouncementBar";
import { prisma } from "@/lib/prisma";

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let bar = null;
  try {
    bar = await prisma.promoBanner.findFirst({
      where: { isActive: true, variant: "ANNOUNCEMENT" },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // DB unreachable at build time — render without banner
  }

  return (
    <div className="min-h-screen flex flex-col">
      <VisitorTracker />
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
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      <Footer />
    </div>
  );
}
