"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Code, CheckCircle, AlertTriangle } from "lucide-react";

export function MatchCodePatternForm({
  currentPattern,
  currentHint,
}: {
  currentPattern: string;
  currentHint: string;
}) {
  const [pattern, setPattern] = useState(currentPattern);
  const [hint, setHint] = useState(currentHint);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Live-test the regex so the admin can see immediately if it's valid
  const regexError = (() => {
    try { new RegExp(pattern); return ""; }
    catch (e) { return (e as Error).message; }
  })();

  const testCodes = ["12345678", "1234-5678", "abcdefgh", "1234"];
  const testResults = testCodes.map((code) => {
    try { return { code, match: new RegExp(pattern).test(code) }; }
    catch { return { code, match: false }; }
  });

  const save = async () => {
    setError("");
    if (regexError) { setError("Fix the regex error first"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/challenges/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchCodePattern: pattern, matchCodeHint: hint }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Regex Pattern
        </label>
        <Input
          value={pattern}
          onChange={(e) => { setPattern(e.target.value); setSaved(false); }}
          placeholder="^\d{4}-?\d{4}$"
          className="font-mono text-sm"
        />
        {regexError ? (
          <p className="text-xs text-neon-red mt-1 flex items-center gap-1">
            <AlertTriangle size={11} /> Invalid regex: {regexError}
          </p>
        ) : (
          <p className="text-xs text-text-muted mt-1">
            Standard JavaScript regex. Use <code className="bg-bg-elevated px-1 rounded">^</code> and <code className="bg-bg-elevated px-1 rounded">$</code> anchors to match the whole string.
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Hint shown to players
        </label>
        <Input
          value={hint}
          onChange={(e) => { setHint(e.target.value); setSaved(false); }}
          placeholder="8 digits, e.g. 12345678 or 1234-5678"
        />
        <p className="text-xs text-text-muted mt-1">
          Displayed under the code input field so players know the expected format.
        </p>
      </div>

      {/* Live test results */}
      {!regexError && (
        <div className="rounded-xl border border-bg-border bg-bg-elevated px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-text-muted">Live test</p>
          <div className="grid grid-cols-2 gap-1.5">
            {testResults.map(({ code, match }) => (
              <div key={code} className="flex items-center gap-2 text-xs">
                {match
                  ? <CheckCircle size={12} className="text-neon-green shrink-0" />
                  : <AlertTriangle size={12} className="text-neon-red shrink-0" />}
                <code className="font-mono">{code}</code>
                <span className={match ? "text-neon-green" : "text-neon-red"}>
                  {match ? "pass" : "fail"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-neon-red">{error}</p>
      )}

      <Button
        variant="primary"
        onClick={save}
        loading={saving}
        disabled={!!regexError}
      >
        {saved ? <><CheckCircle size={14} /> Saved</> : <><Code size={14} /> Save Pattern</>}
      </Button>
    </div>
  );
}
