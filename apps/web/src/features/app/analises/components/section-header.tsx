export function AnalyticsSectionHeader({
  kicker,
  title,
  description,
}: {
  kicker?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-5 flex flex-col gap-1">
      {kicker && (
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          {kicker}
        </div>
      )}
      <h2 className="text-2xl font-medium tracking-tight text-ink">{title}</h2>
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
    </header>
  );
}

export function AnalyticsPanel({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <header className="mb-4 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md bg-gray-50 text-gray-500">
          {icon}
        </span>
        <div>
          <div className="text-sm font-medium text-ink">{title}</div>
          {subtitle && <div className="text-[11px] text-gray-500">{subtitle}</div>}
        </div>
      </header>
      {children}
    </div>
  );
}
