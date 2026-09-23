export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted">
      {message}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-danger/30 bg-card px-6 py-8 text-center">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs text-white hover:bg-primary-hover"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted">
      {label}
    </div>
  );
}

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span className="block text-xs text-danger">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-primary";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-black bg-white px-4 py-2 text-sm hover:bg-black hover:text-white disabled:opacity-50";

export const btnDanger =
  "inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
