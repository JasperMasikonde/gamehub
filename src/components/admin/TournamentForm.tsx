"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2, ToggleLeft, ToggleRight, Lock, Globe } from "lucide-react";

interface Props {
  tournamentId?: string;
  defaultValues?: {
    name?: string; slug?: string; game?: string; type?: string;
    maxParticipants?: number; requiresPayment?: boolean; entryFee?: string;
    prizePool?: string; currency?: string; description?: string;
    privateDescription?: string; rules?: string;
    startDate?: string; endDate?: string;
    homeAndAway?: boolean; groupCount?: number; groupsAdvance?: number;
  };
}

export function TournamentForm({ tournamentId, defaultValues = {} }: Props) {
  const router = useRouter();
  const isEdit = !!tournamentId;
  const [name, setName] = useState(defaultValues.name ?? "");
  const [slug, setSlug] = useState(defaultValues.slug ?? "");
  const [game, setGame] = useState(defaultValues.game ?? "");
  const [type, setType] = useState(defaultValues.type ?? "KNOCKOUT");
  const [maxParticipants, setMaxParticipants] = useState(String(defaultValues.maxParticipants ?? 16));
  const [requiresPayment, setRequiresPayment] = useState(defaultValues.requiresPayment ?? false);
  const [entryFee, setEntryFee] = useState(defaultValues.entryFee ?? "0");
  const [prizePool, setPrizePool] = useState(defaultValues.prizePool ?? "0");
  const [description, setDescription] = useState(defaultValues.description ?? "");
  const [privateDescription, setPrivateDescription] = useState(defaultValues.privateDescription ?? "");
  const [rules, setRules] = useState(defaultValues.rules ?? "");
  const [startDate, setStartDate] = useState(defaultValues.startDate ?? "");
  const [endDate, setEndDate] = useState(defaultValues.endDate ?? "");
  const [homeAndAway, setHomeAndAway] = useState(defaultValues.homeAndAway ?? false);
  const [groupCount, setGroupCount] = useState(String(defaultValues.groupCount ?? 4));
  const [groupsAdvance, setGroupsAdvance] = useState(String(defaultValues.groupsAdvance ?? 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function autoSlug(n: string) {
    return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const url = isEdit ? `/api/admin/tournaments/${tournamentId}` : "/api/admin/tournaments";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, slug, game, type,
          maxParticipants: Number(maxParticipants),
          requiresPayment,
          entryFee: requiresPayment ? Number(entryFee) : 0,
          prizePool: Number(prizePool),
          description: description || null,
          privateDescription: privateDescription || null,
          rules: rules || null,
          startDate: startDate || null,
          endDate: endDate || null,
          homeAndAway,
          groupCount: type === "CHAMPIONS_LEAGUE" ? Number(groupCount) : null,
          groupsAdvance: type === "CHAMPIONS_LEAGUE" ? Number(groupsAdvance) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      router.push(isEdit ? `/admin/tournaments/${tournamentId}` : "/admin/tournaments");
      router.refresh();
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  const cls = "w-full px-3 py-2.5 rounded-xl bg-bg-elevated border border-bg-border text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-neon-blue/50 transition-colors";
  const isCL = type === "CHAMPIONS_LEAGUE";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Tournament Name *</label>
          <input value={name} onChange={e => { setName(e.target.value); if (!isEdit) setSlug(autoSlug(e.target.value)); }} required className={cls} placeholder="FC 25 Champions Cup" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Slug *</label>
          <input value={slug} onChange={e => setSlug(e.target.value)} required className={cls} placeholder="fc25-champions-cup" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Game *</label>
          <input value={game} onChange={e => setGame(e.target.value)} required className={cls} placeholder="FC 25" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Format *</label>
          <select value={type} onChange={e => setType(e.target.value)} className={cls}>
            <option value="KNOCKOUT">Knockout</option>
            <option value="LEAGUE">League</option>
            <option value="CHAMPIONS_LEAGUE">Champions League</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Max Participants</label>
          <input type="number" min="2" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} className={cls} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Prize Pool (KES)</label>
          <input type="number" min="0" step="0.01" value={prizePool} onChange={e => setPrizePool(e.target.value)} className={cls} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Start Date</label>
          <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className={cls} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">End Date</label>
          <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className={cls} />
        </div>
      </div>

      {/* Champions League options */}
      {isCL && (
        <div className="rounded-xl border border-neon-blue/20 bg-neon-blue/5 p-4 space-y-4">
          <p className="text-sm font-semibold text-neon-blue">Champions League Settings</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">Number of Groups *</label>
              <input type="number" min="2" max="16" value={groupCount} onChange={e => setGroupCount(e.target.value)} required={isCL} className={cls} placeholder="4" />
              <p className="text-[10px] text-text-muted mt-1">e.g. 4 groups like Group A–D</p>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Teams Advancing Per Group</label>
              <input type="number" min="1" value={groupsAdvance} onChange={e => setGroupsAdvance(e.target.value)} className={cls} placeholder="2" />
              <p className="text-[10px] text-text-muted mt-1">Top N teams go to knockout</p>
            </div>
          </div>
        </div>
      )}

      {/* Home & Away toggle */}
      {(type === "LEAGUE" || isCL) && (
        <div className="rounded-xl border border-bg-border bg-bg-elevated p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Home & Away</p>
              <p className="text-xs text-text-muted mt-0.5">
                {homeAndAway
                  ? "Each fixture is played twice (home and away legs)"
                  : "Each fixture is played once"}
              </p>
            </div>
            <button type="button" onClick={() => setHomeAndAway(p => !p)} className="transition-colors">
              {homeAndAway
                ? <ToggleRight size={32} className="text-neon-green" />
                : <ToggleLeft size={32} className="text-text-muted" />}
            </button>
          </div>
        </div>
      )}

      {/* Entry fee toggle */}
      <div className="rounded-xl border border-bg-border bg-bg-elevated p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Paid Entry</p>
            <p className="text-xs text-text-muted mt-0.5">
              {requiresPayment ? "Players must pay to enrol" : "Free entry — anyone can join"}
            </p>
          </div>
          <button type="button" onClick={() => setRequiresPayment(p => !p)} className="flex items-center gap-1.5 transition-colors">
            {requiresPayment
              ? <ToggleRight size={32} className="text-neon-green" />
              : <ToggleLeft size={32} className="text-text-muted" />}
          </button>
        </div>

        {requiresPayment && (
          <div>
            <label className="block text-xs text-text-muted mb-1">Entry Fee (KES) *</label>
            <input
              type="number" min="1" step="0.01" value={entryFee} onChange={e => setEntryFee(e.target.value)}
              required={requiresPayment} className={cls} placeholder="e.g. 200"
            />
            <p className="text-xs text-text-muted mt-1.5">Players will be prompted to pay via M-Pesa when enrolling.</p>
          </div>
        )}
      </div>

      {/* Public description */}
      <div className="rounded-xl border border-bg-border bg-bg-elevated p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={13} className="text-neon-blue shrink-0" />
          <p className="text-sm font-semibold text-text-primary">Public Description</p>
          <span className="ml-auto text-[10px] text-neon-blue font-semibold bg-neon-blue/10 border border-neon-blue/20 px-2 py-0.5 rounded-full">Visible to everyone</span>
        </div>
        <p className="text-xs text-text-muted">Shown on the tournament page to all visitors before they register.</p>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className={cls + " resize-none mt-1"}
          placeholder="Hype the tournament — format, prize, who should enter…"
        />
      </div>

      {/* Private description */}
      <div className="rounded-xl border border-neon-purple/25 bg-neon-purple/5 p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={13} className="text-neon-purple shrink-0" />
          <p className="text-sm font-semibold text-text-primary">Members-Only Description</p>
          <span className="ml-auto text-[10px] text-neon-purple font-semibold bg-neon-purple/10 border border-neon-purple/20 px-2 py-0.5 rounded-full">Registered players only</span>
        </div>
        <p className="text-xs text-text-muted">Only visible to players who have paid and registered. Use this for match codes, WhatsApp links, entry instructions, bracket seeds, or anything sensitive.</p>
        <textarea
          value={privateDescription}
          onChange={e => setPrivateDescription(e.target.value)}
          rows={4}
          className={cls + " resize-none mt-1 border-neon-purple/20 focus:border-neon-purple/50"}
          placeholder="e.g. WhatsApp group link, platform match codes, seeding instructions…"
        />
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">Rules</label>
        <textarea value={rules} onChange={e => setRules(e.target.value)} rows={4} className={cls + " resize-none"} placeholder="Tournament rules and format…" />
      </div>

      {error && <p className="text-sm text-neon-red">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : isEdit ? "Save Changes" : "Create Tournament"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
