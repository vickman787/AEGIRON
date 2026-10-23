"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { initialCases, transition, type Case, type Action } from "@/lib/cases";
type Store = { cases: Case[]; act: (id: string, action: Action) => void; reset: () => void; hydrated: boolean };
const Context = createContext<Store | null>(null);
const KEY = "aegiron-demo-v1";
function restore(raw: string | null): Case[] {
  if (!raw) return initialCases();
  try {
    const data = JSON.parse(raw) as Case[];
    if (!Array.isArray(data) || data.length !== 2) return initialCases();
    const base = initialCases();
    if (!base.every((c, index) => { const item = data[index]; return item?.id === c.id && item.kind === c.kind && Number.isInteger(item.revision) && item.revision > 0 && Object.keys(c.instruction).every(k => typeof item.instruction?.[k as keyof Case["instruction"]] === "string") && typeof item.capacity === "string" && Array.isArray(item.events) && item.events.every(e => typeof e.id === "string" && typeof e.title === "string" && typeof e.detail === "string" && typeof e.time === "string" && Number.isInteger(e.revision)); })) return base;
    return data;
  } catch { return initialCases(); }
}
export function CaseProvider({children}: {children: React.ReactNode}) {
  const [cases, setCases] = useState(initialCases);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Browser storage is solely demo data, never an authorization source for a provider.
    const timer = setTimeout(() => {
      try { setCases(restore(localStorage.getItem(KEY))); } catch { /* Storage can be disabled. */ }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { if (hydrated) { try { localStorage.setItem(KEY, JSON.stringify(cases)); } catch { /* Memory-only fallback. */ } } }, [cases, hydrated]);
  return <Context.Provider value={{cases, hydrated, act: (id, action) => setCases(current => current.map(c => c.id === id ? transition(c, action) : c)), reset: () => setCases(initialCases())}}>{children}</Context.Provider>;
}
export function useCases() { const store = useContext(Context); if (!store) throw new Error("CaseProvider missing"); return store; }
