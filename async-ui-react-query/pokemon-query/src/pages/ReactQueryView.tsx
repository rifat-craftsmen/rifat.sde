import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { PokemonCard } from '../components/PokemonCard';
import { SearchBar } from '../components/SearchBar';
import { SkeletonGrid } from '../components/SkeletonCard';
import { fetchPokemonList } from '../lib/api';
import type { PokemonSummary } from '../types/pokemon';

/**
 * React Query implementation:
 * - useQuery handles loading/error/caching automatically
 * - staleTime means cached results are returned instantly on re-visit
 * - No manual AbortController needed — React Query manages it
 * - No manual state variables — all derived from useQuery return value
 */
export function ReactQueryView() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery<PokemonSummary[]>({
    queryKey: ['pokemon-list'],
    queryFn: ({ signal }) => fetchPokemonList(151, signal),
    staleTime: 5 * 60 * 1000, // 5 minutes — cached data served instantly
  });

  const filtered: PokemonSummary[] = data
    ? search.trim()
      ? data.filter((p) => p.name.includes(search.toLowerCase().trim()))
      : data
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Explanation banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
        <strong>React Query</strong> — <code className="bg-indigo-100 px-1 rounded">useQuery</code> handles
        loading, caching, error, and background refetching automatically.{' '}
        <code className="bg-indigo-100 px-1 rounded">staleTime: 5min</code> serves cached data instantly on
        re-visit. No <code className="bg-indigo-100 px-1 rounded">useState</code> or{' '}
        <code className="bg-indigo-100 px-1 rounded">useEffect</code> needed.
      </div>

      <SearchBar value={search} onChange={setSearch} />

      {isLoading && <SkeletonGrid count={10} />}

      {isError && (
        <ErrorState
          message={error instanceof Error ? error.message : 'Something went wrong'}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState search={search} />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <>
          <p className="text-xs text-slate-400">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((p) => (
              <PokemonCard key={p.id} pokemon={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
