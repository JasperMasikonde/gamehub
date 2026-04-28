import { Navbar } from "@/components/layout/Navbar";
import { AnnouncementBar } from "@/components/banners/AnnouncementBar";
import { VisitorTracker } from "@/components/layout/VisitorTracker";
import { prisma } from "@/lib/prisma";

export default async function ChatLayout({
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
    // DB unreachable at build time
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
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
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  );
}
