import { LoginForm } from "@/components/auth/LoginForm";
import { Gamepad2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Gamepad2 size={32} className="text-neon-green" />
            <span className="text-2xl font-bold">
              Game<span className="text-neon-green text-glow-green">Hub</span>
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-muted mt-1">Sign in to your account</p>
        </div>

        <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
