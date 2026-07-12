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

