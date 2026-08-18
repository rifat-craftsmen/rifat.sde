interface Props {
  search: string;
}

export function EmptyState({ search }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="text-5xl">🔍</div>
      <div>
        <p className="text-lg font-semibold text-slate-700">No Pokémon found</p>
        <p className="text-sm text-slate-500 mt-1">
          {search
            ? `No results for "${search}". Try a different name.`
            : 'No Pokémon available right now.'}
        </p>
      </div>
    </div>
  );
}
