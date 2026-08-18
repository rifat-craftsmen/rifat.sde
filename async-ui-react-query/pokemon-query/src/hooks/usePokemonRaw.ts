import { useEffect, useRef, useState } from 'react';
import { fetchPokemonList } from '../lib/api';
import type { AsyncState, PokemonSummary } from '../types/pokemon';

// Module-level manual cache: query → results
const manualCache = new Map<string, PokemonSummary[]>();

/** Exposed for testing — clears the in-memory cache */
export function clearPokemonCache() {
  manualCache.clear();
}

export function usePokemonRaw(search: string) {
  const [state, setState] = useState<AsyncState<PokemonSummary[]>>({
    status: 'loading',
  });

  // Track in-flight abort controller
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const cacheKey = 'all-151';

    async function load() {
      setState({ status: 'loading' });

      try {
        let all: PokemonSummary[];

        if (manualCache.has(cacheKey)) {
          // Cache hit — no network request needed
          all = manualCache.get(cacheKey)!;
        } else {
          all = await fetchPokemonList(151, controller.signal);
          // Store in manual cache only if request wasn't aborted
          if (!controller.signal.aborted) {
            manualCache.set(cacheKey, all);
          }
        }

        if (controller.signal.aborted) return;

        const filtered = search.trim()
          ? all.filter((p) => p.name.includes(search.toLowerCase().trim()))
          : all;

        setState({ status: 'success', data: filtered });
      } catch (err) {
        if (controller.signal.aborted) return; // ignore abort errors
        const message =
          err instanceof Error ? err.message : 'Something went wrong';
        setState({ status: 'error', message });
      }
    }

    load();

    return () => {
      controller.abort();
    };
  }, [search]);

  function retry() {
    // Clear cache to force a fresh fetch on retry
    manualCache.clear();
    setState({ status: 'loading' });
    // Re-trigger by updating state; the effect will run because search
    // hasn't changed, so we force it via a separate retry counter in the hook.
    // Simplest approach: just call load() again directly.
    const controller = new AbortController();
    abortRef.current = controller;

    fetchPokemonList(151, controller.signal)
      .then((all) => {
        if (controller.signal.aborted) return;
        manualCache.set('all-151', all);
        const filtered = search.trim()
          ? all.filter((p) => p.name.includes(search.toLowerCase().trim()))
          : all;
        setState({ status: 'success', data: filtered });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong',
        });
      });
  }

  return { state, retry };
}
