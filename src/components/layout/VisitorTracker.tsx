"use client";

import { useEffect } from "react";

/** Records one unique visit per visitor per day (using localStorage for visitor ID). */
export function VisitorTracker() {
  useEffect(() => {
    // Only run once per browser session to avoid hammering the API
    if (sessionStorage.getItem("visit_sent")) return;

    // Get or create a persistent visitor ID
    let sid = localStorage.getItem("visitor_sid");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("visitor_sid", sid);
    }

    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid }),
    }).then(() => {
      sessionStorage.setItem("visit_sent", "1");
    }).catch(() => {});
  }, []);

  return null;
}
