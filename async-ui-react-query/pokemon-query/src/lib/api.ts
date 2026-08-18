import type { PokemonDetail, PokemonListItem, PokemonSummary } from '../types/pokemon';

const BASE_URL = 'https://pokeapi.co/api/v2';

function extractId(url: string): number {
  const parts = url.split('/').filter(Boolean);
  return parseInt(parts[parts.length - 1], 10);
}

function getSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export async function fetchPokemonList(
  limit = 151,
  signal?: AbortSignal,
): Promise<PokemonSummary[]> {
  const res = await fetch(`${BASE_URL}/pokemon?limit=${limit}`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch Pokémon list (${res.status})`);
  const data: { results: PokemonListItem[] } = await res.json();
  return data.results.map((p) => {
    const id = extractId(p.url);
    return { id, name: p.name, imageUrl: getSpriteUrl(id) };
  });
}

export async function fetchPokemonDetail(
  idOrName: string | number,
  signal?: AbortSignal,
): Promise<PokemonDetail> {
  const res = await fetch(`${BASE_URL}/pokemon/${idOrName}`, { signal });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Pokémon "${idOrName}" not found`);
    throw new Error(`Failed to fetch Pokémon (${res.status})`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  return {
    id: data.id,
    name: data.name,
    imageUrl:
      data.sprites?.other?.['official-artwork']?.front_default ??
      getSpriteUrl(data.id),
    types: data.types.map((t: { type: { name: string } }) => t.type.name),
    height: data.height,
    weight: data.weight,
    stats: data.stats.map((s: { stat: { name: string }; base_stat: number }) => ({
      name: s.stat.name,
      value: s.base_stat,
    })),
    abilities: data.abilities.map((a: { ability: { name: string } }) => a.ability.name),
  };
}
