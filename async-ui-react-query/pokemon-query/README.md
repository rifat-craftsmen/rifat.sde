# Pokédex — Async UI Design

A Pokémon browser built with React + TypeScript that demonstrates the difference between **raw `fetch`** and **React Query** for async data fetching.

🔗 **Live Demo:** [pokemon-query-peach.vercel.app](https://pokemon-query-peach.vercel.app/)

---

## Purpose

Two approaches to the same problem, side-by-side:

| | Raw Fetch | React Query |
|---|---|---|
| **Loading state** | Manual `useState` | `isLoading` from `useQuery` |
| **Error state** | Manual `useState` | `isError` + `error` from `useQuery` |
| **Caching** | Module-level `Map` (manual) | Automatic, configurable `staleTime` |
| **Race conditions** | `AbortController` + signal | Built-in, managed automatically |
| **Boilerplate** | ~50 lines in hook | ~10 lines with `useQuery` |

Switch between them using the tab switcher on the home page and open the **React Query Devtools** to watch the cache in action.

---

## Stack

| Tool | Version |
|---|---|
| Vite | ^6.x |
| React | ^19.x |
| TypeScript | ^6.x |
| Tailwind CSS | ^4.x |
| React Router | ^7.x |
| TanStack Query | ^5.x |
| Vitest | ^4.x |

---

## Getting Started

```bash
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # ESLint
pnpm test             # Run unit tests
pnpm test:coverage    # Run tests with coverage report
```

---

## Key Concepts

### Race Condition Prevention
In the **Raw Fetch** tab, every search triggers a new `useEffect`. An `AbortController` is created and its `signal` is passed to `fetch()`. When the effect cleans up (user typed again), `controller.abort()` cancels the in-flight request.

> Note: since all 151 Pokémon are fetched once and cached in memory, subsequent searches filter locally — no new network requests are made. The AbortController protects the initial fetch and is verified in unit tests.

### Manual vs Automatic Caching
- **Raw Fetch** — a module-level `Map<string, PokemonSummary[]>` stores results. Repeat queries hit the cache, no network request.
- **React Query** — `staleTime: 5 * 60 * 1000` keeps data fresh for 5 minutes. Navigate away and back — data loads instantly.

### All 4 Async States
Both implementations handle:

1. **Loading** — skeleton cards (10 animated placeholders)
2. **Error** — user-friendly message + Retry button
3. **Empty** — "No results" guidance when search matches nothing
4. **Success** — responsive card grid

### Tab Persistence
The active tab (`Raw Fetch` / `React Query`) is stored in the URL as `?tab=raw` or `?tab=rq`. Navigating to a detail page and back preserves the selected tab.

---

## Testing

Unit tests cover the core async logic using **Vitest** + **Testing Library**:

| Suite | What's tested |
|---|---|
| `api.test.ts` | Success response, error handling, AbortSignal forwarding, abort throws |
| `usePokemonRaw.test.ts` | All 4 async states, search filtering, manual caching, AbortController abort on re-render |

```bash
pnpm test             # Run all tests
pnpm test:coverage    # With coverage (targets hooks/ and lib/)
```

---

## Project Structure

```
src/
├── components/   SharedUI (cards, skeletons, search bar, states)
├── hooks/        usePokemonRaw — raw fetch + AbortController
├── lib/          api.ts — typed API functions
├── pages/        HomePage, RawFetchView, ReactQueryView, DetailPage
├── types/        TypeScript interfaces
└── test/         Vitest + Testing Library tests
```

---

## API

Uses the public [PokéAPI](https://pokeapi.co/) — no API key required.
