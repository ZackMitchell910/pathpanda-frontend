export function InfoTooltip({ label }: { label: string }) {
  return (
    <span className="relative inline-block align-middle">
      <span
        className="group ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] leading-none
                   cursor-default select-none
                   border-neutral-600 text-neutral-300 hover:border-neutral-400 hover:text-white"
        role="img"
        aria-label={label}
        tabIndex={0}
      >
        i
        <span
          className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-pre-line
                     rounded-md border px-2 py-1 text-xs shadow-lg
                     opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150
                     border-neutral-700 bg-neutral-900 text-neutral-200"
          style={{ width: 'max-content', maxWidth: 260 }}
        >
          {label}
        </span>
      </span>
    </span>
  );
}
