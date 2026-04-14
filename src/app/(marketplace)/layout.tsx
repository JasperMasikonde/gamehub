import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VisitorTracker } from "@/components/layout/VisitorTracker";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <VisitorTracker />
      <Navbar />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      <Footer />
    </div>
  );
}
