import { Link } from 'react-router-dom';
import type { PokemonSummary } from '../types/pokemon';

interface Props {
  pokemon: PokemonSummary;
}

export function PokemonCard({ pokemon }: Props) {
  return (
    <Link
      to={`/pokemon/${pokemon.id}`}
      className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
    >
      <div className="w-32 h-32 relative">
        <img
          src={pokemon.imageUrl}
          alt={pokemon.name}
          loading="lazy"
          className="w-full h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-700 capitalize text-sm">
          {pokemon.name}
        </p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          #{String(pokemon.id).padStart(3, '0')}
        </p>
      </div>
    </Link>
  );
}
