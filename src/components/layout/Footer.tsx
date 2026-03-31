import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-bg-border bg-bg-surface mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gamepad2 size={20} className="text-neon-green" />
            <span className="font-bold text-text-primary">
              Game<span className="text-neon-green">Hub</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-text-muted">
            <Link href="/listings" className="hover:text-text-primary transition-colors">
              Marketplace
            </Link>
            <Link href="/register" className="hover:text-text-primary transition-colors">
              Sell Account
            </Link>
          </div>
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} GameHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
