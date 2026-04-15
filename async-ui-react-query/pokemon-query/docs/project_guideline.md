# 🚀 Data Fetching & Async UI Project Instructions

## 📝 Overview

Build a **React + TypeScript** project that fetches from a public API and displays data with proper async state handling. Handle loading, errors, and empty states gracefully.

**Deadline:** 10th April

### Choose One:
- **HackerNews Feed:** Latest stories, search, detail view, raw query vs react query UI
- **Pokémon Browser:** Fetch 150+ Pokémon, search/filter, detail view, raw query vs react query UI

Both teach identical concepts—pick what interests you.

---

## 📋 Requirements

### Must-Have
- [ ] Fetch & display 10+ items from API with image, title, metadata
- [ ] **Loading State:** Show skeleton cards while fetching (5-10 skeletons)
- [ ] **Error State:** User-friendly message + "Retry" button, hanlde all possible errors
- [ ] **Empty State:** Message + guidance when no results
- [ ] Implement caching using both fetch API and react query
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Use Tailwind CSS for styling

### Must-Have Interactions
- [ ] **Search/Filter:** Server-side filtering by name/keyword
- [ ] **Race Condition Fix:** Pick ONE approach (to handle responses arriving out of order):
  - **AbortController:** Cancel old requests when user types new search query
  - **Debounce:** Wait 300ms after user stops typing before sending request
  - **Request ID:** Track which request is "current", ignore stale responses
- [ ] **React Query:** Replace fetch api with react query for automatic caching
- [ ] **Detail Page:** Click item → navigate to `/item/:id` with full details + back button
- [ ] **Unit Tests:** Test all 4 async states, search logic (80%+ coverage)

---

## 🛠️ Required Tools & Stack(Use latest versions)

| Tool | Version | Purpose |
|------|---------|---------|
| **Vite** | ^7.x | Build tool & dev server |
| **React** | ^19.x | UI framework |
| **TypeScript** | ~5.9.x | Type safety |
| **Tailwind CSS** | ^4.x | Styling |
| **React Router** | ^7.x | Navigation (if doing detail page) |
| **React Query** | ^5.x | Caching |
| **ESLint** | ^9.x | Code quality |

---


## 📁 Project Structure
- Use best practices

---

## 🧪 Testing Scenarios

Before submitting, manually test:

| Scenario | Expected Behavior |
|----------|------------------|
| **Load Page** | Skeleton cards appear, then data loads (no errors) |
| **Network Error** | Error message shown + "Retry" button works |
| **Search Quick** | Type multiple terms rapidly → correct data shown (no flickering) |
| **Search Empty** | "No results" message when search matches nothing |
| **Mobile View** | Responsive on 375px width (DevTools) |
| **No Results** | Empty state shows when API returns no items |
| **Race Condition** | DevTools Network tab shows cancelled requests (if AbortController) |
| **Detail Page** | Click item → detail page loads instantly if using React Query cache |
| **Back Navigation** | Navigate away & back → instant load (caching works) |

---

## 📦 Deployment to Vercel

**Add Vercel link to your PR description**

---

## 🤖 AI Usage Note

**Do not use AI to generate entire components.** You should understand & be able to explain every line of your code. Use AI only for:
- Explaining concepts
- Debugging errors  
- Understanding documentation

**Red flags:**
- Can't explain your code in code review
- Code doesn't match requirements
- You skipped learning key concepts

---

## 📝 Submission Checklist

Before creating PR:
- [ ] `pnpm build` runs without errors
- [ ] `pnpm lint` passes
- [ ] Proper readme.md file added
- [ ] All tests passes
- [ ] No console errors (DevTools)
- [ ] All 4 async states working (loading, error, empty, success)
- [ ] Search/filter working
- [ ] Race condition handling tested
- [ ] Responsive on mobile
- [ ] Deployed to Vercel with live link
