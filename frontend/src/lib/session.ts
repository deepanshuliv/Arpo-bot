"use client";

import { useMemo, useSyncExternalStore } from "react";

export interface Session {
  token: string;
  role: string;
  name: string;
}

// A string snapshot keeps useSyncExternalStore stable between renders
function readSnapshot() {
  const token = localStorage.getItem("arpo_token") ?? "";
  const role = localStorage.getItem("arpo_role") ?? "";
  const name = localStorage.getItem("arpo_name") ?? "";
  return JSON.stringify([token, role, name]);
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * The signed-in user from localStorage. `undefined` while rendering on the
 * server / before hydration, `null` when signed out.
 */
export function useSession(): Session | null | undefined {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => null);
  return useMemo(() => {
    if (snapshot === null) return undefined;
    const [token, role, name] = JSON.parse(snapshot) as string[];
    return token ? { token, role, name } : null;
  }, [snapshot]);
}
