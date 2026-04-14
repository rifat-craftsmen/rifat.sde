export interface PokemonListItem {
  name: string;
  url: string;
}

export interface PokemonSummary {
  id: number;
  name: string;
  imageUrl: string;
}

export interface PokemonStat {
  name: string;
  value: number;
}

export interface PokemonDetail {
  id: number;
  name: string;
  imageUrl: string;
  types: string[];
  height: number;
  weight: number;
  stats: PokemonStat[];
  abilities: string[];
}

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };
