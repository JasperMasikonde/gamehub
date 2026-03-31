"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Lock, Eye, EyeOff, Copy, Check } from "lucide-react";

export function CredentialsReveal({ transactionId }: { transactionId: string }) {
  const [credentials, setCredentials] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const reveal = async () => {
    setLoading(true);
    const res = await fetch(`/api/transactions/${transactionId}/credentials`);
    const json = await res.json();
    if (res.ok) setCredentials(json.credentials);
    setLoading(false);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-neon-green" />
          <h2 className="font-semibold text-sm">Account Credentials</h2>
        </div>
      </CardHeader>
      <CardContent>
        {!credentials ? (
          <Button
            onClick={reveal}
            loading={loading}
            variant="secondary"
            className="w-full"
          >
            <Eye size={14} />
            Reveal Credentials
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(credentials).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between bg-bg-elevated border border-bg-border rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-xs text-text-muted capitalize">{key}</p>
                  <p className="text-sm font-mono text-text-primary">
                    {key === "password" && !showPassword
                      ? "••••••••"
                      : value}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {key === "password" && (
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-text-muted hover:text-text-primary p-1"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                  <button
                    onClick={() => copy(value, key)}
                    className="text-text-muted hover:text-neon-blue p-1 transition-colors"
                  >
                    {copied === key ? (
                      <Check size={14} className="text-neon-green" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
            <p className="text-xs text-text-muted mt-1">
              Keep these credentials secure. Change the password after logging in.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
