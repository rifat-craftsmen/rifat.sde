import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchPokemonDetail } from '../lib/api';
import type { PokemonDetail } from '../types/pokemon';

const TYPE_COLORS: Record<string, string> = {
  fire: 'bg-orange-100 text-orange-700',
  water: 'bg-blue-100 text-blue-700',
  grass: 'bg-green-100 text-green-700',
  electric: 'bg-yellow-100 text-yellow-700',
  psychic: 'bg-pink-100 text-pink-700',
  ice: 'bg-cyan-100 text-cyan-700',
  dragon: 'bg-indigo-100 text-indigo-700',
  dark: 'bg-slate-200 text-slate-700',
  fairy: 'bg-pink-100 text-pink-600',
  normal: 'bg-slate-100 text-slate-600',
  fighting: 'bg-red-100 text-red-700',
  flying: 'bg-sky-100 text-sky-700',
  poison: 'bg-purple-100 text-purple-700',
  ground: 'bg-amber-100 text-amber-700',
  rock: 'bg-stone-100 text-stone-700',
  bug: 'bg-lime-100 text-lime-700',
  ghost: 'bg-violet-100 text-violet-700',
  steel: 'bg-slate-200 text-slate-600',
};

function StatBar({ name, value }: { name: string; value: number }) {
  const pct = Math.min((value / 255) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-28 shrink-0 capitalize">
        {name.replace('-', ' ')}
      </span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-400 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-600 w-8 text-right">
        {value}
      </span>
    </div>
  );
}

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'raw';

  const { data, isLoading, isError, error, refetch } = useQuery<PokemonDetail>({
    queryKey: ['pokemon', id],
    queryFn: ({ signal }) => fetchPokemonDetail(id!, signal),
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          to={`/?tab=${tab}`}
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors mb-6 font-medium"
        >
          ← Back to Pokédex
        </Link>

        {isLoading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 animate-pulse">
            <div className="flex flex-col items-center gap-6">
              <div className="w-48 h-48 bg-slate-200 rounded-full" />
              <div className="h-6 w-32 bg-slate-200 rounded-full" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {isError && (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 py-20 text-center"
          >
            <div className="text-5xl">⚠️</div>
            <p className="text-slate-700 font-semibold">
              {error instanceof Error ? error.message : 'Something went wrong'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {data && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-50 to-slate-50 p-8 flex flex-col items-center gap-4">
              <img
                src={data.imageUrl}
                alt={data.name}
                className="w-48 h-48 object-contain drop-shadow-lg"
              />
              <div className="text-center">
                <p className="text-xs text-slate-400 font-mono">
                  #{String(data.id).padStart(3, '0')}
                </p>
                <h1 className="text-2xl font-bold text-slate-800 capitalize mt-1">
                  {data.name}
                </h1>
                <div className="flex gap-2 mt-3 justify-center flex-wrap">
                  {data.types.map((t) => (
                    <span
                      key={t}
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${TYPE_COLORS[t] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-6">
              {/* Measurements */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Height</p>
                  <p className="font-semibold text-slate-700">
                    {(data.height / 10).toFixed(1)} m
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Weight</p>
                  <p className="font-semibold text-slate-700">
                    {(data.weight / 10).toFixed(1)} kg
                  </p>
                </div>
              </div>

              {/* Abilities */}
              <div>
                <h2 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wider">
                  Abilities
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.abilities.map((a) => (
                    <span
                      key={a}
                      className="px-3 py-1 bg-slate-100 rounded-full text-sm capitalize text-slate-600"
                    >
                      {a.replace('-', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div>
                <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">
                  Base Stats
                </h2>
                <div className="flex flex-col gap-2.5">
                  {data.stats.map((s) => (
                    <StatBar key={s.name} name={s.name} value={s.value} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
