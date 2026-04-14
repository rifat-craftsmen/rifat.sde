import { useState } from 'react';
import { RawFetchView } from './RawFetchView';
import { ReactQueryView } from './ReactQueryView';

type Tab = 'raw' | 'rq';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'raw', label: 'Raw Fetch', emoji: '🧵' },
  { id: 'rq', label: 'React Query', emoji: '⚡' },
];

export function HomePage() {
  const [tab, setTab] = useState<Tab>('raw');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Pokédex
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Comparing raw <code className="bg-slate-100 px-1 rounded">fetch</code> vs{' '}
            <code className="bg-slate-100 px-1 rounded">React Query</code>
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-200 rounded-xl p-1 mb-8 w-fit mx-auto">
          {TABS.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'raw' ? <RawFetchView /> : <ReactQueryView />}
      </div>
    </div>
  );
}
