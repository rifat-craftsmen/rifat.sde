import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPokemonCache, usePokemonRaw } from '../hooks/usePokemonRaw';

const mockPokemon = [
  { id: 1, name: 'bulbasaur', imageUrl: 'https://example.com/1.png' },
  { id: 2, name: 'ivysaur', imageUrl: 'https://example.com/2.png' },
  { id: 4, name: 'charmander', imageUrl: 'https://example.com/4.png' },
];

function stubFetchSuccess() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: mockPokemon.map((p) => ({
          name: p.name,
          url: `https://pokeapi.co/api/v2/pokemon/${p.id}/`,
        })),
      }),
    }),
  );
}

function stubFetchError() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, status: 500 }),
  );
}

beforeEach(() => {
  clearPokemonCache();
  vi.clearAllMocks();
});

afterEach(() => vi.unstubAllGlobals());

describe('usePokemonRaw — async states', () => {
  it('starts in loading state', () => {
    stubFetchSuccess();
    const { result } = renderHook(() => usePokemonRaw(''));
    expect(result.current.state.status).toBe('loading');
  });

  it('transitions to success state with data', async () => {
    stubFetchSuccess();
    const { result } = renderHook(() => usePokemonRaw(''));

    await waitFor(() => expect(result.current.state.status).toBe('success'));

    const state = result.current.state;
    if (state.status === 'success') {
      expect(state.data).toHaveLength(3);
      expect(state.data[0].name).toBe('bulbasaur');
    }
  });

  it('transitions to error state on fetch failure', async () => {
    stubFetchError();
    const { result } = renderHook(() => usePokemonRaw(''));

    await waitFor(() => expect(result.current.state.status).toBe('error'));

    const state = result.current.state;
    if (state.status === 'error') {
      expect(state.message).toContain('500');
    }
  });

  it('retry clears error and fetches again', async () => {
    stubFetchError();
    const { result } = renderHook(() => usePokemonRaw(''));
    await waitFor(() => expect(result.current.state.status).toBe('error'));

    stubFetchSuccess();
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.state.status).toBe('success'));
  });
});

describe('usePokemonRaw — search filtering', () => {
  it('returns empty array when search matches nothing', async () => {
    stubFetchSuccess();
    const { result } = renderHook(() => usePokemonRaw('zzzzz'));

    await waitFor(() => expect(result.current.state.status).toBe('success'));

    const state = result.current.state;
    if (state.status === 'success') {
      expect(state.data).toHaveLength(0);
    }
  });

  it('filters results by search term', async () => {
    stubFetchSuccess();
    const { result } = renderHook(() => usePokemonRaw('bulb'));

    await waitFor(() => expect(result.current.state.status).toBe('success'));

    const state = result.current.state;
    if (state.status === 'success') {
      expect(state.data).toHaveLength(1);
      expect(state.data[0].name).toBe('bulbasaur');
    }
  });

  it('returns all results when search is empty', async () => {
    stubFetchSuccess();
    const { result } = renderHook(() => usePokemonRaw(''));

    await waitFor(() => expect(result.current.state.status).toBe('success'));

    const state = result.current.state;
    if (state.status === 'success') {
      expect(state.data).toHaveLength(3);
    }
  });
});

describe('usePokemonRaw — caching', () => {
  it('does not call fetch again on second render when cache is warm', async () => {
    stubFetchSuccess();

    // First render — populates cache
    const first = renderHook(() => usePokemonRaw(''));
    await waitFor(() => expect(first.result.current.state.status).toBe('success'));

    const callCount = vi.mocked(fetch).mock.calls.length;

    // Second render — should hit cache, no new fetch
    const second = renderHook(() => usePokemonRaw(''));
    await waitFor(() => expect(second.result.current.state.status).toBe('success'));

    expect(vi.mocked(fetch).mock.calls.length).toBe(callCount);
  });
});

describe('usePokemonRaw — AbortController', () => {
  it('aborts previous request when search changes rapidly', async () => {
    const abortSpy = vi.fn();

    class MockAbortController {
      signal = { aborted: false };
      abort = abortSpy;
    }

    vi.stubGlobal('AbortController', MockAbortController);
    stubFetchSuccess();

    const { rerender } = renderHook(({ search }) => usePokemonRaw(search), {
      initialProps: { search: 'b' },
    });

    rerender({ search: 'bu' });
    rerender({ search: 'bul' });

    expect(abortSpy).toHaveBeenCalled();
  });
});
