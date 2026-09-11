"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Lightweight data-fetching hook. No new dependencies — plain fetch + useEffect.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useFetch<MyType>("/api/dashboard");
 */
export function useFetch<T>(url: string | null) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });
  const controllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(url, { signal: controller.signal });
      const json = await res.json();
      if (!controller.signal.aborted) {
        // Handle the standardized { success, data } envelope
        if (json.success === true && json.data !== undefined) {
          setState({ data: json.data as T, loading: false, error: null });
        } else if (json.success === false && json.error) {
          setState({ data: null, loading: false, error: json.error.message ?? "Unknown error" });
        } else {
          // Non-envelope response (legacy routes)
          setState({ data: json as T, loading: false, error: null });
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState({ data: null, loading: false, error: err instanceof Error ? err.message : "Fetch failed" });
    }
  }, [url]);

  useEffect(() => {
    fetchData();
    return () => controllerRef.current?.abort();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

/**
 * Fire a POST/PUT/DELETE and return the parsed JSON.
 */
export async function apiFetch<T = unknown>(url: string, options?: RequestInit): Promise<{ ok: boolean; data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const json = await res.json();
    if (json.success === true) {
      return { ok: true, data: json.data as T, error: null };
    }
    return { ok: false, data: null, error: json.error?.message ?? `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : "Request failed" };
  }
}
