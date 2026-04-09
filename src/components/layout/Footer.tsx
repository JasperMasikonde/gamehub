import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-bg-border bg-bg-surface mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center">
            <img src="/logo.svg" alt="Eshabiki" className="h-8 w-auto" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-muted">
            <Link href="/listings" className="hover:text-text-primary transition-colors">
              Marketplace
            </Link>
            <Link href="/register" className="hover:text-text-primary transition-colors">
              Sell Account
            </Link>
            <Link href="/terms" className="hover:text-text-primary transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/refund-policy" className="hover:text-text-primary transition-colors">
              Refund Policy
            </Link>
          </div>
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Eshabiki. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
