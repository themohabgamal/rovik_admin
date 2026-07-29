import { LoginForm } from "@/components/admin/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next?.startsWith("/admin") ? next : "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Rovik</p>
          <h1 className="mt-2 text-xl font-semibold">Admin sign in</h1>
        </div>
        <LoginForm next={target} />
      </div>
    </div>
  );
}
