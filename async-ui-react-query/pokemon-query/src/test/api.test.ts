import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPokemonList } from '../lib/api';

const mockResults = Array.from({ length: 3 }, (_, i) => ({
  name: `pokemon-${i + 1}`,
  url: `https://pokeapi.co/api/v2/pokemon/${i + 1}/`,
}));

function mockFetchSuccess() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    }),
  );
}

function mockFetchError(status = 500) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
    }),
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('fetchPokemonList', () => {
  it('returns mapped PokemonSummary array on success', async () => {
    mockFetchSuccess();
    const result = await fetchPokemonList(3);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      id: 1,
      name: 'pokemon-1',
      imageUrl: expect.stringContaining('/1.png'),
    });
  });

  it('throws an error when response is not ok', async () => {
    mockFetchError(500);
    await expect(fetchPokemonList(3)).rejects.toThrow('Failed to fetch Pokémon list (500)');
  });

  it('passes the AbortSignal to fetch', async () => {
    mockFetchSuccess();
    const controller = new AbortController();
    await fetchPokemonList(3, controller.signal);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/pokemon?limit=3'),
      { signal: controller.signal },
    );
  });

  it('throws when request is aborted', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    );

    controller.abort();
    await expect(fetchPokemonList(3, controller.signal)).rejects.toThrow('Aborted');
  });
});
