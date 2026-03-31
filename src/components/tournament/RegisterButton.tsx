"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2, UserPlus, Check } from "lucide-react";

interface Props { slug: string; isRegistered: boolean; isOpen: boolean; isFull: boolean; }

export function RegisterButton({ slug, isRegistered, isOpen, isFull }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done">(isRegistered ? "done" : "idle");
  const [error, setError] = useState("");
  const router = useRouter();

  async function register() {
    setState("loading"); setError("");
    try {
      const res = await fetch(`/api/tournaments/${slug}/register`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to register"); setState("idle"); return; }
      setState("done"); router.refresh();
    } catch { setError("Network error"); setState("idle"); }
  }

  if (state === "done" || isRegistered) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green/10 border border-neon-green/20 text-neon-green text-sm font-semibold">
        <Check size={15} /> Registered
      </div>
    );
  }
  if (!isOpen) return null;
  if (isFull) return <span className="text-sm text-neon-red font-semibold">Tournament Full</span>;

  return (
    <div>
      <Button variant="primary" onClick={register} disabled={state === "loading"}>
        {state === "loading" ? <><Loader2 size={15} className="animate-spin" /> Registering…</> : <><UserPlus size={15} /> Register</>}
      </Button>
      {error && <p className="text-xs text-neon-red mt-1">{error}</p>}
    </div>
  );
}
