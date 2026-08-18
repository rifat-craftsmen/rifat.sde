interface Props {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-20 gap-4 text-center"
    >
      <div className="text-5xl">⚠️</div>
      <div>
        <p className="text-lg font-semibold text-slate-700">
          Something went wrong
        </p>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:scale-95 transition-all"
      >
        Retry
      </button>
    </div>
  );
}
