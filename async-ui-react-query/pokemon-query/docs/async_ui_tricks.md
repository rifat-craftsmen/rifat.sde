# Frontend Expert Guide: Data Fetching & Async Patterns

---

## 📌 Table of Contents
1. [REST APIs](#rest-apis)
2. [Data Fetching Patterns](#data-fetching-patterns)
3. [Async State Management](#async-state-management)
4. [Race Conditions](#race-conditions)
5. [Caching Strategy](#caching-strategy)
6. [Error Handling](#error-handling)
7. [React Query vs Raw Fetch](#react-query-vs-raw-fetch)
8. [Performance & UX](#performance--ux)
9. [Common Mistakes](#common-mistakes)
10. [Pro Tips](#pro-tips)

---

## REST APIs

### What Juniors Need to Know
A REST API is a **contract between your frontend and backend**. You send requests, backend sends responses. Simple.

### The Golden Rules (That Save You 100 Hours)

**Rule #1: Always Check Status Codes**
```javascript
// ❌ WRONG — assumes all responses are successful
const data = await fetch(url).then(r => r.json());

// ✅ CORRECT — check status first
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}
const data = await response.json();
```

**Rule #2: Understand the Big 5 Status Codes**
- `200/201` — Success (you got data)
- `4xx` — Client error (you sent bad request, or not authorized)
- `5xx` — Server error (backend is broken, retry later)
- `429` — Too many requests (you're being throttled, need backoff)

**Rule #3: The Response Might Be Valid JSON But Invalid Data**
```javascript
// ✅ GOOD habit: validate shape
const response = await fetch(url).then(r => r.json());

// Check if data looks right
if (!Array.isArray(response.results)) {
  throw new Error('Unexpected API response shape');
}
```

### Common Mistake #1: No Error Boundary
Juniors often fetch data and assume it works. Reality: **networks fail 5-10% of the time**. Always expect failure.

### Pro Tip: Test With Slow/Bad Networks
In DevTools → Network → set throttling to "Slow 3G". You'll see issues most developers miss.

---

## Data Fetching Patterns

### The 3 Moments of Async Code
Every async operation happens in **before → during → after**.

```javascript
// Before: request not sent yet (idle)
// During: request in flight (loading)
// After: response arrived (success/error)
```

### The Basic Pattern (Raw Fetch)
```javascript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [url]); // ⚠️ Dependencies matter!

// Render:
if (loading) return <Skeleton />;
if (error) return <ErrorState error={error} />;
if (!data) return <EmptyState />;
return <SuccessState data={data} />;
```

**Why this matters:**
- `setLoading(true)` **before** request (shows spinner)
- `setLoading(false)` **after** response (hide spinner)
- Use `.finally()` to ensure loading always resets (even on error)

### Common Mistake #2: Forgetting Dependencies
```javascript
// ❌ WRONG — fetches only once, even if url changes
useEffect(() => {
  fetchData();
}, []);

// ✅ CORRECT — refetch when url changes
useEffect(() => {
  fetchData();
}, [url]);
```

---

## Async State Management

### The 4 States (Not 3!)
Most juniors only think about "loading" vs "loaded". Reality: you have **4 distinct states**:

| State | What Happens | UI Shows |
|-------|-------------|----------|
| **Loading** | First request in flight | Skeleton cards |
| **Success** | Data arrived & valid | The actual content |
| **Error** | Request failed | Error message + retry button |
| **Empty** | Request succeeded BUT no data | "No results found" message |

**Critical:** Empty is NOT the same as loading. The API worked, just returned `[]`.

```javascript
// ✅ Handle all 4 states
if (loading && !data) return <LoadingState />;
if (error) return <ErrorState error={error} />;
if (!loading && data && data.length === 0) return <EmptyState />;
return <SuccessState data={data} />;
```

### Common Mistake #3: Showing Nothing During Load
Users see a blank screen and think the app is broken. **Always show a skeleton, spinner, or shimmer.**

### Pro Tip: "Refresh" vs "Initial Load"
After loading once, if user refreshes:
- Don't show skeleton again (data already exists)
- Show the old data while fetching new data
- This is called "stale-while-revalidate"

```javascript
if (loading && !data) return <Skeleton />; // Initial load
if (loading && data) return <DataWithRefreshSpinner data={data} />; // Refresh
```

---

## Race Conditions

### What's a Race Condition?
User types "pika" → request sent
User quickly deletes and types "char" → second request sent
Second request comes back first → wrong data shows

**This is a BUG, and it happens in real apps all the time.**

### Solution #1: AbortController (Modern, Recommended)
```javascript
useEffect(() => {
  const controller = new AbortController();
  
  const fetchData = async () => {
    try {
      const res = await fetch(url, { signal: controller.signal });
      // ...
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    }
  };

  fetchData();

  // Cleanup: cancel if user changes query before response arrives
  return () => controller.abort();
}, [url]);
```

### Solution #2: Debounce (Simple but Less Reliable)
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    fetchData();
  }, 300); // Wait 300ms after user stops typing

  return () => clearTimeout(timer);
}, [query]);
```

### Solution #3: Request ID (Old School, But Works)
```javascript
const [requestId, setRequestId] = useState(0);

useEffect(() => {
  const id = requestId + 1;
  setRequestId(id);

  fetchData().then(data => {
    // Only update if this is still the latest request
    if (id === requestId) {
      setData(data);
    }
  });
}, [query]);
```

### Common Mistake #4: Ignoring Race Conditions
"It works on my machine" because your internet is fast. But on a user's slow 3G connection? Data corruption, wrong results, angry users.

---

## Caching Strategy

### Why Caching Matters
User clicks article → navigates to detail page → clicks back → should be instant, not another spinner.

### Three Caching Levels

**Level 1: Browser Cache** (Automatic)
```javascript
// This respects HTTP cache headers automatically
const res = await fetch(url);
// If backend sends: Cache-Control: max-age=3600
// Browser won't re-request for 1 hour
```

**Level 2: Memory Cache** (Code It)
```javascript
const cache = new Map();

const fetchWithCache = async (url) => {
  if (cache.has(url)) {
    return cache.get(url);
  }
  
  const data = await fetch(url).then(r => r.json());
  cache.set(url, data);
  return data;
};
```

**Level 3: Library Cache** (React Query, SWR)
- Automatically deduplicates requests
- Reuses data if still fresh
- Refetch in background if stale
- Garbage collects old data

### Real Example: Article Detail
```javascript
// ❌ BAD — refetches every time
const { id } = useParams();
useEffect(() => {
  fetch(`/articles/${id}`).then(setArticle);
}, [id]);

// ✅ GOOD — React Query caches automatically
const { data: article } = useQuery(['article', id], 
  () => fetch(`/articles/${id}`).then(r => r.json())
);
// User navigates: Article → Back → Article
// Second navigation is instant! Data already cached.
```

### Common Mistake #5: Not Caching = Wasting Money
Every API request costs money (bandwidth, server load, batteries). Caching can reduce requests by 80%.

---

## Error Handling

### The 3 Types of Errors

**Type 1: Network Error** (No internet, timeout)
```javascript
catch (err) {
  // err.message: "Failed to fetch" or "Network request failed"
  // Show: "Please check your internet connection"
}
```

**Type 2: HTTP Error** (400, 404, 500)
```javascript
if (!response.ok) {
  const error = await response.json(); // Usually has error details
  throw new Error(error.message);
}
```

**Type 3: Invalid Data** (API returned unexpected shape)
```javascript
const data = await response.json();
if (!Array.isArray(data)) {
  throw new Error('Expected array, got ' + typeof data);
}
```

### Error UX Pattern (Copy This)
```javascript
<ErrorState 
  message="Couldn't load articles"
  details={error.message}
  onRetry={() => refetch()}
/>
```

### Common Mistake #6: Logging Errors to Console Only
```javascript
// ❌ WRONG — developer never sees it in production
console.error(error);

// ✅ CORRECT — send to monitoring service
logErrorToServer({
  message: error.message,
  url: window.location.href,
  timestamp: new Date(),
});
```

---

## React Query vs Raw Fetch

### Raw Fetch
**Pros:**
- No dependencies, lightweight
- Full control

**Cons:**
- Boilerplate (state, error, loading)
- No caching, no deduplication
- Race conditions to handle manually
- Refetch logic is tedious
- Hard to share state across components

### React Query
**Pros:**
- Automatic caching
- Automatic deduplication (two components fetch same data = one request)
- Built-in retry & backoff
- Race conditions handled
- Automatic refetch in background
- Easier to manage complex async state

**Cons:**
- One more dependency
- Learning curve

### Quick Comparison
```javascript
// Raw Fetch: ~30 lines of boilerplate per endpoint
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
useEffect(() => { /* fetch logic */ }, []);

// React Query: 1 line
const { data, isLoading: loading, error } = useQuery(
  ['articles'], 
  () => fetch('/articles').then(r => r.json())
);
```

### Rule of Thumb
- **Simple app** (< 3 data sources): Raw fetch is fine
- **Real app** (> 5 data sources): React Query saves your life

---

## Performance & UX

### Skeleton Loading (Not Spinners!)
```javascript
// ❌ WRONG — users see blank screen
if (loading) return <div>Loading...</div>;

// ✅ CORRECT — skeleton matches actual content shape
if (loading) return <ArticleCardSkeleton />;
```

**Why:** Users see *shape* of content coming, not blank space. Feels 30% faster.

### Pagination > Infinite Scroll (Usually)
- Pagination: user controls how much they see, predictable loading
- Infinite scroll: auto-loads, uses more memory, battery drain
- Use infinite scroll only for feeds (Twitter, TikTok)

### Timeout Strategy
```javascript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Request timeout')), 5000)
);

const response = await Promise.race([
  fetch(url),
  timeoutPromise,
]);
```

### Common Mistake #7: No Timeout
User requests data, connection hangs, app appears frozen forever. **Always set a timeout.**

---

## Common Mistakes

### #1: Assuming Network Always Works
- Test with DevTools throttling: Offline, Slow 3G
- Always have error handling

### #2: No Cleanup in useEffect
```javascript
// ❌ Memory leaks if component unmounts during fetch
useEffect(() => {
  fetch(url).then(setData);
}, [url]);

// ✅ Cleanup on unmount
useEffect(() => {
  let isMounted = true;
  fetch(url).then(data => {
    if (isMounted) setData(data);
  });
  return () => { isMounted = false; };
}, [url]);
```

### #3: Fetching in Loops
```javascript
// ❌ WRONG — 10 sequential requests
for (let id of ids) {
  const data = await fetch(`/items/${id}`);
}

// ✅ CORRECT — 10 parallel requests
const promises = ids.map(id => fetch(`/items/${id}`));
await Promise.all(promises);
```

### #4: No User Feedback
Users don't know if app is working. Always show: skeleton, loading text, or spinner.

### #5: Fetching on Every Render
```javascript
// ❌ WRONG — fetches every time component renders
const data = await fetch(url);

// ✅ CORRECT — fetches only when dependency changes
useEffect(() => {
  fetch(url).then(setData);
}, [url]);
```

### #6: No Distinction Between Empty and Error
```javascript
if (!data) return <EmptyState />;

// ^ This shows error AND empty state the same way
// Users don't know if it's a bug or just no results
```

---

## Pro Tips

### Tip #1: Request Deduplication (Even Without React Query)
```javascript
const requestCache = new Map();

const deduplicatedFetch = (url) => {
  if (requestCache.has(url)) {
    return requestCache.get(url); // Return existing promise
  }
  
  const promise = fetch(url).then(r => r.json());
  requestCache.set(url, promise);
  return promise;
};

// Two components fetch same URL = one request
```

### Tip #2: Use POST for Complex Filters
```javascript
// ❌ BAD — URL becomes unreadable
GET /articles?filters[status]=published&filters[category]=tech&sort[by]=date
// Caching problems, URL length limits

// ✅ GOOD — cleaner
POST /articles
{ "filters": { "status": "published", "category": "tech" }, "sort": { "by": "date" } }
```

### Tip #3: Always Log Full Context
```javascript
// When error happens, log everything
const logError = (error, context) => {
  console.error({
    message: error.message,
    url: context.url,
    method: context.method,
    statusCode: context.statusCode,
    timestamp: new Date().toISOString(),
  });
};
```

### Tip #4: Client-Side Search Before Backend
```javascript
// User types to search: don't fetch every keystroke
// Instead: fetch all data once, search in memory

const [allPokemon, setAllPokemon] = useState([]);
const [query, setQuery] = useState('');

const filtered = useMemo(() => 
  allPokemon.filter(p => p.name.includes(query.toLowerCase())),
  [allPokemon, query]
);

// Much faster, no API spam, no race conditions
```

### Tip #5: Implement Exponential Backoff for Retries
```javascript
// Don't retry immediately — you'll hammer the server
const retry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

### Tip #6: Prioritize Requests
```javascript
// User scrolls articles: prefetch detail page they might click
const prefetchArticleDetail = (id) => {
  queryClient.prefetchQuery(['article', id], () =>
    fetch(`/articles/${id}`).then(r => r.json())
  );
};
```

---

## 🎯 Key Takeaways (Copy to Your Brain)

1. **Always check `response.ok`** before parsing JSON
2. **Handle all 4 states:** loading, success, error, empty
3. **Race conditions are real** — use AbortController or debounce
4. **Caching is a superpower** — implement it early
5. **Show skeletons, not spinners** — faster perceived performance
6. **Test with slow networks** — DevTools Slow 3G is your friend
7. **Error handling is not optional** — 5-10% of requests fail
8. **React Query is worth it** — saves 100+ hours per project
9. **Monitor errors in production** — console.log won't help
10. **Users hate blank screens** — always show something loading

---

**Last Tip:** The best developers aren't the ones who never have bugs. They're the ones who expect bugs and handle them gracefully. Network issues, bad data, server errors — they all happen. Plan for them.
