export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[#0E141C] border border-[#1B2431] p-4">
      {title && (
        <div className="text-sm font-semibold text-gray-300 mb-2">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
