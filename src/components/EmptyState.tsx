export function EmptyState({
  text,
  actionLabel,
  onAction
}: { text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="text-xs opacity-75 flex items-center gap-3">
      <span>{text}</span>
      {onAction && actionLabel && (
        <button onClick={onAction} className="px-2 py-1 rounded bg-[#161b22] border border-[#2a2f36] text-xs">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
