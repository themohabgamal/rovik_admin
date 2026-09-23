export default function TrackNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
        <img
          src="/rovik-logo.png"
          alt="Rovik"
          width={40}
          height={40}
          className="mx-auto h-10 w-10"
        />
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-primary">Rovik</p>
        <h1 className="mt-2 text-lg font-semibold">Tracking link not found</h1>
      </div>
    </div>
  );
}
