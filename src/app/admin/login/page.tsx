import { LoginForm } from "@/components/admin/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next?.startsWith("/admin") ? next : "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <img
            src="/rovik-logo.png"
            alt="Rovik"
            width={48}
            height={48}
            className="mx-auto h-12 w-12"
          />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-primary">Rovik</p>
          <h1 className="mt-2 text-xl font-semibold text-black">Admin</h1>
        </div>
        <LoginForm next={target} />
      </div>
    </div>
  );
}
