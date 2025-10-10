import React from "react";

type Props = {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
};

export default function LoadingButton({
  label,
  loadingLabel = "Working…",
  loading = false,
  disabled,
  onClick,
  title,
  className = "",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-busy={loading}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center gap-2 px-3 py-1 rounded text-sm",
        "bg-[#1a1f25] border border-[#2a2f36]",
        "hover:bg-[#20262d] hover:border-[#3a4049] transition-colors",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
    >
      {loading && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      <span>{loading ? loadingLabel : label}</span>
    </button>
  );
}
