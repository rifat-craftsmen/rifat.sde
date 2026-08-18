import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { PokemonCard } from '../components/PokemonCard';
import { SearchBar } from '../components/SearchBar';
import { SkeletonGrid } from '../components/SkeletonCard';
import { usePokemonRaw } from '../hooks/usePokemonRaw';

/**
 * Raw Fetch implementation:
 * - useEffect + fetch + AbortController for race condition prevention
 * - Manual in-memory cache (module-level Map)
 * - Fully manual loading / error / empty state management
 */
export function RawFetchView() {
  const [search, setSearch] = useState('');
  const { state, retry } = usePokemonRaw(search);

  return (
    <div className="flex flex-col gap-6">
      {/* Explanation banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Raw Fetch</strong> — uses <code className="bg-amber-100 px-1 rounded">useEffect</code> +{' '}
        <code className="bg-amber-100 px-1 rounded">AbortController</code> to cancel stale requests.
        Caching is handled manually via a module-level <code className="bg-amber-100 px-1 rounded">Map</code>.
        Every loading/error/empty state is managed by hand.
      </div>

      <SearchBar value={search} onChange={setSearch} />

      {state.status === 'loading' && <SkeletonGrid count={10} />}

      {state.status === 'error' && (
        <ErrorState message={state.message} onRetry={retry} />
      )}

      {state.status === 'success' && state.data.length === 0 && (
        <EmptyState search={search} />
      )}

      {state.status === 'success' && state.data.length > 0 && (
        <>
          <p className="text-xs text-slate-400">
            {state.data.length} result{state.data.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {state.data.map((p) => (
              <PokemonCard key={p.id} pokemon={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
